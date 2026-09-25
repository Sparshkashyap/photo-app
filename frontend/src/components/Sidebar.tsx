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
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4 shrink-0" />

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
    <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur md:hidden">
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
          className="ml-2 text-sm font-semibold"
        >
          Photos
        </Link>
      </div>
    </div>
  );
}