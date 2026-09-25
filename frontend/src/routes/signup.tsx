import {
  Link,
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";

import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
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

  const colors = [
    "bg-destructive",
    "bg-destructive",
    "bg-amber-500",
    "bg-lime-500",
    "bg-emerald-500",
  ];

  return {
    score,
    label: labels[score]!,
    color: colors[score]!,
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

  const nameInputRef =
    useRef<HTMLInputElement>(null);

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
    googleLoading,
    setGoogleLoading,
  ] = useState(false);

  const strength =
    useMemo(
      () =>
        passwordStrength(
          values.password,
        ),
      [values.password],
    );

  const passwordsMatch =
    values.confirmPassword.length >
      0 &&
    values.confirmPassword ===
      values.password;

  /*
   * ==================================================
   * AUTOFOCUS NAME FIELD ON MOUNT
   * ==================================================
   */

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

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

    setFormError(null);
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
      if (nextErrors.name) {
        nameInputRef.current?.focus();
      }
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

  async function handleGoogleSignup() {
    if (
      googleLoading ||
      submitting
    ) {
      return;
    }

    setFormError(null);
    setGoogleLoading(true);

    try {
      await loginWithProvider(
        "google",
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to continue with Google.",
      );

      setGoogleLoading(false);
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
            className="font-semibold text-primary underline-offset-4 transition hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <div className="space-y-6">
        {/* GOOGLE OAUTH */}

        <Button
          type="button"
          variant="outline"
          className="h-12 w-full gap-3 rounded-xl border-border bg-background text-sm font-semibold shadow-sm transition-all hover:border-foreground/20 hover:bg-muted active:scale-[0.99]"
          disabled={
            submitting ||
            googleLoading
          }
          onClick={() =>
            void handleGoogleSignup()
          }
        >
          {googleLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M21.35 12.23c0-.79-.07-1.55-.22-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.42Z"
              />

              <path
                fill="#34A853"
                d="M12 21.99c2.63 0 4.84-.87 6.45-2.34l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.74 9.74 0 0 0 12 21.99Z"
              />

              <path
                fill="#FBBC05"
                d="M6.53 14.09A5.85 5.85 0 0 1 6.22 12c0-.73.13-1.43.31-2.09V7.38H3.28A9.96 9.96 0 0 0 2 12c0 1.49.36 2.9 1.28 4.62l3.25-2.53Z"
              />

              <path
                fill="#EA4335"
                d="M12 5.88c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 2.99 14.62 2 12 2a9.74 9.74 0 0 0-8.72 5.38l3.25 2.53C7.3 7.6 9.46 5.88 12 5.88Z"
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

        {/* SIGNUP FORM */}

        <form
          onSubmit={
            handleSubmit
          }
          noValidate
          className="space-y-4"
        >
          {/* NAME */}

          <div className="space-y-2">
            <Label htmlFor="name">
              Full name
            </Label>

            <div className="relative">
              <User
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />

              <Input
                ref={nameInputRef}
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
                aria-describedby={
                  errors.name
                    ? "name-error"
                    : undefined
                }
                placeholder="Sparsh Kashyap"
                className="h-11 rounded-xl pl-10 transition-shadow focus-visible:ring-2"
              />
            </div>

            {errors.name ? (
              <p
                id="name-error"
                className="text-xs font-medium text-destructive"
              >
                {errors.name}
              </p>
            ) : null}
          </div>

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
                className="text-xs font-medium text-destructive"
              >
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
                autoComplete="new-password"
                value={values.password}
                onChange={(event) =>
                  update(
                    "password",
                    event.target.value,
                  )
                }
                className="h-11 rounded-xl pl-10 pr-11 transition-shadow focus-visible:ring-2"
                placeholder="At least 8 characters"
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

            {values.password ? (
              <div className="flex items-center gap-2 pt-0.5">
                <span className="flex flex-1 gap-1">
                  {[0, 1, 2, 3].map(
                    (index) => (
                      <span
                        key={index}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                          index <
                          strength.score
                            ? strength.color
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
              <p
                id="password-error"
                className="text-xs font-medium text-destructive"
              >
                {errors.password}
              </p>
            ) : null}
          </div>

          {/* CONFIRM PASSWORD */}

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Confirm password
            </Label>

            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />

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
                aria-describedby={
                  errors.confirmPassword
                    ? "confirm-password-error"
                    : undefined
                }
                placeholder="Re-enter your password"
                className="h-11 rounded-xl pl-10 pr-10 transition-shadow focus-visible:ring-2"
              />

              {values.confirmPassword ? (
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                >
                  {passwordsMatch ? (
                    <Check className="size-4 text-emerald-500" />
                  ) : (
                    <X className="size-4 text-destructive" />
                  )}
                </span>
              ) : null}
            </div>

            {errors.confirmPassword ? (
              <p
                id="confirm-password-error"
                className="text-xs font-medium text-destructive"
              >
                {
                  errors.confirmPassword
                }
              </p>
            ) : null}
          </div>

          {/* ERROR */}

          {formError ? (
            <div
              role="alert"
              className="animate-in fade-in slide-in-from-top-1 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive duration-200"
            >
              {formError}
            </div>
          ) : null}

          {/* SUBMIT */}

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
              ? "Creating account..."
              : "Create account"}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}