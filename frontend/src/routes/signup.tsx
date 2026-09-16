import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      {
        title: "Create your account — Photos",
      },
      {
        name: "description",
        content:
          "Create a free Photos account to store and download your photos securely.",
      },
      {
        property: "og:title",
        content: "Create your account — Photos",
      },
      {
        property: "og:description",
        content:
          "Create a free Photos account to store and download your photos securely.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
  }),
  component: SignupPage,
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score += 1;

  if (password.length >= 12) score += 1;

  if (
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password)
  ) {
    score += 1;
  }

  if (
    /\d/.test(password) ||
    /[^A-Za-z0-9]/.test(password)
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
    label: labels[score]!,
  };
}

function SignupPage() {
  const {
    signup,
    isAuthenticated,
    ready,
  } = useAuth();

  const navigate = useNavigate();

  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [errors, setErrors] = useState<
    Partial<
      Record<
        "name" | "email" | "password" | "confirmPassword",
        string
      >
    >
  >({});

  const [formError, setFormError] = useState<
    string | null
  >(null);

  const [submitting, setSubmitting] =
    useState(false);

  const strength = useMemo(
    () => passwordStrength(values.password),
    [values.password],
  );

  /*
   * Already authenticated users should go
   * directly to the dashboard.
   */
  useEffect(() => {
    if (ready && isAuthenticated) {
      void navigate({
        to: "/dashboard",
        replace: true,
      });
    }
  }, [ready, isAuthenticated, navigate]);

  function update(
    field: keyof typeof values,
    value: string,
  ) {
    setValues((previous) => ({
      ...previous,
      [field]: value,
    }));

    /*
     * Remove field error when user starts correcting it.
     */
    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));

    setFormError(null);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const nextErrors: Partial<
      Record<
        "name" | "email" | "password" | "confirmPassword",
        string
      >
    > = {};

    const normalizedName = values.name.trim();
    const normalizedEmail = values.email
      .trim()
      .toLowerCase();

    if (normalizedName.length < 2) {
      nextErrors.name =
        "Please enter your full name.";
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      nextErrors.email =
        "Please enter a valid email address.";
    }

    if (values.password.length < 8) {
      nextErrors.password =
        "Password must be at least 8 characters.";
    }

    if (
      values.confirmPassword !== values.password
    ) {
      nextErrors.confirmPassword =
        "Passwords do not match.";
    }

    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      /*
       * useAuth().signup() will call:
       *
       * POST http://localhost:3000/auth/signup
       *
       * Backend:
       * 1. validates input
       * 2. checks existing email
       * 3. hashes password with bcrypt
       * 4. stores user in MongoDB
       * 5. generates JWT
       * 6. returns token + user
       */
      const user = await signup({
        name: normalizedName,
        email: normalizedEmail,
        password: values.password,
      });

      toast.success(
        `Account created — welcome, ${user.name.split(" ")[0]}`,
      );

      await navigate({
        to: "/dashboard",
        replace: true,
      });
    } catch (error) {
      setFormError(
        error instanceof Error && error.message
          ? error.message
          : "We couldn't create your account. Please try again.",
      );
    } finally {
      setSubmitting(false);
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
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>

          <Input
            id="name"
            autoComplete="name"
            value={values.name}
            onChange={(event) =>
              update("name", event.target.value)
            }
            aria-invalid={Boolean(errors.name)}
            placeholder="Sparsh Kashyap"
          />

          {errors.name ? (
            <p
              role="alert"
              className="text-xs font-medium text-destructive"
            >
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>

          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) =>
              update("email", event.target.value)
            }
            aria-invalid={Boolean(errors.email)}
            placeholder="you@example.com"
          />

          {errors.email ? (
            <p
              role="alert"
              className="text-xs font-medium text-destructive"
            >
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>

          <div className="relative">
            <Input
              id="password"
              type={
                showPassword ? "text" : "password"
              }
              autoComplete="new-password"
              value={values.password}
              onChange={(event) =>
                update(
                  "password",
                  event.target.value,
                )
              }
              aria-invalid={Boolean(errors.password)}
              className="pr-11"
              placeholder="At least 8 characters"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword((value) => !value)
              }
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
              className="absolute right-1 top-1 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff
                  className="size-4"
                  aria-hidden="true"
                />
              ) : (
                <Eye
                  className="size-4"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>

          {values.password ? (
            <div
              className="flex items-center gap-2"
              aria-live="polite"
            >
              <span
                className="flex flex-1 gap-1"
                aria-hidden="true"
              >
                {[0, 1, 2, 3].map((index) => (
                  <span
                    key={index}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      index < strength.score
                        ? "bg-primary"
                        : "bg-border"
                    }`}
                  />
                ))}
              </span>

              <span className="w-16 text-right text-xs text-muted-foreground">
                {strength.label}
              </span>
            </div>
          ) : null}

          {errors.password ? (
            <p
              role="alert"
              className="text-xs font-medium text-destructive"
            >
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
              showPassword ? "text" : "password"
            }
            autoComplete="new-password"
            value={values.confirmPassword}
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
            <p
              role="alert"
              className="text-xs font-medium text-destructive"
            >
              {errors.confirmPassword}
            </p>
          ) : null}
        </div>

        {formError ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm font-medium text-destructive"
          >
            {formError}
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? (
            <Loader2
              className="size-4 animate-spin"
              aria-hidden="true"
            />
          ) : null}

          {submitting
            ? "Creating account…"
            : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}