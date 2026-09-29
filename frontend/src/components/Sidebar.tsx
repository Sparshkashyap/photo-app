import { Heart, Image, Menu, Settings, Trash2 } from "lucide-react";

import { Link, useRouterState } from "@tanstack/react-router";

import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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

type NavigationItemsProps = {
  onNavigate?: () => void;
};

function NavigationItems({
  onNavigate,
}: NavigationItemsProps) {
  const routerState = useRouterState();

  const pathname =
    routerState.location.pathname;

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const Icon = item.icon;

        const active =
          pathname === item.href ||
          (item.href === "/dashboard" &&
            pathname === "/");

        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            aria-current={
              active ? "page" : undefined
            }
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.98]"
            }`}
          >
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
              aria-hidden="true"
            />

            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

type SidebarProps = {
  mobileOpen?: boolean;
  onMobileOpenChange?: (
    open: boolean,
  ) => void;
};

export function Sidebar({
  mobileOpen = false,
  onMobileOpenChange,
}: SidebarProps) {
  const handleOpenChange = (open: boolean) => {
    onMobileOpenChange?.(open);
  };

  return (
    <>
      {/* ==================================================
          DESKTOP SIDEBAR
          ================================================== */}

      <aside className="hidden w-60 shrink-0 border-r border-border px-4 py-6 md:block">
        <div className="sticky top-24">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Library
          </p>

          <NavigationItems />
        </div>
      </aside>

      {/* ==================================================
          MOBILE SIDEBAR
          ================================================== */}

      <Sheet
        open={mobileOpen}
        onOpenChange={handleOpenChange}
      >
        <SheetContent
          side="left"
          className="w-[280px] p-0 md:hidden"
          aria-describedby={undefined}
        >
          {/* 
            IMPORTANT:
            Do NOT add another X button here.

            SheetContent already provides the
            default close button.
          */}

          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="text-left">
              Photos
            </SheetTitle>
          </SheetHeader>

          <div className="p-4">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Library
            </p>

            <NavigationItems
              onNavigate={() =>
                onMobileOpenChange?.(false)
              }
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function MobileNav() {
  const [open, setOpen] =
    useState(false);

  return (
    <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex h-14 items-center px-3">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-lg transition-transform active:scale-90"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          <Menu
            className="size-5"
            aria-hidden="true"
          />
        </Button>

        <Link
          to="/dashboard"
          className="ml-2 flex items-center gap-1.5 text-sm font-semibold tracking-tight transition-opacity active:opacity-70"
        >
          <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Image
              className="size-3.5"
              aria-hidden="true"
            />
          </span>

          Photos
        </Link>
      </div>

      <Sheet
        open={open}
        onOpenChange={setOpen}
      >
        <SheetContent
          side="left"
          className="w-[280px] p-0"
          aria-describedby={undefined}
        >
          {/* 
            IMPORTANT:
            No custom X button here.
            SheetContent already has one.
          */}

          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="text-left">
              Photos
            </SheetTitle>
          </SheetHeader>

          <div className="p-4">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Library
            </p>

            <NavigationItems
              onNavigate={() =>
                setOpen(false)
              }
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}