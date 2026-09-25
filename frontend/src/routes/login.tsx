import {
  Link,
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";

import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";

import {
  useEffect,
  useRef,
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

  const emailInputRef =
    useRef<HTMLInputElement>(null);

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
   * AUTOFOCUS EMAIL FIELD ON MOUNT
   * ==================================================
   */

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

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
      // Move focus to the first invalid field so keyboard/screen-reader
      // users land exactly where they need to fix things.
      if (nextErrors.email) {
        emailInputRef.current?.focus();
      }
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
            className="font-semibold text-primary underline-offset-4 transition hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      <div className="space-y-6">
        {/* GOOGLE */}

        <Button
          type="button"
          variant="outline"
          className="h-12 w-full rounded-xl border-border bg-background text-sm font-semibold shadow-sm transition-all hover:border-foreground/20 hover:bg-muted active:scale-[0.99]"
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
            <svg
              className="mr-2 size-4"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.89c2.28-2.1 3.57-5.2 3.57-8.84z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.89-3.02c-1.08.72-2.46 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.94H1.27v3.11C3.25 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.27a12 12 0 0 0 0 10.8z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.6l4.01 3.11C6.23 6.87 8.88 4.75 12 4.75z"
              />
            </svg>
          )}

          {googleLoading
            ? "Connecting to Google..."
            : "Continue with Google"}
        </Button>

        {/* DIVIDER */}

        <div
          className="flex items-center gap-3"
          role="separator"
        >
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

            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />

              <Input
                ref={emailInputRef}
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
                aria-describedby={
                  errors.email
                    ? "email-error"
                    : undefined
                }
                placeholder="you@example.com"
                className="h-11 rounded-xl pl-10 transition-shadow focus-visible:ring-2"
              />
            </div>

            {errors.email ? (
              <p
                id="email-error"
                className="flex items-center gap-1 text-xs font-medium text-destructive"
              >
                {errors.email}
              </p>
            ) : null}
          </div>

          {/* PASSWORD */}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">
                Password
              </Label>

              <a
                href="/forgot-password"
                className="text-xs font-medium text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
                tabIndex={-1}
              >
                Forgot password?
              </a>
            </div>

            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />

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
                className="h-11 rounded-xl pl-10 pr-11 transition-shadow focus-visible:ring-2"
                placeholder="Enter your password"
                aria-invalid={Boolean(
                  errors.password,
                )}
                aria-describedby={
                  errors.password
                    ? "password-error"
                    : undefined
                }
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
              <p
                id="password-error"
                className="text-xs font-medium text-destructive"
              >
                {errors.password}
              </p>
            ) : null}
          </div>

          {/* ACTIVE SESSION */}

          {activeSession ? (
            <div
              role="alert"
              className="animate-in fade-in slide-in-from-top-1 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm duration-200"
            >
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
            <div
              role="alert"
              className="animate-in fade-in slide-in-from-top-1 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive duration-200"
            >
              {formError}
            </div>
          ) : null}

          {/* LOGIN */}

          <Button
            type="submit"
            className="h-11 w-full rounded-xl text-sm font-semibold transition-all active:scale-[0.99]"
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