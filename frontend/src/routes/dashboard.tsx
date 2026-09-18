import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";

import {
  Filter,
  Plus,
  Search,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { Navbar } from "@/components/Navbar";
import { PhotoGallery } from "@/components/PhotoGallery";
import {
  MobileNav,
  Sidebar,
} from "@/components/Sidebar";
import { UploadPhoto } from "@/components/UploadPhoto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useAuth } from "@/hooks/useAuth";

import {
  getPhotos,
  type PhotoSort,
  type PhotoType,
} from "@/services/api";

import type { Photo } from "@/types/photo";

export const Route =
  createFileRoute("/dashboard")({
    head: () => ({
      meta: [
        {
          title: "Your photos — Photos",
        },
        {
          name: "description",
          content:
            "Browse your photo library, upload new photos and download originals.",
        },
        {
          property: "og:title",
          content:
            "Your photos — Photos",
        },
        {
          property: "og:description",
          content:
            "Browse your photo library, upload new photos and download originals.",
        },
        {
          property: "og:type",
          content: "website",
        },
        {
          name: "twitter:card",
          content:
            "summary_large_image",
        },
      ],
    }),

    component: DashboardPage,
  });

function DashboardPage() {
  const {
    user,
    isAuthenticated,
    ready,
  } = useAuth();

  const navigate =
    useNavigate();

  // --------------------------------------------------
  // Photo State
  // --------------------------------------------------

  const [photos, setPhotos] =
    useState<Photo[]>([]);

  const [
    loadingPhotos,
    setLoadingPhotos,
  ] = useState(true);

  // --------------------------------------------------
  // Upload State
  // --------------------------------------------------

  const [
    uploadOpen,
    setUploadOpen,
  ] = useState(false);

  // --------------------------------------------------
  // Phase 2 Search / Sort / Filter
  // --------------------------------------------------

  const [search, setSearch] =
    useState("");

  const [sort, setSort] =
    useState<PhotoSort>(
      "newest",
    );

  const [type, setType] =
    useState<PhotoType>("all");

  // --------------------------------------------------
  // Load Photos
  // --------------------------------------------------

  const loadPhotos =
    useCallback(async () => {
      if (!isAuthenticated) {
        return;
      }

      try {
        setLoadingPhotos(true);

        const response =
          await getPhotos({
            search,
            sort,
            type,
          });

        const mappedPhotos: Photo[] =
          response.photos.map(
            (photo) => {
              const displayName =
                photo.name ||
                photo.fileName ||
                photo.originalFileName ||
                "Untitled photo";

              return {
                id: photo.photoId,

                photoId:
                  photo.photoId,

                key: photo.s3Key,

                name: displayName,

                originalFileName:
                  photo.originalFileName ||
                  photo.fileName ||
                  displayName,

                fileName:
                  photo.fileName ||
                  photo.originalFileName ||
                  displayName,

                url:
                  photo.downloadUrl ||
                  photo.url ||
                  "",

                contentType:
                  photo.contentType,

                fileSize:
                  photo.fileSize,

                uploadedAt:
                  photo.createdAt ??
                  new Date().toISOString(),

                createdAt:
                  photo.createdAt ??
                  new Date().toISOString(),

                updatedAt:
                  photo.updatedAt ??
                  photo.createdAt ??
                  new Date().toISOString(),
              };
            },
          );

        setPhotos(
          mappedPhotos,
        );
      } catch (error) {
        console.error(
          "Failed to load photos:",
          error,
        );

        setPhotos([]);
      } finally {
        setLoadingPhotos(false);
      }
    }, [
      isAuthenticated,
      search,
      sort,
      type,
    ]);

  // --------------------------------------------------
  // Authentication
  // --------------------------------------------------

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!isAuthenticated) {
      void navigate({
        to: "/login",
        replace: true,
      });
    }
  }, [
    ready,
    isAuthenticated,
    navigate,
  ]);

  // --------------------------------------------------
  // Initial Load + Search Debounce
  // --------------------------------------------------

  useEffect(() => {
    if (
      !ready ||
      !isAuthenticated
    ) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        void loadPhotos();
      }, 400);

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    ready,
    isAuthenticated,
    loadPhotos,
  ]);

  // --------------------------------------------------
  // Loading / Authentication State
  // --------------------------------------------------

  if (
    !ready ||
    !isAuthenticated
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span
          className="size-6 animate-spin rounded-full border-2 border-border border-t-primary"
          aria-hidden="true"
        />

        <span className="sr-only">
          Loading your library
        </span>
      </div>
    );
  }

  const firstName =
    user?.name?.split(
      " ",
    )[0] ?? "there";

  // --------------------------------------------------
  // Dashboard
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <Navbar />

      {/* Mobile Navigation */}
      <MobileNav />

      <div className="mx-auto flex w-full max-w-[1600px]">
        {/* Desktop Sidebar */}
        <Sidebar />

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {/* -------------------------------------------------- */}
          {/* Dashboard Header */}
          {/* -------------------------------------------------- */}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold capitalize sm:text-3xl">
                Welcome back,{" "}
                {firstName}
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                {loadingPhotos
                  ? "Loading your photos..."
                  : search.trim()
                    ? `${photos.length} result${
                        photos.length ===
                        1
                          ? ""
                          : "s"
                      } found`
                    : photos.length >
                        0
                      ? `${photos.length} photo${
                          photos.length ===
                          1
                            ? ""
                            : "s"
                        } in your library`
                      : "Your library is ready for its first memory."}
              </p>
            </div>

            {/* Upload Button */}
            <Button
              className="w-full sm:w-auto"
              onClick={() =>
                setUploadOpen(
                  true,
                )
              }
            >
              <Plus
                className="size-4"
                aria-hidden="true"
              />

              Upload photo
            </Button>
          </div>

          {/* -------------------------------------------------- */}
          {/* Phase 2 Search / Sort / Filter */}
          {/* -------------------------------------------------- */}

          <section
            className="mt-8"
            aria-label="Photo search and filters"
          >
            <div className="flex flex-col gap-3 lg:flex-row">
              {/* Search */}
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />

                <Input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Search photos by name or filename..."
                  className="pl-9"
                  aria-label="Search photos"
                />
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="photo-sort"
                  className="sr-only"
                >
                  Sort photos
                </label>

                <select
                  id="photo-sort"
                  value={sort}
                  onChange={(event) =>
                    setSort(
                      event.target
                        .value as PhotoSort,
                    )
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 sm:w-[180px]"
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
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <Filter
                  className="hidden size-4 text-muted-foreground sm:block"
                  aria-hidden="true"
                />

                <label
                  htmlFor="photo-type"
                  className="sr-only"
                >
                  Filter photos by type
                </label>

                <select
                  id="photo-type"
                  value={type}
                  onChange={(event) =>
                    setType(
                      event.target
                        .value as PhotoType,
                    )
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 sm:w-[150px]"
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

            {/* Active Search */}
            {search.trim() && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Searching for:
                </span>

                <span className="font-medium text-foreground">
                  "{search.trim()}"
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="text-primary hover:underline"
                >
                  Clear
                </button>
              </div>
            )}
          </section>

          {/* -------------------------------------------------- */}
          {/* Gallery Heading */}
          {/* -------------------------------------------------- */}

          <div className="mt-8 mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {search.trim()
                ? "Search results"
                : "Your photos"}
            </h2>

            {!loadingPhotos && (
              <span className="text-xs text-muted-foreground">
                {photos.length}{" "}
                {photos.length ===
                1
                  ? "item"
                  : "items"}
              </span>
            )}
          </div>

          {/* -------------------------------------------------- */}
          {/* Photo Gallery */}
          {/* -------------------------------------------------- */}

          <PhotoGallery
            photos={photos}
            loading={loadingPhotos}
            onUploadClick={() =>
              setUploadOpen(
                true,
              )
            }
            onRenamed={(photo) => {
              setPhotos(
                (previous) =>
                  previous.map(
                    (current) =>
                      current.id ===
                      photo.id
                        ? photo
                        : current,
                  ),
              );

              /*
               * Reload after rename so that
               * server-side search/sorting
               * remains correct.
               */
              void loadPhotos();
            }}
          />

          {/* -------------------------------------------------- */}
          {/* No Search Results */}
          {/* -------------------------------------------------- */}

          {!loadingPhotos &&
            search.trim() &&
            photos.length === 0 && (
              <div className="mt-4 rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
                <Search
                  className="mx-auto size-8 text-muted-foreground"
                  aria-hidden="true"
                />

                <h3 className="mt-4 text-base font-semibold">
                  No photos found
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  No photos match "
                  {search.trim()}"
                </p>

                <Button
                  variant="outline"
                  className="mt-5"
                  onClick={() =>
                    setSearch("")
                  }
                >
                  Clear search
                </Button>
              </div>
            )}
        </main>
      </div>

      {/* -------------------------------------------------- */}
      {/* Upload Dialog */}
      {/* -------------------------------------------------- */}

      <UploadPhoto
        open={uploadOpen}
        onOpenChange={
          setUploadOpen
        }
        onUploaded={() => {
          /*
           * Don't blindly prepend the new
           * photo here.
           *
           * Why?
           *
           * If user is searching/filtering,
           * the new photo may not belong
           * in the current result set.
           *
           * Reload from backend instead.
           */
          void loadPhotos();
        }}
      />
    </div>
  );
}