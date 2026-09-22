import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";

import {
  ArrowLeft,
  ImageOff,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { toast } from "sonner";

import { Navbar } from "@/components/Navbar";

import {
  MobileNav,
  Sidebar,
} from "@/components/Sidebar";

import { Button } from "@/components/ui/button";

import {
  deletePhotoForever,
  emptyTrash,
  getTrashPhotos,
  restorePhoto,
} from "@/services/api";

type TrashPhoto = {
  photoId: string;
  name: string;
  url?: string | null;
  contentType?: string | null;
};

export const Route =
  createFileRoute("/trash")({
    component:
      TrashPage,
  });

function TrashPage() {
  const navigate =
    useNavigate();

  const [photos, setPhotos] =
    useState<TrashPhoto[]>(
      [],
    );

  const [loading, setLoading] =
    useState(true);

  const [busyPhotoId, setBusyPhotoId] =
    useState<string | null>(
      null,
    );

  const [emptying, setEmptying] =
    useState(false);

  // --------------------------------------------------
  // Load trash
  // --------------------------------------------------

  const loadTrash =
    useCallback(async () => {
      try {
        setLoading(true);

        const response =
          await getTrashPhotos();

        const normalizedPhotos: TrashPhoto[] =
          (response.photos ?? []).map(
            (photo) => ({
              ...photo,
              url: photo.url ?? "",
            }),
          );

        setPhotos(normalizedPhotos);
      } catch (error) {
        console.error(
          "Failed to load trash:",
          error,
        );

        toast.error(
          "Couldn't load Trash",
          {
            description:
              error instanceof Error
                ? error.message
                : "Please try again.",
          },
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadTrash();
  }, [loadTrash]);

  // --------------------------------------------------
  // Restore
  // --------------------------------------------------

  async function handleRestore(
    photoId: string,
  ) {
    if (busyPhotoId) {
      return;
    }

    setBusyPhotoId(
      photoId,
    );

    try {
      await restorePhoto(
        photoId,
      );

      setPhotos(
        (previous) =>
          previous.filter(
            (photo) =>
              photo.photoId !==
              photoId,
          ),
      );

      toast.success(
        "Photo restored",
      );
    } catch (error) {
      console.error(
        "Restore failed:",
        error,
      );

      toast.error(
        "Couldn't restore photo",
        {
          description:
            error instanceof Error
              ? error.message
              : "Please try again.",
        },
      );
    } finally {
      setBusyPhotoId(
        null,
      );
    }
  }

  // --------------------------------------------------
  // Delete forever
  // --------------------------------------------------

  async function handleDeleteForever(
    photoId: string,
  ) {
    if (busyPhotoId) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete this photo permanently? This action cannot be undone.",
      );

    if (!confirmed) {
      return;
    }

    setBusyPhotoId(
      photoId,
    );

    try {
      await deletePhotoForever(
        photoId,
      );

      setPhotos(
        (previous) =>
          previous.filter(
            (photo) =>
              photo.photoId !==
              photoId,
          ),
      );

      toast.success(
        "Photo permanently deleted",
      );
    } catch (error) {
      console.error(
        "Permanent delete failed:",
        error,
      );

      toast.error(
        "Couldn't delete photo",
        {
          description:
            error instanceof Error
              ? error.message
              : "Please try again.",
        },
      );
    } finally {
      setBusyPhotoId(
        null,
      );
    }
  }

  // --------------------------------------------------
  // Empty trash
  // --------------------------------------------------

  async function handleEmptyTrash() {
    if (
      emptying ||
      photos.length === 0
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Permanently delete all ${photos.length} photos from Trash? This cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    setEmptying(true);

    try {
      await emptyTrash();

      setPhotos([]);

      toast.success(
        "Trash emptied",
      );
    } catch (error) {
      console.error(
        "Empty trash failed:",
        error,
      );

      toast.error(
        "Couldn't empty Trash",
        {
          description:
            error instanceof Error
              ? error.message
              : "Please try again.",
        },
      );
    } finally {
      setEmptying(false);
    }
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
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <button
                type="button"
                onClick={() =>
                  void navigate({
                    to: "/dashboard",
                  })
                }
                className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
              >
                <ArrowLeft className="size-4" />

                Back to Photos
              </button>

              <h1 className="text-3xl font-semibold tracking-tight">
                Trash
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Photos moved to Trash can be restored or permanently deleted.
              </p>
            </div>

            {photos.length > 0 ? (
              <Button
                variant="destructive"
                onClick={() =>
                  void handleEmptyTrash()
                }
                disabled={emptying}
              >
                {emptying ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}

                Empty Trash
              </Button>
            ) : null}
          </div>

          {loading ? (
            <div className="mt-10 flex min-h-[300px] items-center justify-center">
              <Loader2 className="size-7 animate-spin text-primary" />
            </div>
          ) : photos.length === 0 ? (
            <div className="mt-8 flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
                <ImageOff className="size-7 text-muted-foreground" />
              </div>

              <h2 className="text-lg font-semibold">
                Trash is empty
              </h2>

              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Photos you move to Trash will appear here. You can restore them later or permanently delete them.
              </p>

              <Button
                className="mt-6"
                onClick={() =>
                  void navigate({
                    to: "/dashboard",
                  })
                }
              >
                Go to Photos
              </Button>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {photos.map(
                (photo) => {
                  const busy =
                    busyPhotoId ===
                    photo.photoId;

                  const isVideo =
                    photo.contentType?.startsWith(
                      "video/",
                    );

                  return (
                    <article
                      key={
                        photo.photoId
                      }
                      className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                    >
                      <div className="relative aspect-square overflow-hidden bg-muted">
                        {isVideo ? (
                          <video
                            src={photo.url ?? undefined}
                            className="size-full object-cover"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={photo.url ?? undefined}
                            alt={
                              photo.name
                            }
                            className="size-full object-cover transition duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        )}

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10">
                          <p className="truncate text-sm font-medium text-white">
                            {
                              photo.name
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 p-3">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            void handleRestore(
                              photo.photoId,
                            )
                          }
                          disabled={
                            busy ||
                            emptying
                          }
                        >
                          {busy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <RotateCcw className="size-4" />
                          )}

                          Restore
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="px-3"
                          onClick={() =>
                            void handleDeleteForever(
                              photo.photoId,
                            )
                          }
                          disabled={
                            busy ||
                            emptying
                          }
                          aria-label={`Delete ${photo.name} forever`}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}