import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, forgotPassword, resetPassword, verifyResetOtp } from "@/services/api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Photos" },
      { name: "description", content: "Reset your Photo-App password securely." },
    ],
  }),
  component: ForgotPasswordPage,
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = "email" | "otp" | "password";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step === "email") emailRef.current?.focus();
    if (step === "otp") otpRef.current?.focus();
  }, [step]);

  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    const normalized = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalized)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await forgotPassword(normalized);
      setEmail(normalized);
      setStep("otp");
      toast.success(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send the verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event?: React.FormEvent) {
    event?.preventDefault();

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await verifyResetOtp(email, otp);
      setStep("password");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPassword(email, otp, password);
      toast.success("Password reset successfully");
      await navigate({ to: "/login", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  }

  const titles: Record<Step, [string, string]> = {
    email: ["Forgot password?", "Enter your email and we’ll send you a verification code."],
    otp: ["Check your email", `Enter the 6-digit code sent to ${email}.`],
    password: ["Create a new password", "Choose a new password for your Photo-App account."],
  };

  return (
    <AuthLayout
      title={titles[step][0]}
      subtitle={titles[step][1]}
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Back to login
        </Link>
      }
    >
      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={emailRef}
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                className="h-12 rounded-xl pl-10"
                placeholder="you@example.com"
              />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-12 w-full rounded-xl" disabled={loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Send verification code
          </Button>
        </form>
      ) : null}

      {step === "otp" ? (
        <form onSubmit={verifyCode} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="reset-otp">Verification code</Label>
            <Input
              ref={otpRef}
              id="reset-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
              className="h-12 rounded-xl text-center text-xl font-semibold tracking-[0.45em]"
              placeholder="000000"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-12 w-full rounded-xl" disabled={loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Verify code
          </Button>
          <button
            type="button"
            className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground"
            disabled={loading}
            onClick={() => void sendCode()}
          >
            Didn’t receive it? Send again
          </button>
        </form>
      ) : null}

      {step === "password" ? (
        <form onSubmit={savePassword} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="h-12 rounded-xl pl-10 pr-10"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError(null);
              }}
              className="h-12 rounded-xl"
              placeholder="Repeat your password"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-12 w-full rounded-xl" disabled={loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Reset password
          </Button>
        </form>
      ) : null}
    </AuthLayout>
  );
}
