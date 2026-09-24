import {
  Heart,
  Images,
  Settings,
  Trash2,
} from "lucide-react";

import {
  Link,
  useLocation,
} from "@tanstack/react-router";

import {
  APP_TAGLINE,
} from "@/lib/constants";

// ==================================================
// SIDEBAR
// ==================================================

export function Sidebar() {
  const location =
    useLocation();

  const isPhotos =
    location.pathname ===
    "/dashboard";

  const isFavorites =
    location.pathname ===
    "/favorites";

  const isTrash =
    location.pathname ===
    "/trash";

  const isSettings =
    location.pathname ===
    "/settings";

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-sidebar px-3 py-6 md:block lg:w-64">
      <nav
        aria-label="Main navigation"
        className="space-y-1"
      >
        {/* ==================================================
            Photos
        ================================================== */}

        <Link
          to="/dashboard"
          className={
            isPhotos
              ? "flex items-center gap-3 rounded-full bg-sidebar-accent px-4 py-2.5 text-sm font-semibold text-sidebar-accent-foreground transition"
              : "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-foreground"
          }
        >
          <Images
            className="size-[18px]"
            aria-hidden="true"
          />

          Photos
        </Link>

        {/* ==================================================
            Favorites
        ================================================== */}

        <Link
          to="/favorites"
          className={
            isFavorites
              ? "flex items-center gap-3 rounded-full bg-sidebar-accent px-4 py-2.5 text-sm font-semibold text-sidebar-accent-foreground transition"
              : "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-foreground"
          }
        >
          <Heart
            className="size-[18px]"
            aria-hidden="true"
          />

          Favorites
        </Link>

        {/* ==================================================
            Trash
        ================================================== */}

        <Link
          to="/trash"
          className={
            isTrash
              ? "flex items-center gap-3 rounded-full bg-sidebar-accent px-4 py-2.5 text-sm font-semibold text-sidebar-accent-foreground transition"
              : "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-foreground"
          }
        >
          <Trash2
            className="size-[18px]"
            aria-hidden="true"
          />

          Trash
        </Link>

        {/* ==================================================
            Settings
        ================================================== */}

        <Link
          to="/settings"
          className={
            isSettings
              ? "flex items-center gap-3 rounded-full bg-sidebar-accent px-4 py-2.5 text-sm font-semibold text-sidebar-accent-foreground transition"
              : "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-foreground"
          }
        >
          <Settings
            className="size-[18px]"
            aria-hidden="true"
          />

          Settings
        </Link>
      </nav>

      <p className="mt-8 px-4 text-xs leading-relaxed text-muted-foreground">
        {APP_TAGLINE}
      </p>
    </aside>
  );
}

// ==================================================
// MOBILE NAV
// ==================================================

export function MobileNav() {
  const location =
    useLocation();

  const isPhotos =
    location.pathname ===
    "/dashboard";

  const isFavorites =
    location.pathname ===
    "/favorites";

  const isTrash =
    location.pathname ===
    "/trash";

  const isSettings =
    location.pathname ===
    "/settings";

  return (
    <nav
      aria-label="Main navigation"
      className="flex items-center gap-1 overflow-x-auto border-b border-border bg-surface px-4 py-2.5 md:hidden"
    >
      {/* Photos */}

      <Link
        to="/dashboard"
        className={
          isPhotos
            ? "inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-accent-foreground"
            : "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        }
      >
        <Images className="size-4" />

        Photos
      </Link>

      {/* Favorites */}

      <Link
        to="/favorites"
        className={
          isFavorites
            ? "inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-accent-foreground"
            : "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        }
      >
        <Heart className="size-4" />

        Favorites
      </Link>

      {/* Trash */}

      <Link
        to="/trash"
        className={
          isTrash
            ? "inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-accent-foreground"
            : "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        }
      >
        <Trash2 className="size-4" />

        Trash
      </Link>

      {/* Settings */}

      <Link
        to="/settings"
        className={
          isSettings
            ? "inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-accent-foreground"
            : "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        }
      >
        <Settings className="size-4" />

        Settings
      </Link>
    </nav>
  );
}