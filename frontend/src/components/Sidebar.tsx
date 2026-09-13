import { Images, Settings } from "lucide-react";

import { APP_TAGLINE } from "@/lib/constants";

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-sidebar px-3 py-6 md:block lg:w-64">
      <nav aria-label="Main navigation" className="space-y-1">
        <span
          aria-current="page"
          className="flex items-center gap-3 rounded-full bg-sidebar-accent px-4 py-2.5 text-sm font-semibold text-sidebar-accent-foreground"
        >
          <Images className="size-[18px]" aria-hidden="true" />
          Photos
        </span>
        <span className="flex cursor-not-allowed items-center gap-3 rounded-full px-4 py-2.5 text-sm text-muted-foreground/70">
          <Settings className="size-[18px]" aria-hidden="true" />
          Settings
          <span className="ml-auto text-[10px] uppercase tracking-wide">Soon</span>
        </span>
      </nav>
      <p className="mt-8 px-4 text-xs leading-relaxed text-muted-foreground">{APP_TAGLINE}</p>
    </aside>
  );
}

/** Compact navigation shown on small screens. */
export function MobileNav() {
  return (
    <nav
      aria-label="Main navigation"
      className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5 md:hidden"
    >
      <span
        aria-current="page"
        className="inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-accent-foreground"
      >
        <Images className="size-4" aria-hidden="true" />
        Photos
      </span>
      <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm text-muted-foreground/70">
        <Settings className="size-4" aria-hidden="true" />
        Settings
      </span>
    </nav>
  );
}
