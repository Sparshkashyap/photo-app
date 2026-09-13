import { useNavigate } from "@tanstack/react-router";
import { LogOut, Search } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    toast.success("You're logged out");
    void navigate({ to: "/login", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-4 px-4 sm:px-6">
        <Logo />

        <div className="mx-auto hidden w-full max-w-md md:block">
          <div
            aria-hidden="true"
            className="flex h-10 items-center gap-2 rounded-full border border-border bg-surface-muted px-4 text-sm text-muted-foreground/70"
          >
            <Search className="size-4" />
            <span>Search is coming soon</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-sm transition hover:bg-secondary"
                aria-label="Account menu"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                    {user ? initials(user.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[10rem] truncate font-medium capitalize sm:inline">
                  {user?.name}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="space-y-0.5">
                <span className="block truncate capitalize">{user?.name}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">
                  {user?.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout}>
                <LogOut className="size-4" aria-hidden="true" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="hidden lg:inline-flex"
            onClick={handleLogout}
          >
            <LogOut className="size-4" aria-hidden="true" />
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
