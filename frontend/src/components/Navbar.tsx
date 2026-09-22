import { useEffect, useState } from "react";

import { useNavigate } from "@tanstack/react-router";

import {
  ChevronDown,
  Filter,
  LogOut,
  Search,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { Logo } from "@/components/Logo";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "@/hooks/useAuth";

import type {
  PhotoSort,
  PhotoType,
} from "@/services/api";

// ==================================================
// TYPES
// ==================================================

type ToolbarDetail = {
  search?: string;
  sort?: PhotoSort;
  type?: PhotoType;
};

// ==================================================
// HELPERS
// ==================================================

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part[0]!.toUpperCase(),
    )
    .join("");
}

// ==================================================
// COMPONENT
// ==================================================

export function Navbar() {
  const {
    user,
    logout,
  } = useAuth();

  const navigate =
    useNavigate();

  // ==================================================
  // TOOLBAR STATE
  // ==================================================

  const [search, setSearch] =
    useState("");

  const [sort, setSort] =
    useState<PhotoSort>(
      "newest",
    );

  const [type, setType] =
    useState<PhotoType>(
      "all",
    );

  // ==================================================
  // SYNC FROM DASHBOARD
  // ==================================================

  useEffect(() => {
    function handleToolbarSync(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<ToolbarDetail>;

      const detail =
        customEvent.detail;

      if (!detail) {
        return;
      }

      if (
        detail.search !==
        undefined
      ) {
        setSearch(
          detail.search,
        );
      }

      if (
        detail.sort !==
        undefined
      ) {
        setSort(
          detail.sort,
        );
      }

      if (
        detail.type !==
        undefined
      ) {
        setType(
          detail.type,
        );
      }
    }

    window.addEventListener(
      "photo-toolbar-sync",
      handleToolbarSync,
    );

    return () => {
      window.removeEventListener(
        "photo-toolbar-sync",
        handleToolbarSync,
      );
    };
  }, []);

  // ==================================================
  // EMIT TOOLBAR CHANGE
  // ==================================================

  function emitToolbarChange(
    detail: ToolbarDetail,
  ) {
    window.dispatchEvent(
      new CustomEvent(
        "photo-toolbar-change",
        {
          detail,
        },
      ),
    );
  }

  // ==================================================
  // SEARCH
  // ==================================================

  function handleSearchChange(
    value: string,
  ) {
    setSearch(value);

    emitToolbarChange({
      search: value,
    });
  }

  function clearSearch() {
    handleSearchChange("");
  }

  // ==================================================
  // SORT
  // ==================================================

  function handleSortChange(
    value: PhotoSort,
  ) {
    setSort(value);

    emitToolbarChange({
      sort: value,
    });
  }

  // ==================================================
  // TYPE FILTER
  // ==================================================

  function handleTypeChange(
    value: PhotoType,
  ) {
    setType(value);

    emitToolbarChange({
      type: value,
    });
  }

  // ==================================================
  // LOGOUT
  // ==================================================

  function handleLogout() {
    logout();

    toast.success(
      "You're logged out",
    );

    void navigate({
      to: "/login",
      replace: true,
    });
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        {/* ==================================================
            LOGO
            ================================================== */}

        <Logo />

        {/* ==================================================
            DESKTOP TOOLBAR
            ================================================== */}

        <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
          {/* Search */}

          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                handleSearchChange(
                  event.target.value,
                )
              }
              placeholder="Search photos by name or filename..."
              aria-label="Search photos"
              autoComplete="off"
              className="h-11 w-full rounded-full border border-border bg-muted/50 pl-12 pr-12 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/15"
            />

            {search ? (
              <button
                type="button"
                onClick={
                  clearSearch
                }
                className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Clear search"
                title="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          {/* Sort */}

          <div className="relative shrink-0">
            <select
              value={sort}
              onChange={(event) =>
                handleSortChange(
                  event.target
                    .value as PhotoSort,
                )
              }
              aria-label="Sort photos"
              className="h-11 appearance-none rounded-full border border-border bg-background pl-5 pr-10 text-sm font-medium outline-none transition hover:bg-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              <option value="newest">
                Newest
              </option>

              <option value="oldest">
                Oldest
              </option>

              <option value="name_asc">
                Name: A → Z
              </option>

              <option value="name_desc">
                Name: Z → A
              </option>
            </select>

            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
          </div>

          {/* Type */}

          <div className="relative shrink-0">
            <Filter
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />

            <select
              value={type}
              onChange={(event) =>
                handleTypeChange(
                  event.target
                    .value as PhotoType,
                )
              }
              aria-label="Filter photos by type"
              className="h-11 appearance-none rounded-full border border-border bg-background pl-9 pr-10 text-sm font-medium outline-none transition hover:bg-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              <option value="all">
                All
              </option>

              <option value="image">
                Images
              </option>

              <option value="video">
                Videos
              </option>
            </select>

            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* ==================================================
            ACCOUNT
            ================================================== */}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
            >
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-3 text-sm transition hover:bg-muted"
                aria-label="Account menu"
              >
                <Avatar className="size-9">
                  <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                    {user
                      ? initials(
                          user.name,
                        )
                      : "?"}
                  </AvatarFallback>
                </Avatar>

                <span className="hidden max-w-[10rem] truncate font-medium capitalize lg:inline">
                  {user?.name}
                </span>

                <ChevronDown className="hidden size-4 text-muted-foreground sm:inline" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-60"
            >
              <DropdownMenuLabel className="space-y-1">
                <span className="block truncate capitalize">
                  {user?.name}
                </span>

                <span className="block truncate text-xs font-normal text-muted-foreground">
                  {user?.email}
                </span>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={() =>
                  void navigate({
                    to: "/settings",
                  })
                }
              >
                Settings
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={() =>
                  void navigate({
                    to: "/trash",
                  })
                }
              >
                Trash
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={
                  handleLogout
                }
              >
                <LogOut className="size-4" />

                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="hidden xl:inline-flex"
            onClick={
              handleLogout
            }
          >
            <LogOut className="size-4" />

            Log out
          </Button>
        </div>
      </div>

      {/* ==================================================
          MOBILE TOOLBAR
          ================================================== */}

      <div className="border-t border-border px-4 py-3 md:hidden">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              handleSearchChange(
                event.target.value,
              )
            }
            placeholder="Search your photos..."
            aria-label="Search photos"
            autoComplete="off"
            className="h-11 w-full rounded-full border border-border bg-muted/50 pl-11 pr-11 text-sm outline-none focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/15"
          />

          {search ? (
            <button
              type="button"
              onClick={
                clearSearch
              }
              className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          <select
            value={sort}
            onChange={(event) =>
              handleSortChange(
                event.target
                  .value as PhotoSort,
              )
            }
            className="h-9 shrink-0 rounded-full border border-border bg-background px-3 text-xs font-medium outline-none"
            aria-label="Sort photos"
          >
            <option value="newest">
              Newest
            </option>

            <option value="oldest">
              Oldest
            </option>

            <option value="name_asc">
              Name A-Z
            </option>

            <option value="name_desc">
              Name Z-A
            </option>
          </select>

          <select
            value={type}
            onChange={(event) =>
              handleTypeChange(
                event.target
                  .value as PhotoType,
              )
            }
            className="h-9 shrink-0 rounded-full border border-border bg-background px-3 text-xs font-medium outline-none"
            aria-label="Filter photos"
          >
            <option value="all">
              All
            </option>

            <option value="image">
              Images
            </option>

            <option value="video">
              Videos
            </option>
          </select>
        </div>
      </div>
    </header>
  );
}

export default Navbar;