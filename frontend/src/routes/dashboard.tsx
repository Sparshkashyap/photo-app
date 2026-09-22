import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";

import {
  FolderPlus,
  Plus,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { Navbar } from "@/components/Navbar";

import {
  MobileNav,
  Sidebar,
} from "@/components/Sidebar";

import { UploadPhoto } from "@/components/UploadPhoto";

import {
  CreateFolderDialog,
} from "@/components/CreateFolderDialog";

import {
  FolderTree,
} from "@/components/FolderTree";

import {
  PhotoGallery,
} from "@/components/PhotoGallery";

import { Button } from "@/components/ui/button";

import { useAuth } from "@/hooks/useAuth";

import {
  getFolders,
  getPhotos,
  type PhotoSort,
  type PhotoType,
} from "@/services/api";

import type { Folder } from "@/types/folder";

import type { Photo } from "@/types/photo";

// ==================================================
// ROUTE
// ==================================================

export const Route =
  createFileRoute(
    "/dashboard",
  )({
    head: () => ({
      meta: [
        {
          title:
            "Your photos — Photos",
        },
        {
          name: "description",
          content:
            "Browse your photo library, organize folders, upload new photos and download originals.",
        },
      ],
    }),

    component:
      DashboardPage,
  });

// ==================================================
// TOOLBAR TYPES
// ==================================================

type ToolbarDetail = {
  search?: string;
  sort?: PhotoSort;
  type?: PhotoType;
};

// ==================================================
// PAGE
// ==================================================

function DashboardPage() {
  const {
    user,
    isAuthenticated,
    ready,
  } = useAuth();

  const navigate =
    useNavigate();

  // ==================================================
  // PHOTOS
  // ==================================================

  const [photos, setPhotos] =
    useState<Photo[]>([]);

  const [
    loadingPhotos,
    setLoadingPhotos,
  ] = useState(true);

  const [
    photoError,
    setPhotoError,
  ] = useState<
    string | undefined
  >();

  // ==================================================
  // FOLDERS
  // ==================================================

  const [folders, setFolders] =
    useState<Folder[]>([]);

  const [
    loadingFolders,
    setLoadingFolders,
  ] = useState(true);

  const [
    selectedFolderId,
    setSelectedFolderId,
  ] = useState<
    string | null
  >(null);

  const [
    createFolderOpen,
    setCreateFolderOpen,
  ] = useState(false);

  // ==================================================
  // UPLOAD
  // ==================================================

  const [
    uploadOpen,
    setUploadOpen,
  ] = useState(false);

  // ==================================================
  // SEARCH / SORT / FILTER
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
  }, [
    ready,
    isAuthenticated,
    navigate,
  ]);

  // ==================================================
  // NAVBAR → DASHBOARD
  //
  // This is the important part that makes the
  // top search/sort/filter actually work.
  // ==================================================

  useEffect(() => {
    function handleToolbarChange(
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
      "photo-toolbar-change",
      handleToolbarChange,
    );

    return () => {
      window.removeEventListener(
        "photo-toolbar-change",
        handleToolbarChange,
      );
    };
  }, []);

  // ==================================================
  // SYNC DASHBOARD → NAVBAR
  // ==================================================

  function syncNavbar(
    detail: ToolbarDetail,
  ) {
    window.dispatchEvent(
      new CustomEvent(
        "photo-toolbar-sync",
        {
          detail,
        },
      ),
    );
  }

  // ==================================================
  // LOAD FOLDERS
  // ==================================================

  const loadFolders =
    useCallback(async () => {
      if (!isAuthenticated) {
        return;
      }

      try {
        setLoadingFolders(
          true,
        );

        const response =
          await getFolders();

        setFolders(
          response.folders ?? [],
        );
      } catch (error) {
        console.error(
          "Failed to load folders:",
          error,
        );

        setFolders([]);
      } finally {
        setLoadingFolders(
          false,
        );
      }
    }, [
      isAuthenticated,
    ]);

  // ==================================================
  // LOAD PHOTOS
  // ==================================================

  const loadPhotos =
    useCallback(async () => {
      if (!isAuthenticated) {
        return;
      }

      try {
        setLoadingPhotos(
          true,
        );

        setPhotoError(
          undefined,
        );

        const trimmedSearch =
          search.trim();

        const response =
          await getPhotos({
            ...(trimmedSearch
              ? {
                  search:
                    trimmedSearch,
                }
              : {}),

            sort,

            type,

            ...(selectedFolderId
              ? {
                  folderId:
                    selectedFolderId,
                }
              : {}),
          });

        const mappedPhotos: Photo[] =
          (
            response.photos ?? []
          ).map(
            (photo) => ({
              id:
                photo.photoId,

              photoId:
                photo.photoId,

              userId:
                photo.userId,

              key:
                photo.s3Key,

              s3Key:
                photo.s3Key,

              name:
                photo.name ||
                photo.fileName ||
                photo.originalFileName ||
                "Untitled photo",

              originalFileName:
                photo.originalFileName ||
                photo.fileName ||
                "photo",

              fileName:
                photo.fileName ||
                photo.originalFileName ||
                "photo",

              contentType:
                photo.contentType ||
                "image/jpeg",

              fileSize:
                photo.fileSize ??
                0,

              url:
                photo.downloadUrl ||
                photo.url ||
                "",

              downloadUrl:
                photo.downloadUrl ||
                photo.url ||
                "",

              folderId:
                photo.folderId ??
                null,

              isTrashed:
                photo.isTrashed ??
                false,

              trashedAt:
                photo.trashedAt ??
                null,

              uploadedAt:
                photo.createdAt,

              createdAt:
                photo.createdAt,

              updatedAt:
                photo.updatedAt ??
                photo.createdAt,
            }),
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

        setPhotoError(
          error instanceof Error
            ? error.message
            : "Unable to load photos. Please try again.",
        );
      } finally {
        setLoadingPhotos(
          false,
        );
      }
    }, [
      isAuthenticated,
      search,
      sort,
      type,
      selectedFolderId,
    ]);

  // ==================================================
  // INITIAL FOLDER LOAD
  // ==================================================

  useEffect(() => {
    if (
      !ready ||
      !isAuthenticated
    ) {
      return;
    }

    void loadFolders();
  }, [
    ready,
    isAuthenticated,
    loadFolders,
  ]);

  // ==================================================
  // PHOTO LOAD WITH DEBOUNCE
  // ==================================================

  useEffect(() => {
    if (
      !ready ||
      !isAuthenticated
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          void loadPhotos();
        },
        300,
      );

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

  // ==================================================
  // FOLDER CREATED
  // ==================================================

  async function handleFolderCreated(
    folder?: Folder,
  ) {
    if (folder) {
      setFolders(
        (previous) => {
          const exists =
            previous.some(
              (item) =>
                item.folderId ===
                folder.folderId,
            );

          if (exists) {
            return previous.map(
              (item) =>
                item.folderId ===
                folder.folderId
                  ? folder
                  : item,
            );
          }

          return [
            ...previous,
            folder,
          ];
        },
      );

      return;
    }

    await loadFolders();
  }

  // ==================================================
  // FOLDER SELECT
  // ==================================================

  function handleFolderSelect(
    folderId: string | null,
  ) {
    setSelectedFolderId(
      folderId,
    );

    setSearch("");

    // Also clear the top navbar search.
    syncNavbar({
      search: "",
    });
  }

  // ==================================================
  // PHOTO RENAMED
  // ==================================================

  function handlePhotoRenamed(
    updatedPhoto: Photo,
  ) {
    setPhotos(
      (previous) =>
        previous.map(
          (photo) =>
            photo.photoId ===
            updatedPhoto.photoId
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

  function handlePhotoMoved(
    photo: Photo,
    folderId: string | null,
  ) {
    if (
      selectedFolderId !==
        null &&
      folderId !==
        selectedFolderId
    ) {
      setPhotos(
        (previous) =>
          previous.filter(
            (item) =>
              item.photoId !==
              photo.photoId,
          ),
      );

      return;
    }

    if (
      selectedFolderId ===
        null &&
      folderId !== null
    ) {
      setPhotos(
        (previous) =>
          previous.filter(
            (item) =>
              item.photoId !==
              photo.photoId,
          ),
      );

      return;
    }

    void loadPhotos();
  }

  // ==================================================
  // PHOTO TRASHED
  // ==================================================

  function handlePhotoTrashed(
    photo: Photo,
  ) {
    setPhotos(
      (previous) =>
        previous.filter(
          (item) =>
            item.photoId !==
            photo.photoId,
        ),
    );
  }

  // ==================================================
  // LOADING SCREEN
  // ==================================================

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

  // ==================================================
  // UI DATA
  // ==================================================

  const firstName =
    user?.name?.split(
      " ",
    )[0] ?? "there";

  const selectedFolder =
    folders.find(
      (folder) =>
        folder.folderId ===
        selectedFolderId,
    );

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <MobileNav />

      <div className="mx-auto flex w-full max-w-[1600px]">
        <Sidebar />

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {/* ==================================================
              HEADER
              ================================================== */}

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold capitalize sm:text-3xl">
                Welcome back,{" "}
                {firstName}
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                {loadingPhotos
                  ? "Loading your photos..."
                  : selectedFolder
                    ? `${selectedFolder.name} · ${photos.length} ${
                        photos.length ===
                        1
                          ? "photo"
                          : "photos"
                      }`
                    : `${photos.length} ${
                        photos.length ===
                        1
                          ? "photo"
                          : "photos"
                      } in your library`}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() =>
                  setCreateFolderOpen(
                    true,
                  )
                }
              >
                <FolderPlus className="size-4" />

                New folder
              </Button>

              <Button
                onClick={() =>
                  setUploadOpen(
                    true,
                  )
                }
              >
                <Plus className="size-4" />

                Upload photo
              </Button>
            </div>
          </div>

          {/* ==================================================
              FOLDERS
              ================================================== */}

          <section
            className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5"
            aria-label="Folders"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">
                  Folders
                </h2>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Organize your photos
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCreateFolderOpen(
                    true,
                  )
                }
              >
                <FolderPlus className="size-4" />

                Create
              </Button>
            </div>

            {loadingFolders ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({
                  length: 5,
                }).map(
                  (_, index) => (
                    <div
                      key={index}
                      className="h-24 animate-pulse rounded-xl bg-muted"
                    />
                  ),
                )}
              </div>
            ) : (
              <FolderTree
                folders={
                  folders
                }
                selectedFolderId={
                  selectedFolderId
                }
                onSelect={
                  handleFolderSelect
                }
                onCreateFolder={() =>
                  setCreateFolderOpen(
                    true,
                  )
                }
                onChanged={
                  loadFolders
                }
              />
            )}
          </section>

          {/* ==================================================
              SEARCH STATUS
              ================================================== */}

          {search.trim() ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Search results for
              </span>

              <span className="font-medium text-foreground">
                "{search.trim()}"
              </span>

              <button
                type="button"
                onClick={() => {
                  setSearch("");

                  syncNavbar({
                    search: "",
                  });
                }}
                className="font-medium text-primary hover:underline"
              >
                Clear
              </button>
            </div>
          ) : null}

          {/* ==================================================
              CURRENT FOLDER / PHOTO COUNT
              ================================================== */}

          <div className="mb-4 mt-8 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {selectedFolder
                  ? selectedFolder.name
                  : "My Photos"}
              </h2>
            </div>

            {!loadingPhotos ? (
              <span className="text-xs text-muted-foreground">
                {photos.length}{" "}
                {photos.length ===
                1
                  ? "item"
                  : "items"}
              </span>
            ) : null}
          </div>

          {/* ==================================================
              GALLERY
              ================================================== */}

          <PhotoGallery
            photos={photos}
            folders={folders}
            loading={
              loadingPhotos
            }
            onUploadClick={() =>
              setUploadOpen(true)
            }
            onRenamed={
              handlePhotoRenamed
            }
            onMoved={
              handlePhotoMoved
            }
            onTrashed={
              handlePhotoTrashed
            }
            onRetry={() =>
              void loadPhotos()
            }
            error={
              photoError
            }
          />

          {/* ==================================================
              UPLOAD
              ================================================== */}

          <UploadPhoto
            open={uploadOpen}
            onOpenChange={
              setUploadOpen
            }
            onUploaded={() => {
              void loadPhotos();
            }}
          />

          {/* ==================================================
              CREATE FOLDER
              ================================================== */}

          <CreateFolderDialog
            open={
              createFolderOpen
            }
            onOpenChange={
              setCreateFolderOpen
            }
            onCreated={
              handleFolderCreated
            }
          />
        </main>
      </div>
    </div>
  );
}

export default DashboardPage;