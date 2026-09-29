import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { FolderPlus, Loader2, Plus, Search, SlidersHorizontal, X } from "lucide-react";

import { useCallback, useEffect, useState } from "react";

import { Navbar } from "@/components/Navbar";
import { MobileNav, Sidebar } from "@/components/Sidebar";
import { UploadPhoto } from "@/components/UploadPhoto";
import { CreateFolderDialog } from "@/components/CreateFolderDialog";
import { FolderTree } from "@/components/FolderTree";
import { PhotoGallery } from "@/components/PhotoGallery";

import { Button } from "@/components/ui/button";

import { useAuth } from "@/hooks/useAuth";

import { getFolders, getPhotos, type PhotoSort, type PhotoType } from "@/services/api";

import type { Folder } from "@/types/folder";
import type { Photo } from "@/types/photo";

const SORT_LABELS: Record<PhotoSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  name_asc: "Name: A → Z",
  name_desc: "Name: Z → A",
};

const TYPE_LABELS: Record<PhotoType, string> = {
  all: "All types",
  image: "Images only",
  video: "Videos only",
  audio: "Audio only",
};

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      {
        title: "Your media — Photos",
      },
      {
        name: "description",
        content:
          "Browse your media library, organize folders, upload photos, videos and audio files.",
      },
    ],
  }),

  component: DashboardPage,
});

function DashboardPage() {
  const { user, isAuthenticated, ready } = useAuth();

  const navigate = useNavigate();

  // ==================================================
  // PHOTOS / MEDIA
  // ==================================================

  const [photos, setPhotos] = useState<Photo[]>([]);

  const [loadingPhotos, setLoadingPhotos] = useState(true);

  const [photoError, setPhotoError] = useState<string | undefined>();

  // ==================================================
  // FOLDERS
  // ==================================================

  const [folders, setFolders] = useState<Folder[]>([]);

  const [loadingFolders, setLoadingFolders] = useState(true);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const [createFolderOpen, setCreateFolderOpen] = useState(false);

  // ==================================================
  // UPLOAD
  // ==================================================

  const [uploadOpen, setUploadOpen] = useState(false);

  // ==================================================
  // SEARCH / SORT / FILTER
  // ==================================================

  const [search, setSearch] = useState("");

  const [sort, setSort] = useState<PhotoSort>("newest");

  const [type, setType] = useState<PhotoType>("all");

  const hasNonDefaultFilters = sort !== "newest" || type !== "all";

  function clearFilters() {
    setSort("newest");
    setType("all");
  }

  // ==================================================
  // AUTH REDIRECT
  // ==================================================

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
  }, [ready, isAuthenticated, navigate]);

  // ==================================================
  // LOAD FOLDERS
  // ==================================================

  const loadFolders = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      setLoadingFolders(true);

      const response = await getFolders();

      setFolders(response.folders ?? []);
    } catch (error) {
      console.error("Failed to load folders:", error);

      setFolders([]);
    } finally {
      setLoadingFolders(false);
    }
  }, [isAuthenticated]);

  // ==================================================
  // LOAD PHOTOS / MEDIA
  // ==================================================

  const loadPhotos = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      setLoadingPhotos(true);
      setPhotoError(undefined);

      const trimmedSearch = search.trim();

      const response = await getPhotos({
        ...(trimmedSearch
          ? {
              search: trimmedSearch,
            }
          : {}),

        sort,

        type,

        ...(selectedFolderId
          ? {
              folderId: selectedFolderId,
            }
          : {}),
      });

      const mappedPhotos: Photo[] = (response.photos ?? []).map((photo) => ({
        id: photo.photoId,

        photoId: photo.photoId,

        userId: photo.userId,

        key: photo.s3Key,

        s3Key: photo.s3Key,

        name: photo.name || photo.fileName || photo.originalFileName || "Untitled media",

        originalFileName: photo.originalFileName || photo.fileName || "media",

        fileName: photo.fileName || photo.originalFileName || "media",

        contentType: photo.contentType || "image/jpeg",

        fileSize: photo.fileSize ?? 0,

        url: photo.downloadUrl || photo.url || "",

        downloadUrl: photo.downloadUrl || photo.url || "",

        folderId: photo.folderId ?? null,

        isTrashed: photo.isTrashed ?? false,

        trashedAt: photo.trashedAt ?? null,

        uploadedAt: photo.createdAt,

        createdAt: photo.createdAt,

        updatedAt: photo.updatedAt ?? photo.createdAt,
      }));

      setPhotos(mappedPhotos);
    } catch (error) {
      console.error("Failed to load photos:", error);

      setPhotos([]);

      setPhotoError(
        error instanceof Error ? error.message : "Unable to load media. Please try again.",
      );
    } finally {
      setLoadingPhotos(false);
    }
  }, [isAuthenticated, search, sort, type, selectedFolderId]);

  // ==================================================
  // INITIAL FOLDER LOAD
  // ==================================================

  useEffect(() => {
    if (!ready || !isAuthenticated) {
      return;
    }

    void loadFolders();
  }, [ready, isAuthenticated, loadFolders]);

  // ==================================================
  // MEDIA LOAD WITH DEBOUNCE
  // ==================================================

  useEffect(() => {
    if (!ready || !isAuthenticated) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadPhotos();
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [ready, isAuthenticated, loadPhotos]);

  // ==================================================
  // FOLDER CREATED
  // ==================================================

  async function handleFolderCreated(folder?: Folder) {
    if (folder) {
      setFolders((previous) => {
        const exists = previous.some((item) => item.folderId === folder.folderId);

        if (exists) {
          return previous.map((item) => (item.folderId === folder.folderId ? folder : item));
        }

        return [...previous, folder];
      });

      return;
    }

    await loadFolders();
  }

  // ==================================================
  // FOLDER SELECT
  // ==================================================

  function handleFolderSelect(folderId: string | null) {
    setSelectedFolderId(folderId);

    setSearch("");
  }

  // ==================================================
  // PHOTO RENAMED
  // ==================================================

  function handlePhotoRenamed(updatedPhoto: Photo) {
    setPhotos((previous) =>
      previous.map((photo) =>
        photo.photoId === updatedPhoto.photoId
          ? {
              ...photo,
              ...updatedPhoto,
            }
          : photo,
      ),
    );
  }

  // ==================================================
  // PHOTO MOVED
  // ==================================================

  function handlePhotoMoved(photo: Photo, folderId: string | null) {
    if (selectedFolderId !== null && folderId !== selectedFolderId) {
      setPhotos((previous) => previous.filter((item) => item.photoId !== photo.photoId));

      return;
    }

    if (selectedFolderId === null && folderId !== null) {
      setPhotos((previous) => previous.filter((item) => item.photoId !== photo.photoId));

      return;
    }

    void loadPhotos();
  }

  // ==================================================
  // PHOTO FAVORITE
  // ==================================================

  function handlePhotoFavorite(updatedPhoto: Photo) {
    setPhotos((previous) =>
      previous.map((item) =>
        item.photoId === updatedPhoto.photoId
          ? {
              ...item,
              ...updatedPhoto,
            }
          : item,
      ),
    );
  }

  // ==================================================
  // PHOTO TRASHED
  // ==================================================

  function handlePhotoTrashed(photo: Photo) {
    setPhotos((previous) => previous.filter((item) => item.photoId !== photo.photoId));
  }

  // ==================================================
  // UPLOAD COMPLETED
  // ==================================================

  function handleUploadCompleted(uploadedPhoto?: Photo) {
    /*
     * Add the newly uploaded item immediately
     * when it belongs to the current view.
     *
     * The API reload below remains the source
     * of truth, so DynamoDB/S3 state stays synced.
     */

    if (
      uploadedPhoto &&
      (selectedFolderId === null || uploadedPhoto.folderId === selectedFolderId)
    ) {
      setPhotos((previous) => {
        const alreadyExists = previous.some((item) => item.photoId === uploadedPhoto.photoId);

        if (alreadyExists) {
          return previous;
        }

        return [uploadedPhoto, ...previous];
      });
    }

    void loadPhotos();
  }

  // ==================================================
  // LOADING SCREEN
  // ==================================================

  if (!ready || !isAuthenticated) {
    return (
      <div
        className="
          flex
          min-h-screen
          flex-col
          items-center
          justify-center
          gap-3
          bg-background
        "
      >
        <Loader2
          className="
            size-7
            animate-spin
            text-primary
          "
          aria-hidden="true"
        />

        <span
          className="
            text-sm
            text-muted-foreground
          "
        >
          Loading your library...
        </span>
      </div>
    );
  }

  // ==================================================
  // UI DATA
  // ==================================================

  const selectedFolder = folders.find((folder) => folder.folderId === selectedFolderId);

  const libraryLabel = loadingPhotos
    ? "Loading your media..."
    : selectedFolder
      ? `${selectedFolder.name} · ${photos.length} ${photos.length === 1 ? "item" : "items"}`
      : `${photos.length} ${photos.length === 1 ? "item" : "items"} in your library`;

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        search={search}
        sort={sort}
        type={type}
        onSearchChange={setSearch}
        onSortChange={setSort}
        onTypeChange={setType}
      />

      <MobileNav />

      <div
        className="
          mx-auto
          flex
          w-full
          max-w-[1600px]
        "
      >
        <Sidebar />

        <main
          className="
            min-w-0
            flex-1
            px-4
            py-6
            pb-24
            sm:px-6
            sm:py-8
            lg:pb-8
          "
        >
          {/* ==================================================
              HEADER
          ================================================== */}

          <div
            className="
              flex
              flex-col
              gap-4
              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >
            <div className="min-w-0">
              <h1
                className="
                  text-2xl
                  font-semibold
                  tracking-tight
                  sm:text-3xl
                "
              >
                My Photos
              </h1>

              <p
                className="
                  mt-1
                  text-sm
                  text-muted-foreground
                "
              >
                {libraryLabel}
              </p>
            </div>

            <div
              className="
                flex
                flex-col
                gap-2
                sm:flex-row
              "
            >
              <Button
                variant="outline"
                className="
                  w-full
                  rounded-xl
                  transition-all
                  hover:border-foreground/20
                  active:scale-[0.98]
                  sm:w-auto
                "
                onClick={() => setCreateFolderOpen(true)}
              >
                <FolderPlus className="size-4" aria-hidden="true" />
                New folder
              </Button>

              <Button
                className="
                  w-full
                  rounded-xl
                  shadow-sm
                  transition-all
                  hover:shadow
                  active:scale-[0.98]
                  sm:w-auto
                "
                onClick={() => setUploadOpen(true)}
              >
                <Plus className="size-4" aria-hidden="true" />
                Upload media
              </Button>
            </div>
          </div>

          {/* ==================================================
              ACTIVE SORT / TYPE FILTERS
          ================================================== */}

          {hasNonDefaultFilters ? (
            <div
              className="
                animate-in
                fade-in
                slide-in-from-top-1
                mt-4
                flex
                flex-wrap
                items-center
                gap-2
                rounded-xl
                border
                border-primary/30
                bg-primary/5
                px-4
                py-2.5
                text-sm
                duration-200
              "
            >
              <SlidersHorizontal
                className="
                  size-4
                  shrink-0
                  text-primary
                "
                aria-hidden="true"
              />

              <span className="text-muted-foreground">Showing</span>

              <span className="font-medium text-foreground">{TYPE_LABELS[type]}</span>

              <span className="text-muted-foreground" aria-hidden="true">
                ·
              </span>

              <span className="font-medium text-foreground">{SORT_LABELS[sort]}</span>

              <button
                type="button"
                onClick={clearFilters}
                className="
                  ml-auto
                  inline-flex
                  items-center
                  gap-1
                  rounded-lg
                  px-2
                  py-1
                  text-primary
                  transition
                  hover:bg-primary/10
                "
              >
                <X className="size-3.5" aria-hidden="true" />
                Clear filters
              </button>
            </div>
          ) : null}

          {/* ==================================================
              FOLDERS
          ================================================== */}

          <section
            className="
              mt-6
              rounded-xl
              border
              border-border
              bg-card
              p-4
              shadow-sm
              transition-shadow
              hover:shadow-md
            "
            aria-label="Folders"
          >
            <div
              className="
                mb-3
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">Folders</h2>

                <p className="text-xs text-muted-foreground">Organize your photos</p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="
                  shrink-0
                  rounded-lg
                "
                onClick={() => setCreateFolderOpen(true)}
              >
                <FolderPlus className="size-4" aria-hidden="true" />
                Create
              </Button>
            </div>

            {loadingFolders ? (
              <div
                className="
                  flex
                  items-center
                  gap-2
                  py-3
                  text-sm
                  text-muted-foreground
                "
              >
                <Loader2
                  className="
                    size-4
                    animate-spin
                    text-primary
                  "
                  aria-hidden="true"
                />
                Loading folders...
              </div>
            ) : folders.length === 0 ? (
              <div
                className="
                  flex
                  flex-col
                  items-center
                  gap-2
                  rounded-lg
                  border
                  border-dashed
                  border-border
                  py-6
                  text-center
                "
              >
                <FolderPlus
                  className="
                    size-5
                    text-muted-foreground
                  "
                  aria-hidden="true"
                />

                <p
                  className="
                    text-sm
                    text-muted-foreground
                  "
                >
                  No folders yet — create one to start organizing.
                </p>
              </div>
            ) : (
              <FolderTree
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelect={handleFolderSelect}
                onCreateFolder={() => setCreateFolderOpen(true)}
                onChanged={loadFolders}
              />
            )}
          </section>

          {/* ==================================================
              ACTIVE SEARCH STATUS
          ================================================== */}

          {search.trim() ? (
            <div
              className="
                animate-in
                fade-in
                slide-in-from-top-1
                mt-4
                flex
                flex-wrap
                items-center
                gap-2
                rounded-xl
                border
                border-border
                bg-card
                px-4
                py-3
                text-sm
                duration-200
              "
            >
              <Search
                className="
                  size-4
                  shrink-0
                  text-muted-foreground
                "
                aria-hidden="true"
              />

              <span className="text-muted-foreground">Searching for</span>

              <span
                className="
                  min-w-0
                  truncate
                  font-medium
                "
                title={search.trim()}
              >
                "{search.trim()}"
              </span>

              <button
                type="button"
                onClick={() => setSearch("")}
                className="
                  ml-auto
                  inline-flex
                  shrink-0
                  items-center
                  gap-1
                  rounded-lg
                  px-2
                  py-1
                  text-primary
                  transition
                  hover:bg-primary/10
                "
              >
                <X className="size-3.5" aria-hidden="true" />
                Clear
              </button>
            </div>
          ) : null}

          {/* ==================================================
              CURRENT FOLDER
          ================================================== */}

          <div
            className="
              mb-4
              mt-8
              flex
              items-center
              justify-between
              gap-3
            "
          >
            <div className="min-w-0">
              <h2
                className="
                  truncate
                  text-sm
                  font-semibold
                  uppercase
                  tracking-wide
                  text-muted-foreground
                "
                title={selectedFolder ? selectedFolder.name : "My Photos"}
              >
                {selectedFolder ? selectedFolder.name : "My Photos"}
              </h2>
            </div>

            {!loadingPhotos ? (
              <span
                className="
                  shrink-0
                  rounded-full
                  bg-muted
                  px-2.5
                  py-1
                  text-xs
                  font-medium
                  text-muted-foreground
                "
              >
                {photos.length} {photos.length === 1 ? "item" : "items"}
              </span>
            ) : null}
          </div>

          {/* ==================================================
              GALLERY
          ================================================== */}

          <PhotoGallery
            photos={photos}
            folders={folders}
            loading={loadingPhotos}
            onUploadClick={() => setUploadOpen(true)}
            onRenamed={handlePhotoRenamed}
            onMoved={handlePhotoMoved}
            onTrashed={handlePhotoTrashed}
            onFavorite={handlePhotoFavorite}
            onRetry={() => {
              void loadPhotos();
            }}
            {...(photoError
              ? {
                  error: photoError,
                }
              : {})}
          />

          {/* ==================================================
              UPLOAD MEDIA
          ================================================== */}

          <UploadPhoto
            open={uploadOpen}
            onOpenChange={setUploadOpen}
            onUploaded={handleUploadCompleted}
          />

          {/* ==================================================
              CREATE FOLDER
          ================================================== */}

          <CreateFolderDialog
            open={createFolderOpen}
            onOpenChange={setCreateFolderOpen}
            onCreated={handleFolderCreated}
          />
        </main>
      </div>

      {/* ==================================================
          FLOATING UPLOAD BUTTON — MOBILE
      ================================================== */}

      <button
        type="button"
        onClick={() => setUploadOpen(true)}
        aria-label="Upload media"
        className="
          fixed
          bottom-20
          right-4
          z-40
          flex
          size-14
          items-center
          justify-center
          rounded-full
          bg-primary
          text-primary-foreground
          shadow-lg
          transition-all
          hover:shadow-xl
          active:scale-95
          lg:hidden
        "
      >
        <Plus className="size-6" aria-hidden="true" />
      </button>
    </div>
  );
}
