import type { ReactNode } from "react";

import { Logo } from "@/components/Logo";
import { APP_TAGLINE } from "@/lib/constants";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo className="justify-center" />
          <p className="mt-2 text-sm text-muted-foreground">{APP_TAGLINE}</p>
        </div>

        <div className="panel animate-in fade-in-50 slide-in-from-bottom-2 p-6 duration-300 sm:p-8">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
      </div>
    </main>
  );
}
