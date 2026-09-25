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
  useMemo,
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
    "/signup",
  )({
    head: () => ({
      meta: [
        {
          title:
            "Create your account — Photos",
        },
        {
          name: "description",
          content:
            "Create a free Photos account to store and download your photos securely.",
        },
      ],
    }),

    component:
      SignupPage,
  });

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordStrength(
  password: string,
) {
  let score = 0;

  if (
    password.length >= 8
  ) {
    score += 1;
  }

  if (
    password.length >= 12
  ) {
    score += 1;
  }

  if (
    /[A-Z]/.test(
      password,
    ) &&
    /[a-z]/.test(
      password,
    )
  ) {
    score += 1;
  }

  if (
    /\d/.test(password) ||
    /[^A-Za-z0-9]/.test(
      password,
    )
  ) {
    score += 1;
  }

  const labels = [
    "Too short",
    "Weak",
    "Fair",
    "Good",
    "Strong",
  ];

  return {
    score,
    label:
      labels[score]!,
  };
}

function SignupPage() {
  const {
    signup,
    loginWithProvider,
    isAuthenticated,
    ready,
  } = useAuth();

  const navigate =
    useNavigate();

  const [
    values,
    setValues,
  ] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

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
        | "name"
        | "email"
        | "password"
        | "confirmPassword",
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

  const strength =
    useMemo(
      () =>
        passwordStrength(
          values.password,
        ),
      [values.password],
    );

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

  function update(
    field: keyof typeof values,
    value: string,
  ) {
    setValues(
      (previous) => ({
        ...previous,
        [field]: value,
      }),
    );

    setErrors(
      (previous) => ({
        ...previous,
        [field]:
          undefined,
      }),
    );

    setFormError(
      null,
    );
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const nextErrors: Partial<
      Record<
        | "name"
        | "email"
        | "password"
        | "confirmPassword",
        string
      >
    > = {};

    const normalizedName =
      values.name.trim();

    const normalizedEmail =
      values.email
        .trim()
        .toLowerCase();

    if (
      normalizedName.length < 2
    ) {
      nextErrors.name =
        "Please enter your full name.";
    }

    if (
      !EMAIL_PATTERN.test(
        normalizedEmail,
      )
    ) {
      nextErrors.email =
        "Please enter a valid email address.";
    }

    if (
      values.password.length < 8
    ) {
      nextErrors.password =
        "Password must be at least 8 characters.";
    }

    if (
      values.confirmPassword !==
      values.password
    ) {
      nextErrors.confirmPassword =
        "Passwords do not match.";
    }

    setErrors(
      nextErrors,
    );

    setFormError(null);

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
        await signup({
          name:
            normalizedName,
          email:
            normalizedEmail,
          password:
            values.password,
        });

      toast.success(
        `Account created — welcome, ${user.name.split(" ")[0]}`,
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
        setFormError(
          "This account is already active on another device. Please log out there first.",
        );
      } else {
        setFormError(
          error instanceof Error
            ? error.message
            : "We couldn't create your account. Please try again.",
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

    setOauthProvider(
      provider,
    );

    setFormError(null);

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
      title="Create your account"
      subtitle="Store your photos in one calm, private place."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-primary hover:underline"
          >
            Log in
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
            submitting ||
            Boolean(
              oauthProvider,
            )
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
            <span className="font-bold">
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
              submitting ||
              Boolean(
                oauthProvider,
              )
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
              submitting ||
              Boolean(
                oauthProvider,
              )
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
          <Label htmlFor="name">
            Full name
          </Label>

          <Input
            id="name"
            autoComplete="name"
            value={values.name}
            onChange={(event) =>
              update(
                "name",
                event.target.value,
              )
            }
            aria-invalid={Boolean(
              errors.name,
            )}
            placeholder="Sparsh Kashyap"
          />

          {errors.name ? (
            <p className="text-xs font-medium text-destructive">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            Email
          </Label>

          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) =>
              update(
                "email",
                event.target.value,
              )
            }
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
              autoComplete="new-password"
              value={values.password}
              onChange={(event) =>
                update(
                  "password",
                  event.target.value,
                )
              }
              className="pr-11"
              placeholder="At least 8 characters"
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

          {values.password ? (
            <div className="flex items-center gap-2">
              <span className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map(
                  (index) => (
                    <span
                      key={index}
                      className={`h-1.5 flex-1 rounded-full ${
                        index <
                        strength.score
                          ? "bg-primary"
                          : "bg-border"
                      }`}
                    />
                  ),
                )}
              </span>

              <span className="w-16 text-right text-xs text-muted-foreground">
                {strength.label}
              </span>
            </div>
          ) : null}

          {errors.password ? (
            <p className="text-xs font-medium text-destructive">
              {errors.password}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">
            Confirm password
          </Label>

          <Input
            id="confirmPassword"
            type={
              showPassword
                ? "text"
                : "password"
            }
            autoComplete="new-password"
            value={
              values.confirmPassword
            }
            onChange={(event) =>
              update(
                "confirmPassword",
                event.target.value,
              )
            }
            aria-invalid={Boolean(
              errors.confirmPassword,
            )}
            placeholder="Re-enter your password"
          />

          {errors.confirmPassword ? (
            <p className="text-xs font-medium text-destructive">
              {
                errors.confirmPassword
              }
            </p>
          ) : null}
        </div>

        {formError ? (
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
            ? "Creating account..."
            : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}