import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { Logo } from "@/components/Logo";
import { APP_TAGLINE } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  component: Index,
});

/** Entry point: sends people to their library or to the login screen. */
function Index() {
  const { ready, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    void navigate({ to: isAuthenticated ? "/dashboard" : "/login", replace: true });
  }, [ready, isAuthenticated, navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
      <Logo />
      <p className="text-sm text-muted-foreground">{APP_TAGLINE}</p>
    </main>
  );
}
