import {
  AlertTriangle,
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  RotateCcw,
  Trash2,
  Video,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
  createFileRoute,
} from "@tanstack/react-router";

import {
  deletePhotoForever,
  emptyTrash,
  getTrashPhotos,
  restorePhoto,
} from "@/services/api";

import type { TrashPhoto } from "@/types/photo";

import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

export const Route = createFileRoute("/trash")({
  component: TrashPage,
});

// ======================================================
// Helpers
// ======================================================

function formatDate(
  date?: string | null,
) {
  if (!date) {
    return "Unknown date";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Unknown date";
  }

  return parsed.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
}

function formatFileSize(
  bytes?: number,
) {
  if (!bytes || bytes <= 0) {
    return "";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  if (
    bytes <
    1024 * 1024 * 1024
  ) {
    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  return `${(
    bytes /
    (1024 * 1024 * 1024)
  ).toFixed(1)} GB`;
}

// ======================================================
// Trash Page
// ======================================================

function TrashPage() {
  const {
    isAuthenticated,
  } = useAuth();

  const [
    photos,
    setPhotos,
  ] = useState<TrashPhoto[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    busyPhotoId,
    setBusyPhotoId,
  ] = useState<string | null>(
    null,
  );

  const [
    emptying,
    setEmptying,
  ] = useState(false);

  // ====================================================
  // Load Trash
  // ====================================================

  const loadTrash =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const response =
            await getTrashPhotos();

          setPhotos(
            response.photos ?? [],
          );
        } catch (err) {
          console.error(
            "Failed to load Trash:",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : "Failed to load Trash.",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  // ====================================================
  // Authentication + Initial Load
  // ====================================================

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    void loadTrash();
  }, [
    isAuthenticated,
    loadTrash,
  ]);

  // ====================================================
  // Restore Photo
  // ====================================================

  const handleRestore =
    async (
      photo: TrashPhoto,
    ) => {
      if (busyPhotoId || emptying) {
        return;
      }

      setError("");
      setBusyPhotoId(
        photo.photoId,
      );

      try {
        await restorePhoto(
          photo.photoId,
        );

        setPhotos(
          (current) =>
            current.filter(
              (item) =>
                item.photoId !==
                photo.photoId,
            ),
        );
      } catch (err) {
        console.error(
          "Failed to restore photo:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to restore photo.",
        );
      } finally {
        setBusyPhotoId(null);
      }
    };

  // ====================================================
  // Delete Forever
  // ====================================================

  const handleDeleteForever =
    async (
      photo: TrashPhoto,
    ) => {
      if (busyPhotoId || emptying) {
        return;
      }

      const confirmed =
        window.confirm(
          `Delete "${photo.name}" permanently? This action cannot be undone.`,
        );

      if (!confirmed) {
        return;
      }

      setError("");
      setBusyPhotoId(
        photo.photoId,
      );

      try {
        await deletePhotoForever(
          photo.photoId,
        );

        setPhotos(
          (current) =>
            current.filter(
              (item) =>
                item.photoId !==
                photo.photoId,
            ),
        );
      } catch (err) {
        console.error(
          "Failed to permanently delete photo:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to permanently delete photo.",
        );
      } finally {
        setBusyPhotoId(null);
      }
    };

  // ====================================================
  // Empty Trash
  // ====================================================

  const handleEmptyTrash =
    async () => {
      if (
        emptying ||
        photos.length === 0 ||
        busyPhotoId
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Empty Trash permanently? All photos in Trash will be deleted and cannot be restored.",
        );

      if (!confirmed) {
        return;
      }

      setEmptying(true);
      setError("");

      try {
        await emptyTrash();

        setPhotos([]);
      } catch (err) {
        console.error(
          "Failed to empty Trash:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to empty Trash.",
        );
      } finally {
        setEmptying(false);
      }
    };

  // ====================================================
  // Loading State
  // ====================================================

  if (
    loading
  ) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />

            <span>
              Loading Trash...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // Authentication State
  // ====================================================

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Trash2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />

            <h1 className="text-xl font-semibold">
              Sign in required
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Please sign in to access your Trash.
            </p>

            <Button
              asChild
              className="mt-6"
            >
              <Link to="/login">
                Go to Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ====================================================
  // Main UI
  // ====================================================

  return (
    <div className="min-h-screen bg-background">
      {/* ==================================================
          Header
      ================================================== */}

      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          {/* Left */}

          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              asChild
              title="Back to Photos"
            >
              <Link to="/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>

            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Trash2 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold">
                  Trash
                </h1>

                <p className="hidden text-xs text-muted-foreground sm:block">
                  Deleted photos stay here until permanently removed.
                </p>
              </div>
            </div>
          </div>

          {/* Right */}

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                void loadTrash()
              }
              disabled={
                loading ||
                emptying ||
                Boolean(busyPhotoId)
              }
              title="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading
                    ? "animate-spin"
                    : ""
                }`}
              />
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                void handleEmptyTrash()
              }
              disabled={
                photos.length === 0 ||
                emptying ||
                Boolean(busyPhotoId)
              }
              className="hidden sm:flex"
            >
              {emptying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}

              Empty Trash
            </Button>
          </div>
        </div>
      </header>

      {/* ==================================================
          Main
      ================================================== */}

      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">
        {/* ==================================================
            Error
        ================================================== */}

        {error ? (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />

            <div className="flex-1">
              <p className="font-medium">
                Something went wrong
              </p>

              <p className="mt-1 text-muted-foreground">
                {error}
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                void loadTrash()
              }
              disabled={
                loading ||
                emptying ||
                Boolean(busyPhotoId)
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : null}

        {/* ==================================================
            Empty Trash State
        ================================================== */}

        {photos.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex min-h-[55vh] flex-col items-center justify-center px-6 text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Trash2 className="h-9 w-9 text-muted-foreground" />
              </div>

              <h2 className="text-xl font-semibold">
                Trash is empty
              </h2>

              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Photos you move to Trash will appear here.
                You can restore them or permanently delete them.
              </p>

              <Button
                asChild
                variant="outline"
                className="mt-6"
              >
                <Link to="/dashboard">
                  Back to Photos
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ==================================================
                Trash Header
            ================================================== */}

            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">
                  {photos.length}{" "}
                  {photos.length === 1
                    ? "item"
                    : "items"}
                </p>

                <p className="text-xs text-muted-foreground">
                  Review your deleted photos before permanently removing them.
                </p>
              </div>

              {/* Mobile Empty Trash */}

              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  void handleEmptyTrash()
                }
                disabled={
                  emptying ||
                  Boolean(busyPhotoId)
                }
                className="sm:hidden"
              >
                {emptying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}

                Empty Trash
              </Button>
            </div>

            {/* ==================================================
                Photo Grid
            ================================================== */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {photos.map(
                (photo) => {
                  const mediaUrl =
                    photo.url ||
                    photo.downloadUrl ||
                    "";

                  const isVideo =
                    photo.contentType?.startsWith(
                      "video/",
                    ) ?? false;

                  const busy =
                    busyPhotoId ===
                    photo.photoId;

                  const displayName =
                    photo.name ||
                    photo.fileName ||
                    photo.originalFileName ||
                    "Untitled photo";

                  return (
                    <Card
                      key={
                        photo.photoId
                      }
                      className="group overflow-hidden"
                    >
                      {/* Media */}

                      <div className="relative aspect-square overflow-hidden bg-muted">
                        {mediaUrl ? (
                          isVideo ? (
                            <video
                              src={mediaUrl}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={
                                mediaUrl
                              }
                              alt={
                                displayName
                              }
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                              loading="lazy"
                              decoding="async"
                            />
                          )
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            {isVideo ? (
                              <Video className="h-10 w-10 text-muted-foreground" />
                            ) : (
                              <ImageIcon className="h-10 w-10 text-muted-foreground" />
                            )}
                          </div>
                        )}

                        {/* Trash Badge */}

                        <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                          In Trash
                        </div>

                        {/* Loading Overlay */}

                        {busy ? (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                            <div className="flex size-11 items-center justify-center rounded-full bg-background/90 shadow-lg">
                              <Loader2 className="size-5 animate-spin" />
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Information */}

                      <CardContent className="p-4">
                        <div className="min-w-0">
                          <p
                            className="truncate text-sm font-medium"
                            title={
                              displayName
                            }
                          >
                            {displayName}
                          </p>

                          <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                            <span>
                              Deleted{" "}
                              {formatDate(
                                photo.trashedAt,
                              )}
                            </span>

                            {photo.fileSize ? (
                              <>
                                <span>
                                  •
                                </span>

                                <span>
                                  {formatFileSize(
                                    photo.fileSize,
                                  )}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        {/* Actions */}

                        <div className="mt-4 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            disabled={
                              busy ||
                              emptying
                            }
                            onClick={() =>
                              void handleRestore(
                                photo,
                              )
                            }
                          >
                            {busy ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="mr-2 h-4 w-4" />
                            )}

                            Restore
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            disabled={
                              busy ||
                              emptying
                            }
                            onClick={() =>
                              void handleDeleteForever(
                                photo,
                              )
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />

                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                },
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default TrashPage;