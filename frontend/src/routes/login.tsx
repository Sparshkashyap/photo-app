import {
  Link,
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";

import {
  Eye,
  EyeOff,
  Facebook,
  Instagram,
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
    oauthProvider,
    setOauthProvider,
  ] = useState<
    "google" |
      "facebook" |
      "instagram" |
      null
  >(null);

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
          error.status === 409
        )
      ) {
        setActiveSession(
          true,
        );

        setFormError(
          "This account is already logged in on another device. Please log out from that device before logging in here.",
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

  async function handleOAuth(
    provider:
      | "google"
      | "facebook"
      | "instagram",
  ) {
    if (oauthProvider) {
      return;
    }

    setFormError(null);
    setActiveSession(
      false,
    );

    setOauthProvider(
      provider,
    );

    try {
      await loginWithProvider(
        provider,
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : `Unable to continue with ${provider}.`,
      );

      setOauthProvider(
        null,
      );
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to reach your photo library."
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
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={
            Boolean(
              oauthProvider,
            ) ||
            submitting
          }
          onClick={() =>
            void handleOAuth(
              "google",
            )
          }
        >
          {oauthProvider ===
          "google" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <span className="text-base font-bold">
              G
            </span>
          )}

          Continue with Google
        </Button>

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={
              Boolean(
                oauthProvider,
              ) ||
              submitting
            }
            onClick={() =>
              void handleOAuth(
                "facebook",
              )
            }
          >
            {oauthProvider ===
            "facebook" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Facebook className="size-4" />
            )}

            Facebook
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={
              Boolean(
                oauthProvider,
              ) ||
              submitting
            }
            onClick={() =>
              void handleOAuth(
                "instagram",
              )
            }
          >
            {oauthProvider ===
            "instagram" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Instagram className="size-4" />
            )}

            Instagram
          </Button>
        </div>
      </div>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">
          OR
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        noValidate
        className="space-y-4"
      >
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
                    { ...previous };

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
          />

          {errors.email ? (
            <p className="text-xs font-medium text-destructive">
              {errors.email}
            </p>
          ) : null}
        </div>

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
                      { ...previous };

                    delete next.password;

                    return next;
                  },
                );

                setFormError(
                  null,
                );
              }}
              className="pr-11"
              placeholder="••••••••"
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
              className="absolute right-1 top-1 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
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

        {activeSession ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              Account already logged in
            </p>

            <p className="mt-1 text-muted-foreground">
              Your Photos account is currently active on another device. Please log out there and then try again here.
            </p>
          </div>
        ) : null}

        {formError &&
        !activeSession ? (
          <p className="rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm font-medium text-destructive">
            {formError}
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={
            submitting ||
            Boolean(
              oauthProvider,
            )
          }
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}

          {submitting
            ? "Logging in..."
            : "Log in"}
        </Button>
      </form>
    </AuthLayout>
  );
}