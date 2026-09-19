import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";

import {
  Filter,
  FolderPlus,
  Plus,
  Search,
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
import { Input } from "@/components/ui/input";

import { useAuth } from "@/hooks/useAuth";

import {
  getFolders,
  getPhotos,
  type PhotoSort,
  type PhotoType,
} from "@/services/api";

import type { Folder } from "@/types/folder";
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
            "Browse your photo library, organize folders, upload new photos and download originals.",
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

  const navigate = useNavigate();

  // --------------------------------------------------
  // Photos
  // --------------------------------------------------

  const [photos, setPhotos] =
    useState<Photo[]>([]);

  const [
    loadingPhotos,
    setLoadingPhotos,
  ] = useState(true);

  // --------------------------------------------------
  // Folders
  // --------------------------------------------------

  const [folders, setFolders] =
    useState<Folder[]>([]);

  const [
    loadingFolders,
    setLoadingFolders,
  ] = useState(true);

  const [
    selectedFolderId,
    setSelectedFolderId,
  ] = useState<string | null>(null);

  const [
    createFolderOpen,
    setCreateFolderOpen,
  ] = useState(false);

  // --------------------------------------------------
  // Upload
  // --------------------------------------------------

  const [
    uploadOpen,
    setUploadOpen,
  ] = useState(false);

  // --------------------------------------------------
  // Search / Sort / Filter
  // --------------------------------------------------

  const [search, setSearch] =
    useState("");

  const [sort, setSort] =
    useState<PhotoSort>("newest");

  const [type, setType] =
    useState<PhotoType>("all");

  // --------------------------------------------------
  // Authentication
  // --------------------------------------------------

  useEffect(() => {
    if (!ready) return;

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
  // Load folders
  // --------------------------------------------------

  const loadFolders =
    useCallback(async () => {
      if (!isAuthenticated) return;

      try {
        setLoadingFolders(true);

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
        setLoadingFolders(false);
      }
    }, [isAuthenticated]);

  // --------------------------------------------------
  // Load photos
  // --------------------------------------------------

  const loadPhotos =
    useCallback(async () => {
      if (!isAuthenticated) return;

      try {
        setLoadingPhotos(true);

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
          (response.photos ?? []).map(
            (photo) => ({
              ...photo,

              id:
                photo.photoId,

              photoId:
                photo.photoId,

              key:
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

              url:
                photo.downloadUrl ||
                photo.url ||
                "",

              contentType:
                photo.contentType ||
                "image/jpeg",

              fileSize:
                photo.fileSize ?? 0,

              uploadedAt:
                photo.createdAt,

              createdAt:
                photo.createdAt,

              updatedAt:
                photo.updatedAt ??
                photo.createdAt,

              folderId:
                photo.folderId ?? null,
            } as Photo),
          );

        setPhotos(mappedPhotos);
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
      selectedFolderId,
    ]);

  // --------------------------------------------------
  // Initial folder loading
  // --------------------------------------------------

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

  // --------------------------------------------------
  // Photo loading
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
      }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    ready,
    isAuthenticated,
    loadPhotos,
  ]);

  // --------------------------------------------------
  // Folder created
  // --------------------------------------------------

  async function handleFolderCreated(
    folder?: Folder,
  ) {
    if (folder) {
      setFolders((previous) => {
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
      });

      return;
    }

    await loadFolders();
  }

  // --------------------------------------------------
  // Folder selected
  // --------------------------------------------------

  function handleFolderSelect(
    folderId: string | null,
  ) {
    setSelectedFolderId(
      folderId,
    );

    setSearch("");
  }

  // --------------------------------------------------
  // Photo renamed
  // --------------------------------------------------

  function handlePhotoRenamed(
    updatedPhoto: Photo,
  ) {
    setPhotos((previous) =>
      previous.map((photo) =>
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

  // --------------------------------------------------
  // Photo moved
  // --------------------------------------------------

  function handlePhotoMoved(
    photo: Photo,
    folderId: string | null,
  ) {
    /*
     * Current folder is a specific folder.
     * If photo leaves this folder,
     * remove it immediately.
     */
    if (
      selectedFolderId !== null &&
      folderId !== selectedFolderId
    ) {
      setPhotos((previous) =>
        previous.filter(
          (item) =>
            item.photoId !==
            photo.photoId,
        ),
      );

      return;
    }

    /*
     * Current folder is root.
     * If photo is moved into a folder,
     * remove it from root immediately.
     */
    if (
      selectedFolderId === null &&
      folderId !== null
    ) {
      setPhotos((previous) =>
        previous.filter(
          (item) =>
            item.photoId !==
            photo.photoId,
        ),
      );

      return;
    }

    /*
     * Same folder:
     * refresh the current gallery.
     */
    void loadPhotos();
  }

  // --------------------------------------------------
  // Loading screen
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
    user?.name?.split(" ")[0] ??
    "there";

  const selectedFolder =
    folders.find(
      (folder) =>
        folder.folderId ===
        selectedFolderId,
    );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <MobileNav />

      <div className="mx-auto flex w-full max-w-[1600px]">
        <Sidebar />

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {/* Header */}
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
                        photos.length === 1
                          ? "photo"
                          : "photos"
                      }`
                    : `${photos.length} ${
                        photos.length === 1
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
                  setUploadOpen(true)
                }
              >
                <Plus className="size-4" />
                Upload photo
              </Button>
            </div>
          </div>

          {/* Folders */}
          <section
            className="mt-6 rounded-xl border border-border bg-card p-4"
            aria-label="Folders"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">
                  Folders
                </h2>

                <p className="text-xs text-muted-foreground">
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
              <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                <span className="size-4 animate-spin rounded-full border-2 border-border border-t-primary" />
                Loading folders...
              </div>
            ) : (
              <FolderTree
                folders={folders}
                selectedFolderId={
                  selectedFolderId
                }
                onSelect={
                  handleFolderSelect
                }
                onCreateFolder={
                  () => setCreateFolderOpen(true)
                }
                onChanged={
                  loadFolders
                }
              />
            )}
          </section>

          {/* Search / filters */}
          <section
            className="mt-8"
            aria-label="Photo search and filters"
          >
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />

                <Input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Search photos by name or filename..."
                  className="pl-9"
                  aria-label="Search photos"
                />
              </div>

              <select
                value={sort}
                onChange={(event) =>
                  setSort(
                    event.target
                      .value as PhotoSort,
                  )
                }
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
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

              <div className="flex items-center gap-2">
                <Filter
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />

                <select
                  value={type}
                  onChange={(event) =>
                    setType(
                      event.target
                        .value as PhotoType,
                    )
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
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

            {search.trim() ? (
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
            ) : null}
          </section>

          {/* Current folder */}
          <div className="mb-4 mt-8 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {selectedFolder
                ? selectedFolder.name
                : "My Photos"}
            </h2>

            {!loadingPhotos && (
              <span className="text-xs text-muted-foreground">
                {photos.length}{" "}
                {photos.length === 1
                  ? "item"
                  : "items"}
              </span>
            )}
          </div>

          {/* Gallery */}
          <PhotoGallery
            photos={photos}
            folders={folders}
            loading={loadingPhotos}
            onUploadClick={() =>
              setUploadOpen(true)
            }
            onRenamed={
              handlePhotoRenamed
            }
            onMoved={
              handlePhotoMoved
            }
          />

          {/* Upload */}
          <UploadPhoto
            open={uploadOpen}
            onOpenChange={
              setUploadOpen
            }
            onUploaded={() => {
              void loadPhotos();
            }}
          />

          {/* Create folder */}
          <CreateFolderDialog
            open={createFolderOpen}
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