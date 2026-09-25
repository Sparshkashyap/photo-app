// import {
//   useEffect,
//   useState,
// } from "react";

// import {
//   useNavigate,
// } from "@tanstack/react-router";

// import {
//   ChevronDown,
//   Filter,
//   LogOut,
//   Search,
//   Settings,
//   Trash2,
//   X,
// } from "lucide-react";

// import { toast } from "sonner";

// import { Logo } from "@/components/Logo";

// import {
//   Avatar,
//   AvatarFallback,
// } from "@/components/ui/avatar";

// import { Button } from "@/components/ui/button";

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";

// import { Input } from "@/components/ui/input";

// import { useAuth } from "@/hooks/useAuth";

// import type {
//   PhotoSort,
//   PhotoType,
// } from "@/services/api";

// function initials(
//   name: string,
// ): string {
//   return name
//     .split(" ")
//     .filter(Boolean)
//     .slice(0, 2)
//     .map(
//       (part) =>
//         part[0]!.toUpperCase(),
//     )
//     .join("");
// }

// type NavbarProps = {
//   search?: string;

//   sort?: PhotoSort;

//   type?: PhotoType;

//   onSearchChange?: (
//     value: string,
//   ) => void;

//   onSortChange?: (
//     value: PhotoSort,
//   ) => void;

//   onTypeChange?: (
//     value: PhotoType,
//   ) => void;
// };

// export function Navbar({
//   search: controlledSearch,
//   sort: controlledSort,
//   type: controlledType,
//   onSearchChange,
//   onSortChange,
//   onTypeChange,
// }: NavbarProps) {
//   const {
//     user,
//     logout,
//   } = useAuth();

//   const navigate =
//     useNavigate();

//   // --------------------------------------------------
//   // Local fallback state
//   // --------------------------------------------------

//   const [
//     localSearch,
//     setLocalSearch,
//   ] = useState("");

//   const [
//     localSort,
//     setLocalSort,
//   ] = useState<PhotoSort>(
//     "newest",
//   );

//   const [
//     localType,
//     setLocalType,
//   ] = useState<PhotoType>(
//     "all",
//   );

//   const search =
//     controlledSearch ??
//     localSearch;

//   const sort =
//     controlledSort ??
//     localSort;

//   const type =
//     controlledType ??
//     localType;

//   // --------------------------------------------------
//   // Mobile toolbar
//   // --------------------------------------------------

//   const [
//     mobileSearchOpen,
//     setMobileSearchOpen,
//   ] = useState(false);

//   // --------------------------------------------------
//   // Handlers
//   // --------------------------------------------------

//   function handleSearchChange(
//     value: string,
//   ) {
//     if (onSearchChange) {
//       onSearchChange(value);
//     } else {
//       setLocalSearch(value);
//     }
//   }

//   function handleSortChange(
//     value: PhotoSort,
//   ) {
//     if (onSortChange) {
//       onSortChange(value);
//     } else {
//       setLocalSort(value);
//     }
//   }

//   function handleTypeChange(
//     value: PhotoType,
//   ) {
//     if (onTypeChange) {
//       onTypeChange(value);
//     } else {
//       setLocalType(value);
//     }
//   }

//   function handleLogout() {
//     logout();

//     toast.success(
//       "You're logged out",
//     );

//     void navigate({
//       to: "/login",
//       replace: true,
//     });
//   }

//   function goToSettings() {
//     void navigate({
//       to: "/settings",
//     });
//   }

//   function goToTrash() {
//     void navigate({
//       to: "/trash",
//     });
//   }

//   const userName =
//     user?.name ||
//     "User";

//   const userInitials =
//     initials(userName) ||
//     "U";

//   return (
//     <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
//       <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6">

//         {/* LOGO */}

//         <Logo />

//         {/* DESKTOP TOOLBAR */}

//         <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">

//           {/* SEARCH */}

//           <div className="relative min-w-0 flex-1 max-w-2xl">
//             <Search
//               className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
//               aria-hidden="true"
//             />

//             <Input
//               value={search}
//               onChange={(event) =>
//                 handleSearchChange(
//                   event.target.value,
//                 )
//               }
//               placeholder="Search your photos..."
//               className="h-10 border-border bg-card pl-9 pr-9"
//               aria-label="Search photos"
//             />

//             {search ? (
//               <button
//                 type="button"
//                 onClick={() =>
//                   handleSearchChange("")
//                 }
//                 className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
//                 aria-label="Clear search"
//               >
//                 <X className="size-4" />
//               </button>
//             ) : null}
//           </div>

//           {/* SORT */}

//           <select
//             value={sort}
//             onChange={(event) =>
//               handleSortChange(
//                 event.target
//                   .value as PhotoSort,
//               )
//             }
//             className="h-10 rounded-md border border-input bg-card px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
//             aria-label="Sort photos"
//           >
//             <option value="newest">
//               Newest
//             </option>

//             <option value="oldest">
//               Oldest
//             </option>

//             <option value="name_asc">
//               Name: A → Z
//             </option>

//             <option value="name_desc">
//               Name: Z → A
//             </option>
//           </select>

//           {/* TYPE FILTER */}

//           <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-card px-2.5">
//             <Filter
//               className="size-4 text-muted-foreground"
//               aria-hidden="true"
//             />

//             <select
//               value={type}
//               onChange={(event) =>
//                 handleTypeChange(
//                   event.target
//                     .value as PhotoType,
//                 )
//               }
//               className="bg-transparent text-sm outline-none"
//               aria-label="Filter photos by type"
//             >
//               <option value="all">
//                 All
//               </option>

//               <option value="image">
//                 Images
//               </option>

//               <option value="video">
//                 Videos
//               </option>
//             </select>
//           </div>
//         </div>

//         {/* MOBILE SEARCH BUTTON */}

//         <div className="ml-auto flex items-center gap-1 md:hidden">
//           <Button
//             variant="ghost"
//             size="icon"
//             onClick={() =>
//               setMobileSearchOpen(
//                 (open) => !open,
//               )
//             }
//             aria-label="Search photos"
//           >
//             <Search className="size-5" />
//           </Button>
//         </div>

//         {/* ACCOUNT */}

//         <DropdownMenu>
//           <DropdownMenuTrigger
//             asChild
//           >
//             <Button
//               variant="ghost"
//               className="gap-2 rounded-full px-2"
//               aria-label="Open account menu"
//             >
//               <Avatar className="size-8">
//                 <AvatarFallback className="text-xs font-semibold">
//                   {userInitials}
//                 </AvatarFallback>
//               </Avatar>

//               <span className="hidden max-w-32 truncate text-sm font-medium lg:inline">
//                 {userName}
//               </span>

//               <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
//             </Button>
//           </DropdownMenuTrigger>

//           <DropdownMenuContent
//             align="end"
//             className="w-56"
//           >
//             <DropdownMenuLabel>
//               <div className="flex flex-col">
//                 <span className="truncate">
//                   {userName}
//                 </span>

//                 {user?.email ? (
//                   <span className="truncate text-xs font-normal text-muted-foreground">
//                     {user.email}
//                   </span>
//                 ) : null}
//               </div>
//             </DropdownMenuLabel>

//             <DropdownMenuSeparator />

//             <DropdownMenuItem
//               onClick={
//                 goToSettings
//               }
//             >
//               <Settings className="size-4" />

//               Settings
//             </DropdownMenuItem>

//             <DropdownMenuItem
//               onClick={goToTrash}
//             >
//               <Trash2 className="size-4" />

//               Trash
//             </DropdownMenuItem>

//             <DropdownMenuSeparator />

//             <DropdownMenuItem
//               onClick={
//                 handleLogout
//               }
//               className="text-destructive focus:text-destructive"
//             >
//               <LogOut className="size-4" />

//               Log out
//             </DropdownMenuItem>
//           </DropdownMenuContent>
//         </DropdownMenu>
//       </div>

//       {/* MOBILE TOOLBAR */}

//       {mobileSearchOpen ? (
//         <div className="border-t border-border px-4 py-3 md:hidden">
//           <div className="relative">
//             <Search
//               className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
//               aria-hidden="true"
//             />

//             <Input
//               autoFocus
//               value={search}
//               onChange={(event) =>
//                 handleSearchChange(
//                   event.target.value,
//                 )
//               }
//               placeholder="Search your photos..."
//               className="h-10 pl-9 pr-9"
//               aria-label="Search photos"
//             />

//             {search ? (
//               <button
//                 type="button"
//                 onClick={() =>
//                   handleSearchChange("")
//                 }
//                 className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
//                 aria-label="Clear search"
//               >
//                 <X className="size-4" />
//               </button>
//             ) : null}
//           </div>

//           <div className="mt-2 flex gap-2">
//             <select
//               value={sort}
//               onChange={(event) =>
//                 handleSortChange(
//                   event.target
//                     .value as PhotoSort,
//                 )
//               }
//               className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none"
//               aria-label="Sort photos"
//             >
//               <option value="newest">
//                 Newest
//               </option>

//               <option value="oldest">
//                 Oldest
//               </option>

//               <option value="name_asc">
//                 Name: A → Z
//               </option>

//               <option value="name_desc">
//                 Name: Z → A
//               </option>
//             </select>

//             <select
//               value={type}
//               onChange={(event) =>
//                 handleTypeChange(
//                   event.target
//                     .value as PhotoType,
//                 )
//               }
//               className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none"
//               aria-label="Filter photos by type"
//             >
//               <option value="all">
//                 All
//               </option>

//               <option value="image">
//                 Images
//               </option>

//               <option value="video">
//                 Videos
//               </option>
//             </select>
//           </div>
//         </div>
//       ) : null}
//     </header>
//   );
// }

// export default Navbar;

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

  const search =
    controlledSearch ??
    localSearch;

  const sort =
    controlledSort ??
    localSort;

  const type =
    controlledType ??
    localType;

  function handleSearchChange(
    value: string,
  ) {
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setLocalSearch(value);
    }
  }

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

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center gap-2 px-3 sm:px-5">

        {/* MOBILE MENU / SIDEBAR TRIGGER */}

        <div className="flex md:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              if (onMobileMenuClick) {
                onMobileMenuClick();
              }
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
          className="flex min-w-0 items-center gap-2.5"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-sm font-bold">
              P
            </span>
          </div>

          <span className="truncate text-lg font-semibold tracking-tight">
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
              value={search}
              onChange={(event) =>
                handleSearchChange(
                  event.target.value,
                )
              }
              placeholder="Search your photos..."
              className="h-10 border-border bg-card pl-9 pr-9"
              aria-label="Search photos"
            />

            {search ? (
              <button
                type="button"
                onClick={() =>
                  handleSearchChange("")
                }
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
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
            className="h-10 rounded-md border border-input bg-card px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            aria-label="Sort photos"
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

          {/* TYPE FILTER */}

          <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-card px-2.5">
            <Filter
              className="size-4 text-muted-foreground"
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
          </Button>

          {/* MOBILE ACCOUNT MENU */}

          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Open account menu"
                title="Account menu"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
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

                  {user?.email ? (
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {user.email}
                    </span>
                  ) : null}
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={goToFavorites}
              >
                <Heart className="size-4" />

                Favorites
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={goToSettings}
              >
                <Settings className="size-4" />

                Settings
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={goToTrash}
              >
                <Trash2 className="size-4" />

                Trash
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() =>
                  void handleLogout()
                }
                disabled={loggingOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="size-4" />

                {loggingOut
                  ? "Logging out..."
                  : "Log out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* DESKTOP ACCOUNT */}

        <div className="hidden items-center gap-3 md:flex">

          <div className="hidden items-center gap-2 lg:flex">
            <Avatar className="size-8">
              <AvatarFallback>
                {userInitials}
              </AvatarFallback>
            </Avatar>

            <div className="max-w-48">
              <p className="truncate text-sm font-medium">
                {userName}
              </p>

              <p className="truncate text-xs text-muted-foreground">
                {user?.email || ""}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
            >
              <Button
                type="button"
                variant="ghost"
                className="gap-2 rounded-full px-2"
                aria-label="Open account menu"
              >
                <Avatar className="size-8 lg:hidden">
                  <AvatarFallback className="text-xs font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>

                <span className="hidden max-w-32 truncate text-sm font-medium xl:inline">
                  {userName}
                </span>

                <ChevronDown className="size-4 text-muted-foreground" />
              </Button>
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

                  {user?.email ? (
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {user.email}
                    </span>
                  ) : null}
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={goToFavorites}
              >
                <Heart className="size-4" />

                Favorites
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={goToSettings}
              >
                <User className="size-4" />

                Account / Settings
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={goToTrash}
              >
                <Trash2 className="size-4" />

                Trash
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() =>
                  void handleLogout()
                }
                disabled={loggingOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="size-4" />

                {loggingOut
                  ? "Logging out..."
                  : "Log out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* MOBILE SEARCH / FILTER TOOLBAR */}

      {mobileSearchOpen ? (
        <div className="border-t border-border px-3 py-3 md:hidden">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />

            <Input
              autoFocus
              value={search}
              onChange={(event) =>
                handleSearchChange(
                  event.target.value,
                )
              }
              placeholder="Search your photos..."
              className="h-10 pl-9 pr-9"
              aria-label="Search photos"
            />

            {search ? (
              <button
                type="button"
                onClick={() =>
                  handleSearchChange("")
                }
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="mt-2 flex gap-2">

            {/* MOBILE SORT */}

            <select
              value={sort}
              onChange={(event) =>
                handleSortChange(
                  event.target
                    .value as PhotoSort,
                )
              }
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none"
              aria-label="Sort photos"
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

            {/* MOBILE TYPE FILTER */}

            <select
              value={type}
              onChange={(event) =>
                handleTypeChange(
                  event.target
                    .value as PhotoType,
                )
              }
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none"
              aria-label="Filter photos by type"
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
      ) : null}
    </header>
  );
}

export default Navbar;