import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-xl bg-accent",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="3.4" fill="currentColor" className="text-primary" />
        <g className="text-primary" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 3v3.2" opacity="0.9" />
          <path d="M12 17.8V21" opacity="0.5" />
          <path d="M3 12h3.2" opacity="0.7" />
          <path d="M17.8 12H21" opacity="0.35" />
        </g>
      </svg>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-lg font-semibold tracking-tight">{APP_NAME}</span>
    </span>
  );
}
