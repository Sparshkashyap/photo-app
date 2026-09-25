import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ApiError,
  getUserProfile,
  login as loginApi,
  loginWithOAuth,
  logout as logoutApi,
  signup as signupApi,
  type OAuthProvider,
} from "@/services/api";

import {
  clearAuth,
  getToken,
  getUser,
  saveAuth,
  type AuthUser,
} from "@/utils/auth";

type LoginPayload = {
  email: string;
  password: string;
};

type SignupPayload = {
  name: string;
  email: string;
  password: string;
};

type AuthContextValue = {
  user: AuthUser | null;

  isAuthenticated: boolean;

  loading: boolean;

  isLoading: boolean;

  ready: boolean;

  login: (
    payload: LoginPayload,
  ) => Promise<AuthUser>;

  signup: (
    payload: SignupPayload,
  ) => Promise<AuthUser>;

  logout: () => Promise<void>;

  refreshMe: () => Promise<AuthUser | null>;

  loginWithProvider: (
    provider: OAuthProvider,
  ) => Promise<void>;
};

const AuthContext =
  createContext<
    AuthContextValue | undefined
  >(undefined);

/* ==================================================
 * OAUTH CALLBACK HELPERS
 * ================================================== */

function getOAuthTokenFromUrl(): string | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  const params =
    new URLSearchParams(
      window.location.search,
    );

  return (
    params.get("token") ||
    params.get("auth_token")
  );
}

function clearOAuthQueryParams() {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  const url =
    new URL(
      window.location.href,
    );

  url.searchParams.delete(
    "token",
  );

  url.searchParams.delete(
    "auth_token",
  );

  url.searchParams.delete(
    "error",
  );

  url.searchParams.delete(
    "message",
  );

  window.history.replaceState(
    {},
    document.title,
    url.pathname +
      url.search +
      url.hash,
  );
}

/* ==================================================
 * PROVIDER
 * ================================================== */

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<AuthUser | null>(
      () => getUser(),
    );

  const [loading, setLoading] =
    useState(true);

  /* ==================================================
   * REFRESH CURRENT USER
   * ================================================== */

  const refreshMe =
    useCallback(
      async (): Promise<AuthUser | null> => {
        const token =
          getToken();

        if (!token) {
          setUser(null);

          return null;
        }

        try {
          const response =
            await getUserProfile();

          const nextUser =
            response?.user ??
            null;

          if (nextUser) {
            saveAuth(
              token,
              nextUser,
            );

            setUser(
              nextUser,
            );

            return nextUser;
          }

          clearAuth();

          setUser(null);

          return null;
        } catch (error) {
          /*
           * Only clear authentication when
           * backend explicitly says the token
           * is invalid/expired.
           */
          if (
            error instanceof ApiError &&
            error.status === 401
          ) {
            clearAuth();
            setUser(null);

            return null;
          }

          /*
           * Network/server errors should not
           * immediately destroy a valid local
           * authentication state.
           */
          const cachedUser =
            getUser();

          if (cachedUser) {
            setUser(
              cachedUser,
            );

            return cachedUser;
          }

          setUser(null);

          return null;
        }
      },
      [],
    );

  /* ==================================================
   * INITIAL AUTH BOOTSTRAP
   * ================================================== */

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const oauthToken =
          getOAuthTokenFromUrl();

        /*
         * ==============================================
         * GOOGLE OAUTH CALLBACK
         * ==============================================
         */

        if (oauthToken) {
          try {
            const apiBaseUrl =
              (
                import.meta.env[
                  "VITE_API_BASE_URL"
                ] as string | undefined
              )?.replace(
                /\/+$/,
                "",
              );

            if (!apiBaseUrl) {
              throw new Error(
                "API URL is not configured.",
              );
            }

            /*
             * IMPORTANT:
             *
             * Do NOT rely on the old cached user.
             *
             * The OAuth token itself is used to
             * retrieve the authenticated user.
             */

            const profile =
              await fetch(
                `${apiBaseUrl}/user/profile`,
                {
                  method: "GET",

                  headers: {
                    Authorization:
                      `Bearer ${oauthToken}`,
                  },
                },
              );

            if (!profile.ok) {
              let errorMessage =
                "Unable to complete Google login.";

              try {
                const errorData =
                  (await profile.json()) as {
                    message?: string;
                  };

                if (
                  errorData?.message
                ) {
                  errorMessage =
                    errorData.message;
                }
              } catch {
                // Ignore invalid error body.
              }

              throw new Error(
                `${errorMessage} (${profile.status})`,
              );
            }

            const data =
              (await profile.json()) as {
                success?: boolean;
                user?: AuthUser;
              };

            if (!data.user) {
              throw new Error(
                "Google login succeeded but user information was not returned.",
              );
            }

            /*
             * Save both token and user.
             */

            saveAuth(
              oauthToken,
              data.user,
            );

            /*
             * IMPORTANT:
             *
             * Update React state immediately.
             * This is what allows login.tsx to
             * detect authentication.
             */

            if (mounted) {
              setUser(
                data.user,
              );
            }

            /*
             * Remove token from browser URL.
             */

            clearOAuthQueryParams();
          } catch (error) {
            /*
             * OAuth callback failed.
             *
             * Do not leave a bad token in storage.
             */

            clearAuth();

            if (mounted) {
              setUser(null);
            }

            clearOAuthQueryParams();

            console.error(
              "OAuth callback failed:",
              error,
            );
          }
        }

        /*
         * ==============================================
         * NORMAL SESSION RESTORE
         * ==============================================
         */

        if (mounted) {
          const token =
            getToken();

          if (token) {
            await refreshMe();
          } else {
            setUser(null);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [refreshMe]);

  /* ==================================================
   * CROSS-TAB AUTH SYNC
   * ================================================== */

  useEffect(() => {
    function handleStorage(
      event: StorageEvent,
    ) {
      if (
        event.key ===
          "photos.token" ||
        event.key ===
          "photos.user"
      ) {
        const nextToken =
          getToken();

        const nextUser =
          getUser();

        setUser(
          nextToken
            ? nextUser
            : null,
        );
      }
    }

    window.addEventListener(
      "storage",
      handleStorage,
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage,
      );
    };
  }, []);

  /* ==================================================
   * NORMAL LOGIN
   * ================================================== */

  const login =
    useCallback(
      async (
        payload: LoginPayload,
      ): Promise<AuthUser> => {
        const response =
          await loginApi(
            payload,
          );

        if (
          !response?.token ||
          !response?.user
        ) {
          throw new Error(
            "Invalid login response from server.",
          );
        }

        saveAuth(
          response.token,
          response.user,
        );

        setUser(
          response.user,
        );

        return response.user;
      },
      [],
    );

  /* ==================================================
   * SIGNUP
   * ================================================== */

  const signup =
    useCallback(
      async (
        payload: SignupPayload,
      ): Promise<AuthUser> => {
        const response =
          await signupApi(
            payload,
          );

        if (
          !response?.token ||
          !response?.user
        ) {
          throw new Error(
            "Invalid signup response from server.",
          );
        }

        saveAuth(
          response.token,
          response.user,
        );

        setUser(
          response.user,
        );

        return response.user;
      },
      [],
    );

  /* ==================================================
   * LOGOUT
   * ================================================== */

  const logout =
    useCallback(
      async (): Promise<void> => {
        try {
          await logoutApi();
        } finally {
          clearAuth();

          setUser(null);
        }
      },
      [],
    );

  /* ==================================================
   * OAUTH LOGIN
   * ================================================== */

  const handleOAuthLogin =
    useCallback(
      async (
        provider: OAuthProvider,
      ) => {
        await loginWithOAuth(
          provider,
        );
      },
      [],
    );

  /* ==================================================
   * CONTEXT VALUE
   * ================================================== */

  const value =
    useMemo<AuthContextValue>(
      () => ({
        user,

        /*
         * Authentication is based on both
         * a token and a loaded user.
         */
        isAuthenticated:
          Boolean(
            user &&
              getToken(),
          ),

        loading,

        isLoading:
          loading,

        ready:
          !loading,

        login,

        signup,

        logout,

        refreshMe,

        loginWithProvider:
          handleOAuthLogin,
      }),
      [
        user,
        loading,
        login,
        signup,
        logout,
        refreshMe,
        handleOAuthLogin,
      ],
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ==================================================
 * HOOK
 * ================================================== */

export function useAuth() {
  const context =
    useContext(
      AuthContext,
    );

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider",
    );
  }

  return context;
}