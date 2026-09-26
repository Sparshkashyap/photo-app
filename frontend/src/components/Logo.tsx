import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Six blades rotated around the center — reads as a camera aperture/iris,
// which ties the mark to "photos" rather than a generic sunburst.
const APERTURE_BLADE_ANGLES = [0, 60, 120, 180, 240, 300];

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-xl bg-accent transition-transform duration-200",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        aria-hidden="true"
      >
        <g className="text-primary">
          {APERTURE_BLADE_ANGLES.map((angle, index) => (
            <rect
              key={angle}
              x="11"
              y="2.75"
              width="2"
              height="6.5"
              rx="1"
              fill="currentColor"
              opacity={1 - index * 0.12}
              transform={`rotate(${angle} 12 12)`}
            />
          ))}

          <circle cx="12" cy="12" r="2.6" fill="currentColor" />
        </g>
      </svg>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="hover:rotate-45" />

      <span className="font-display text-lg font-semibold tracking-tight">
        {APP_NAME}
      </span>
    </span>
  );
}

export default Logo;