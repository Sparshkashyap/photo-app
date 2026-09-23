import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";

import {
  ArrowLeft,
  Check,
  LogOut,
  Moon,
  Palette,
  Shield,
  Trash2,
  User,
  Images,
  LayoutGrid,
  Play,
  RotateCcw,
  Info,
} from "lucide-react";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { toast } from "sonner";

import { Navbar } from "@/components/Navbar";

import {
  MobileNav,
  Sidebar,
} from "@/components/Sidebar";

import { Button } from "@/components/ui/button";

import { useAuth } from "@/hooks/useAuth";

// ==================================================
// STORAGE
// ==================================================

const SETTINGS_KEY =
  "photo-app-settings";

type SettingsState = {
  compactGrid: boolean;
  confirmTrash: boolean;
  autoplayVideos: boolean;
  showFileNames: boolean;
  darkMode: boolean;
};

const DEFAULT_SETTINGS: SettingsState = {
  compactGrid: false,
  confirmTrash: true,
  autoplayVideos: false,
  showFileNames: true,
  darkMode: false,
};

// ==================================================
// ROUTE
// ==================================================

export const Route =
  createFileRoute("/settings")({
    component:
      SettingsPage,
  });

// ==================================================
// COMPONENT
// ==================================================

function SettingsPage() {
  const {
    user,
    logout,
  } = useAuth();

  const navigate =
    useNavigate();

  const [settings, setSettings] =
    useState<SettingsState>(
      DEFAULT_SETTINGS,
    );

  // --------------------------------------------------
  // LOAD SETTINGS
  // --------------------------------------------------

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          SETTINGS_KEY,
        );

      if (!saved) {
        return;
      }

      const parsed =
        JSON.parse(
          saved,
        ) as Partial<SettingsState>;

      setSettings({
        ...DEFAULT_SETTINGS,
        ...parsed,
      });
    } catch (error) {
      console.error(
        "Failed to load settings:",
        error,
      );
    }
  }, []);

  // --------------------------------------------------
  // APPLY DARK MODE
  // --------------------------------------------------

  useEffect(() => {
    const root =
      document.documentElement;

    if (settings.darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [
    settings.darkMode,
  ]);

  // --------------------------------------------------
  // SAVE SETTINGS
  // --------------------------------------------------

  function updateSetting<
    K extends keyof SettingsState,
  >(
    key: K,
    value: SettingsState[K],
  ) {
    const next = {
      ...settings,
      [key]: value,
    };

    setSettings(next);

    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(next),
    );

    toast.success(
      "Setting updated",
    );
  }

  // --------------------------------------------------
  // RESET SETTINGS
  // --------------------------------------------------

  function handleResetSettings() {
    const confirmed =
      window.confirm(
        "Reset all Photos settings to their default values?",
      );

    if (!confirmed) {
      return;
    }

    setSettings(
      DEFAULT_SETTINGS,
    );

    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(
        DEFAULT_SETTINGS,
      ),
    );

    document.documentElement.classList.remove(
      "dark",
    );

    toast.success(
      "Settings reset to default",
    );
  }

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

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

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <MobileNav />

      <div className="mx-auto flex w-full max-w-[1600px]">
        <Sidebar />

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto max-w-4xl">

            {/* ==========================================
                BACK
            ========================================== */}

            <button
              type="button"
              onClick={() =>
                void navigate({
                  to: "/dashboard",
                })
              }
              className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="size-4" />

              Back to Photos
            </button>

            {/* ==========================================
                HEADER
            ========================================== */}

            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Settings
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Manage your account and Photos experience.
              </p>
            </div>

            {/* ==========================================
                ACCOUNT
            ========================================== */}

            <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="border-b border-border p-5">
                <div className="flex items-center gap-3">

                  <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <User className="size-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold">
                      Account
                    </h2>

                    <p className="text-sm text-muted-foreground">
                      Your Photos account information
                    </p>
                  </div>

                </div>
              </div>

              <div className="space-y-4 p-5">

                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">
                    Name
                  </p>

                  <p className="mt-1 font-medium capitalize">
                    {user?.name ||
                      "Unknown"}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">
                    Email
                  </p>

                  <p className="mt-1 break-all font-medium">
                    {user?.email ||
                      "Unknown"}
                  </p>
                </div>

              </div>
            </section>

            {/* ==========================================
                APPEARANCE
            ========================================== */}

            <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">

              <div className="border-b border-border p-5">
                <div className="flex items-center gap-3">

                  <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Palette className="size-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold">
                      Appearance
                    </h2>

                    <p className="text-sm text-muted-foreground">
                      Customize how your gallery looks.
                    </p>
                  </div>

                </div>
              </div>

              <div className="divide-y divide-border">

                <SettingRow
                  icon={
                    <Moon className="size-5" />
                  }
                  title="Dark mode"
                  description="Use a darker interface for your Photos library."
                  checked={
                    settings.darkMode
                  }
                  onChange={(
                    checked,
                  ) =>
                    updateSetting(
                      "darkMode",
                      checked,
                    )
                  }
                />

                <SettingRow
                  icon={
                    <LayoutGrid className="size-5" />
                  }
                  title="Compact photo grid"
                  description="Show more photos on the screen at once."
                  checked={
                    settings.compactGrid
                  }
                  onChange={(
                    checked,
                  ) =>
                    updateSetting(
                      "compactGrid",
                      checked,
                    )
                  }
                />

                <SettingRow
                  icon={
                    <User className="size-5" />
                  }
                  title="Show file names"
                  description="Display photo names below gallery items."
                  checked={
                    settings.showFileNames
                  }
                  onChange={(
                    checked,
                  ) =>
                    updateSetting(
                      "showFileNames",
                      checked,
                    )
                  }
                />

              </div>
            </section>

            {/* ==========================================
                GALLERY
            ========================================== */}

            <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">

              <div className="border-b border-border p-5">
                <div className="flex items-center gap-3">

                  <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Images className="size-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold">
                      Gallery
                    </h2>

                    <p className="text-sm text-muted-foreground">
                      Control photo and video behaviour.
                    </p>
                  </div>

                </div>
              </div>

              <div className="divide-y divide-border">

                <SettingRow
                  icon={
                    <Play className="size-5" />
                  }
                  title="Autoplay videos"
                  description="Automatically play videos while browsing."
                  checked={
                    settings.autoplayVideos
                  }
                  onChange={(
                    checked,
                  ) =>
                    updateSetting(
                      "autoplayVideos",
                      checked,
                    )
                  }
                />

                <SettingRow
                  icon={
                    <Shield className="size-5" />
                  }
                  title="Confirm before moving to Trash"
                  description="Ask for confirmation before deleting a photo."
                  checked={
                    settings.confirmTrash
                  }
                  onChange={(
                    checked,
                  ) =>
                    updateSetting(
                      "confirmTrash",
                      checked,
                    )
                  }
                />

              </div>
            </section>

            {/* ==========================================
                TRASH
            ========================================== */}

            <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">

              <div className="border-b border-border p-5">
                <div className="flex items-center gap-3">

                  <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                    <Trash2 className="size-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold">
                      Trash
                    </h2>

                    <p className="text-sm text-muted-foreground">
                      Manage photos that you moved to Trash.
                    </p>
                  </div>

                </div>
              </div>

              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="font-medium">
                    Deleted photos
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Restore or permanently delete your trashed photos.
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={() =>
                    void navigate({
                      to: "/trash",
                    })
                  }
                >
                  <Trash2 className="size-4" />

                  Open Trash
                </Button>

              </div>
            </section>

            {/* ==========================================
                PREFERENCES RESET
            ========================================== */}

            <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">

              <div className="border-b border-border p-5">
                <div className="flex items-center gap-3">

                  <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <RotateCcw className="size-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold">
                      Preferences
                    </h2>

                    <p className="text-sm text-muted-foreground">
                      Reset local Photos preferences.
                    </p>
                  </div>

                </div>
              </div>

              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="font-medium">
                    Reset settings
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Restore appearance and gallery preferences to their defaults.
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={
                    handleResetSettings
                  }
                >
                  <RotateCcw className="size-4" />

                  Reset
                </Button>

              </div>
            </section>

            {/* ==========================================
                ABOUT
            ========================================== */}

            <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">

              <div className="border-b border-border p-5">
                <div className="flex items-center gap-3">

                  <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Info className="size-5" />
                  </div>

                  <div>
                    <h2 className="font-semibold">
                      About
                    </h2>

                    <p className="text-sm text-muted-foreground">
                      Information about this Photos application.
                    </p>
                  </div>

                </div>
              </div>

              <div className="space-y-3 p-5">

                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4">
                  <span className="text-sm text-muted-foreground">
                    Application
                  </span>

                  <span className="text-sm font-medium">
                    Photo App
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4">
                  <span className="text-sm text-muted-foreground">
                    Storage
                  </span>

                  <span className="text-sm font-medium">
                    AWS S3
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4">
                  <span className="text-sm text-muted-foreground">
                    Database
                  </span>

                  <span className="text-sm font-medium">
                    DynamoDB
                  </span>
                </div>

              </div>
            </section>

            {/* ==========================================
                LOGOUT
            ========================================== */}

            <section className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/5 p-5">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h2 className="font-semibold">
                    Sign out
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Sign out of this Photos account on this device.
                  </p>
                </div>

                <Button
                  variant="destructive"
                  onClick={
                    handleLogout
                  }
                >
                  <LogOut className="size-4" />

                  Log out
                </Button>

              </div>

            </section>

          </div>
        </main>
      </div>
    </div>
  );
}

// ==================================================
// SETTING ROW
// ==================================================

function SettingRow({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (
    checked: boolean,
  ) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-5 transition hover:bg-muted/30">

      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        {icon}
      </div>

      <div className="min-w-0 flex-1">

        <p className="font-medium">
          {title}
        </p>

        <p className="mt-0.5 text-sm text-muted-foreground">
          {description}
        </p>

      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() =>
          onChange(!checked)
        }
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          checked
            ? "bg-primary"
            : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform ${
            checked
              ? "translate-x-5"
              : "translate-x-0.5"
          }`}
        >
          {checked ? (
            <Check className="size-3.5 translate-x-[3px] translate-y-[3px] text-primary" />
          ) : null}
        </span>
      </button>

    </div>
  );
}