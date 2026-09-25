import {
  Link,
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";

import {
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  toast,
} from "sonner";

import {
  AuthLayout,
} from "@/components/AuthLayout";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  useAuth,
} from "@/hooks/useAuth";

import {
  ApiError,
} from "@/services/api";

export const Route =
  createFileRoute(
    "/login",
  )({
    head: () => ({
      meta: [
        {
          title:
            "Log in — Photos",
        },
        {
          name: "description",
          content:
            "Log in to Photos to view, upload and download your photo library.",
        },
      ],
    }),

    component:
      LoginPage,
  });

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginPage() {
  const {
    login,
    loginWithProvider,
    isAuthenticated,
    ready,
  } = useAuth();

  const navigate =
    useNavigate();

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    errors,
    setErrors,
  ] = useState<
    Partial<
      Record<
        "email" | "password",
        string
      >
    >
  >({});

  const [
    formError,
    setFormError,
  ] = useState<
    string | null
  >(null);

  const [
    activeSession,
    setActiveSession,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    googleLoading,
    setGoogleLoading,
  ] = useState(false);

  /*
   * ==================================================
   * REDIRECT AUTHENTICATED USER
   * ==================================================
   */

  useEffect(() => {
    if (
      ready &&
      isAuthenticated
    ) {
      void navigate({
        to: "/dashboard",
        replace: true,
      });
    }
  }, [
    ready,
    isAuthenticated,
    navigate,
  ]);

  /*
   * ==================================================
   * READ OAUTH ERROR
   * ==================================================
   */

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    const oauthError =
      sessionStorage.getItem(
        "photos.oauth.error",
      );

    if (!oauthError) {
      return;
    }

    setFormError(
      oauthError,
    );

    sessionStorage.removeItem(
      "photos.oauth.error",
    );
  }, []);

  /*
   * ==================================================
   * NORMAL LOGIN
   * ==================================================
   */

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const nextErrors: Partial<
      Record<
        "email" | "password",
        string
      >
    > = {};

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !EMAIL_PATTERN.test(
        normalizedEmail,
      )
    ) {
      nextErrors.email =
        "Please enter a valid email address.";
    }

    if (
      password.length < 8
    ) {
      nextErrors.password =
        "Password must be at least 8 characters.";
    }

    setErrors(
      nextErrors,
    );

    setFormError(null);

    setActiveSession(false);

    if (
      Object.keys(
        nextErrors,
      ).length > 0
    ) {
      return;
    }

    setSubmitting(true);

    try {
      const user =
        await login({
          email:
            normalizedEmail,

          password,
        });

      toast.success(
        `Welcome back, ${user.name.split(" ")[0]}`,
      );

      await navigate({
        to: "/dashboard",
        replace: true,
      });
    } catch (error) {
      if (
        error instanceof ApiError &&
        (
          error.code ===
            "ACTIVE_SESSION_EXISTS" ||
          error.code ===
            "ACTIVE_SESSION" ||
          error.status === 409
        )
      ) {
        setActiveSession(
          true,
        );

        setFormError(
          "This account is already logged in on another device. Please log out from that device first.",
        );
      } else {
        setFormError(
          error instanceof Error
            ? error.message
            : "Unable to sign in. Please check your email and password.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * ==================================================
   * GOOGLE LOGIN
   * ==================================================
   */

  async function handleGoogleLogin() {
    if (
      googleLoading ||
      submitting
    ) {
      return;
    }

    setFormError(null);

    setActiveSession(false);

    setGoogleLoading(true);

    try {
      await loginWithProvider(
        "google",
      );
    } catch (error) {
      setGoogleLoading(false);

      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to continue with Google.",
      );
    }
  }

  /*
   * ==================================================
   * UI
   * ==================================================
   */

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to access your photo library."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            className="font-semibold text-primary hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {/* GOOGLE */}

        <Button
          type="button"
          variant="outline"
          className="h-12 w-full rounded-xl border-border bg-background text-sm font-semibold shadow-sm transition hover:bg-muted"
          disabled={
            googleLoading ||
            submitting
          }
          onClick={() =>
            void handleGoogleLogin()
          }
        >
          {googleLoading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <span className="mr-2 text-base font-bold">
              G
            </span>
          )}

          {googleLoading
            ? "Connecting to Google..."
            : "Continue with Google"}
        </Button>

        {/* DIVIDER */}

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />

          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            or continue with email
          </span>

          <div className="h-px flex-1 bg-border" />
        </div>

        {/* FORM */}

        <form
          onSubmit={
            handleSubmit
          }
          noValidate
          className="space-y-4"
        >
          {/* EMAIL */}

          <div className="space-y-2">
            <Label htmlFor="email">
              Email
            </Label>

            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(
                  event.target.value,
                );

                setErrors(
                  (previous) => {
                    const next =
                      {
                        ...previous,
                      };

                    delete next.email;

                    return next;
                  },
                );

                setFormError(
                  null,
                );
              }}
              aria-invalid={Boolean(
                errors.email,
              )}
              placeholder="you@example.com"
              className="h-11 rounded-xl"
            />

            {errors.email ? (
              <p className="text-xs font-medium text-destructive">
                {errors.email}
              </p>
            ) : null}
          </div>

          {/* PASSWORD */}

          <div className="space-y-2">
            <Label htmlFor="password">
              Password
            </Label>

            <div className="relative">
              <Input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(
                    event.target.value,
                  );

                  setErrors(
                    (previous) => {
                      const next =
                        {
                          ...previous,
                        };

                      delete next.password;

                      return next;
                    },
                  );

                  setFormError(
                    null,
                  );
                }}
                className="h-11 rounded-xl pr-11"
                placeholder="Enter your password"
                aria-invalid={Boolean(
                  errors.password,
                )}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (value) =>
                      !value,
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                className="absolute right-1 top-1 inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>

            {errors.password ? (
              <p className="text-xs font-medium text-destructive">
                {errors.password}
              </p>
            ) : null}
          </div>

          {/* ACTIVE SESSION */}

          {activeSession ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
              <p className="font-semibold text-amber-700 dark:text-amber-400">
                Account already logged in
              </p>

              <p className="mt-1 text-muted-foreground">
                Your account is currently active on another device. Log out there and try again.
              </p>
            </div>
          ) : null}

          {/* ERROR */}

          {formError &&
          !activeSession ? (
            <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
              {formError}
            </div>
          ) : null}

          {/* LOGIN */}

          <Button
            type="submit"
            className="h-11 w-full rounded-xl text-sm font-semibold"
            disabled={
              submitting ||
              googleLoading
            }
          >
            {submitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}

            {submitting
              ? "Logging in..."
              : "Log in"}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}