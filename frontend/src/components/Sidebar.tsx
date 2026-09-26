import {
  Heart,
  Image,
  Menu,
  Settings,
  Trash2,
  X,
} from "lucide-react";

import {
  Link,
  useRouterState,
} from "@tanstack/react-router";

import {
  useState,
} from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Button } from "@/components/ui/button";

const navigation = [
  {
    label: "Photos",
    href: "/dashboard",
    icon: Image,
  },
  {
    label: "Favorites",
    href: "/favorites",
    icon: Heart,
  },
  {
    label: "Trash",
    href: "/trash",
    icon: Trash2,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
] as const;

function NavigationItems({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const routerState =
    useRouterState();

  const pathname =
    routerState.location.pathname;

  return (
    <nav className="space-y-1">
      {navigation.map(
        (item) => {
          const Icon =
            item.icon;

          const active =
            pathname ===
              item.href ||
            (
              item.href ===
                "/dashboard" &&
              pathname === "/"
            );

          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={
                onNavigate
              }
              aria-current={
                active
                  ? "page"
                  : undefined
              }
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.98]"
              }`}
            >
              {/* ACTIVE INDICATOR */}

              <span
                className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-all duration-200 ${
                  active
                    ? "opacity-100"
                    : "opacity-0"
                }`}
                aria-hidden="true"
              />

              <Icon
                className={`size-4 shrink-0 transition-transform duration-150 ${
                  active
                    ? ""
                    : "group-hover:scale-110"
                }`}
              />

              <span>
                {item.label}
              </span>
            </Link>
          );
        },
      )}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border px-4 py-6 md:block">
      <div className="sticky top-24">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Library
        </p>

        <NavigationItems />
      </div>
    </aside>
  );
}

export function MobileNav() {
  const [
    open,
    setOpen,
  ] = useState(false);

  return (
    <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex h-14 items-center px-3">
        <Sheet
          open={open}
          onOpenChange={
            setOpen
          }
        >
          <SheetTrigger
            asChild
          >
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg transition-transform active:scale-90"
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>

          <SheetContent
            side="left"
            className="w-[280px] p-0"
          >
            <SheetHeader className="border-b border-border px-5 py-4">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-left">
                  Photos
                </SheetTitle>

                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg transition-transform active:scale-90"
                  onClick={() =>
                    setOpen(
                      false,
                    )
                  }
                  aria-label="Close navigation"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </SheetHeader>

            <div className="p-4">
              <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Library
              </p>

              <NavigationItems
                onNavigate={() =>
                  setOpen(
                    false,
                  )
                }
              />
            </div>
          </SheetContent>
        </Sheet>

        <Link
          to="/dashboard"
          className="ml-2 flex items-center gap-1.5 text-sm font-semibold tracking-tight transition-opacity active:opacity-70"
        >
          <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Image className="size-3.5" />
          </span>
          Photos
        </Link>
      </div>
    </div>
  );
}