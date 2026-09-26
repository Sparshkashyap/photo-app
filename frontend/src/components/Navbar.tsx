import {
  ChevronDown,
  Filter,
  Heart,
  LogOut,
  Menu,
  Search,
  Settings,
  Trash2,
  User,
  X,
} from "lucide-react";

import {
  Link,
  useNavigate,
} from "@tanstack/react-router";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  toast,
} from "sonner";

import {
  useAuth,
} from "@/hooks/useAuth";

import {
  Button,
} from "@/components/ui/button";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Input,
} from "@/components/ui/input";

import type {
  PhotoSort,
  PhotoType,
} from "@/services/api";

// --------------------------------------------------
// Config
// --------------------------------------------------

/** How long to wait after the user stops typing before the search actually fires. */
const SEARCH_DEBOUNCE_MS = 250;

const SORT_OPTIONS: {
  value: PhotoSort;
  label: string;
}[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name_asc", label: "Name: A → Z" },
  { value: "name_desc", label: "Name: Z → A" },
];

const TYPE_OPTIONS: {
  value: PhotoType;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
];

type NavbarProps = {
  search?: string;

  sort?: PhotoSort;

  type?: PhotoType;

  onSearchChange?: (
    value: string,
  ) => void;

  onSortChange?: (
    value: PhotoSort,
  ) => void;

  onTypeChange?: (
    value: PhotoType,
  ) => void;

  /**
   * Opens the mobile navigation/sidebar.
   *
   * Dashboard can pass its Sidebar/Sheet trigger here.
   * Keeping this optional preserves the existing Navbar API.
   */
  onMobileMenuClick?: () => void;
};

function getInitials(
  name: string,
): string {
  return (
    name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) =>
          part[0]?.toUpperCase() ??
          "",
      )
      .join("") || "U"
  );
}

export function Navbar({
  search: controlledSearch,
  sort: controlledSort,
  type: controlledType,
  onSearchChange,
  onSortChange,
  onTypeChange,
  onMobileMenuClick,
}: NavbarProps) {
  const {
    user,
    logout,
  } = useAuth();

  const navigate =
    useNavigate();

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);

  const [
    localSearch,
    setLocalSearch,
  ] = useState("");

  const [
    localSort,
    setLocalSort,
  ] = useState<PhotoSort>(
    "newest",
  );

  const [
    localType,
    setLocalType,
  ] = useState<PhotoType>(
    "all",
  );

  const [
    mobileSearchOpen,
    setMobileSearchOpen,
  ] = useState(false);

  const [
    scrolled,
    setScrolled,
  ] = useState(false);

  const search =
    controlledSearch ??
    localSearch;

  const sort =
    controlledSort ??
    localSort;

  const type =
    controlledType ??
    localType;

  // --------------------------------------------------
  // Debounced search: the input feels instant, the
  // (potentially expensive) callback fires after a
  // short pause so we're not re-filtering on every key.
  // --------------------------------------------------

  const [
    searchDraft,
    setSearchDraft,
  ] = useState(search);

  const desktopSearchRef =
    useRef<HTMLInputElement>(null);

  const mobileSearchRef =
    useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Keep the draft in sync if the value changes from outside
    // (e.g. a "clear filters" button elsewhere on the page).
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    if (searchDraft === search) {
      return;
    }

    const timeout = setTimeout(() => {
      if (onSearchChange) {
        onSearchChange(searchDraft);
      } else {
        setLocalSearch(searchDraft);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  function commitSearchImmediately(
    value: string,
  ) {
    setSearchDraft(value);

    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setLocalSearch(value);
    }
  }

  // --------------------------------------------------
  // Keyboard shortcuts: ⌘K / Ctrl+K focuses search from
  // anywhere on the page, Escape clears + blurs it.
  // --------------------------------------------------

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      const isSearchShortcut =
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k";

      if (isSearchShortcut) {
        event.preventDefault();
        setMobileSearchOpen(true);

        // Desktop input is visible at md+, mobile input only
        // once the toolbar is open — focus whichever exists.
        requestAnimationFrame(() => {
          (
            desktopSearchRef.current ??
            mobileSearchRef.current
          )?.focus();
        });
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
  }, []);

  // --------------------------------------------------
  // Elevate the header once the page scrolls, so the
  // blurred glass background reads clearly against content.
  // --------------------------------------------------

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 4);
    }

    handleScroll();

    window.addEventListener(
      "scroll",
      handleScroll,
      { passive: true },
    );

    return () =>
      window.removeEventListener(
        "scroll",
        handleScroll,
      );
  }, []);

  function handleSortChange(
    value: PhotoSort,
  ) {
    if (onSortChange) {
      onSortChange(value);
    } else {
      setLocalSort(value);
    }
  }

  function handleTypeChange(
    value: PhotoType,
  ) {
    if (onTypeChange) {
      onTypeChange(value);
    } else {
      setLocalType(value);
    }
  }

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await logout();

      toast.success(
        "You're logged out",
      );

      await navigate({
        to: "/login",
        replace: true,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to log out.",
      );
    } finally {
      setLoggingOut(false);
    }
  }

  function goToSettings() {
    void navigate({
      to: "/settings",
    });
  }

  function goToTrash() {
    void navigate({
      to: "/trash",
    });
  }

  function goToFavorites() {
    void navigate({
      to: "/favorites",
    });
  }

  const userName =
    user?.name ||
    "User";

  const userInitials =
    getInitials(userName);

  // Optional field — guarded like this so the component still
  // compiles if your `User` type doesn't declare `avatarUrl` yet.
  const avatarUrl = (
    user as
      | { avatarUrl?: string | null }
      | null
      | undefined
  )?.avatarUrl;

  const hasActiveFilters =
    type !== "all" ||
    sort !== "newest";

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl transition-shadow duration-200 ${
        scrolled
          ? "border-border shadow-sm"
          : "border-transparent"
      }`}
    >
      <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center gap-2 px-3 sm:px-5">

        {/* MOBILE MENU / SIDEBAR TRIGGER */}

        <div className="flex md:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              onMobileMenuClick?.();
            }}
            aria-label="Open navigation menu"
            title="Open navigation menu"
            disabled={!onMobileMenuClick}
          >
            <Menu className="size-5" />
          </Button>
        </div>

        {/* LOGO */}

        <Link
          to="/dashboard"
          className="flex min-w-0 items-center gap-2.5 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <span className="text-sm font-bold">
              P
            </span>
          </div>

          <span className="hidden truncate text-lg font-semibold tracking-tight sm:inline">
            Photos
          </span>
        </Link>

        {/* DESKTOP SEARCH + FILTERS */}

        <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">

          {/* SEARCH */}

          <div className="relative min-w-0 max-w-2xl flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />

            <Input
              ref={desktopSearchRef}
              value={searchDraft}
              onChange={(event) =>
                setSearchDraft(
                  event.target.value,
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  commitSearchImmediately("");
                  event.currentTarget.blur();
                }
              }}
              placeholder="Search your photos..."
              className="h-10 border-border bg-card pl-9 pr-9 transition-shadow focus-visible:shadow-sm"
              aria-label="Search photos"
            />

            {searchDraft ? (
              <button
                type="button"
                onClick={() =>
                  commitSearchImmediately("")
                }
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:flex">
                ⌘K
              </kbd>
            )}
          </div>

          {/* SORT */}

          <select
            value={sort}
            onChange={(event) =>
              handleSortChange(
                event.target
                  .value as PhotoSort,
              )
            }
            className="h-10 rounded-md border border-input bg-card px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
            aria-label="Sort photos"
          >
            {SORT_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* TYPE FILTER */}

          <div
            className={`flex h-10 items-center gap-2 rounded-md border px-2.5 transition-colors ${
              type !== "all"
                ? "border-primary/40 bg-primary/5"
                : "border-input bg-card"
            }`}
          >
            <Filter
              className={`size-4 ${
                type !== "all"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
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
              className="bg-transparent text-sm outline-none"
              aria-label="Filter photos by type"
            >
              {TYPE_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* MOBILE ACTIONS */}

        <div className="ml-auto flex items-center gap-0.5 md:hidden">

          {/* MOBILE SEARCH */}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() =>
              setMobileSearchOpen(
                (open) => !open,
              )
            }
            className="relative"
            aria-label={
              mobileSearchOpen
                ? "Close search"
                : "Search photos"
            }
            title={
              mobileSearchOpen
                ? "Close search"
                : "Search photos"
            }
          >
            {mobileSearchOpen ? (
              <X className="size-5" />
            ) : (
              <Search className="size-5" />
            )}

            {!mobileSearchOpen &&
            hasActiveFilters ? (
              <span
                className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary"
                aria-hidden="true"
              />
            ) : null}
          </Button>

          <AccountMenu
            userName={userName}
            userEmail={user?.email}
            userInitials={userInitials}
            avatarUrl={avatarUrl}
            loggingOut={loggingOut}
            onFavorites={goToFavorites}
            onSettings={goToSettings}
            onTrash={goToTrash}
            onLogout={() =>
              void handleLogout()
            }
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Open account menu"
                title="Account menu"
              >
                <Avatar className="size-8">
                  {avatarUrl ? (
                    <AvatarImage
                      src={avatarUrl}
                      alt={userName}
                    />
                  ) : null}

                  <AvatarFallback className="text-xs font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            }
          />
        </div>

        {/* DESKTOP ACCOUNT */}

        <div className="hidden items-center gap-3 md:flex">

          <AccountMenu
            userName={userName}
            userEmail={user?.email}
            userInitials={userInitials}
            avatarUrl={avatarUrl}
            loggingOut={loggingOut}
            onFavorites={goToFavorites}
            onSettings={goToSettings}
            onTrash={goToTrash}
            onLogout={() =>
              void handleLogout()
            }
            trigger={
              <Button
                type="button"
                variant="ghost"
                className="gap-2 rounded-full pl-1.5 pr-2.5"
                aria-label="Open account menu"
              >
                <Avatar className="size-7">
                  {avatarUrl ? (
                    <AvatarImage
                      src={avatarUrl}
                      alt={userName}
                    />
                  ) : null}

                  <AvatarFallback className="text-xs font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>

                <span className="hidden max-w-32 truncate text-sm font-medium lg:inline">
                  {userName}
                </span>

                <ChevronDown className="size-4 text-muted-foreground" />
              </Button>
            }
          />
        </div>
      </div>

      {/* MOBILE SEARCH / FILTER TOOLBAR — animated height so the
          panel slides open/closed instead of popping in place. */}

      <div
        className={`grid overflow-hidden border-border transition-[grid-template-rows] duration-200 ease-out md:hidden ${
          mobileSearchOpen
            ? "grid-rows-[1fr] border-t"
            : "grid-rows-[0fr] border-t-0"
        }`}
      >
        <div className="min-h-0 px-3 py-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />

            <Input
              ref={mobileSearchRef}
              value={searchDraft}
              onChange={(event) =>
                setSearchDraft(
                  event.target.value,
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  commitSearchImmediately("");
                  setMobileSearchOpen(false);
                }
              }}
              placeholder="Search your photos..."
              className="h-10 pl-9 pr-9"
              aria-label="Search photos"
            />

            {searchDraft ? (
              <button
                type="button"
                onClick={() =>
                  commitSearchImmediately("")
                }
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="mt-2 flex gap-2">
            <select
              value={sort}
              onChange={(event) =>
                handleSortChange(
                  event.target
                    .value as PhotoSort,
                )
              }
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring/20"
              aria-label="Sort photos"
            >
              {SORT_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={type}
              onChange={(event) =>
                handleTypeChange(
                  event.target
                    .value as PhotoType,
                )
              }
              className={`h-9 min-w-0 flex-1 rounded-md border px-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring/20 ${
                type !== "all"
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-input bg-background"
              }`}
              aria-label="Filter photos by type"
            >
              {TYPE_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}

// --------------------------------------------------
// Shared account dropdown — used by both the mobile
// icon-only trigger and the desktop name+avatar trigger,
// so the menu only has to be built and maintained once.
// --------------------------------------------------

type AccountMenuProps = {
  trigger: React.ReactNode;
  userName: string;
  userEmail: string | null | undefined;
  userInitials: string;
  avatarUrl: string | null | undefined;
  loggingOut: boolean;
  onFavorites: () => void;
  onSettings: () => void;
  onTrash: () => void;
  onLogout: () => void;
};

function AccountMenu({
  trigger,
  userName,
  userEmail,
  loggingOut,
  onFavorites,
  onSettings,
  onTrash,
  onLogout,
}: AccountMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-60"
      >
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="truncate">
              {userName}
            </span>

            {userEmail ? (
              <span className="truncate text-xs font-normal text-muted-foreground">
                {userEmail}
              </span>
            ) : null}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onFavorites}>
          <Heart className="size-4" />
          Favorites
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onSettings}>
          <Settings className="size-4" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onTrash}>
          <Trash2 className="size-4" />
          Trash
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={onLogout}
          disabled={loggingOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="size-4" />
          {loggingOut ? "Logging out..." : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default Navbar;