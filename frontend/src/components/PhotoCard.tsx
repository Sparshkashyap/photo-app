import {
  FileAudio,
  Heart,
  ImageOff,
  Loader2,
  Pencil,
  Play,
  RotateCw,
  Sparkles,
  Video,
  X,
  Check,
} from "lucide-react";

import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { createPortal } from "react-dom";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { PhotoLightbox } from "@/components/Photolightbox";
import { PhotoMenu } from "@/components/PhotoMenu";
import {
  generatePhotoCaption,
  getPhoto,
  requestDownloadUrl,
  updatePhotoCaption,
} from "@/services/api";

import type { Folder } from "@/types/folder";
import type { Photo } from "@/types/photo";

type PhotoCardProps = {
  photo: Photo;
  folders: Folder[];

  onRenamed?: (photo: Photo) => void;
  onMoved?: (photo: Photo, folderId: string | null) => void;
  onTrashed?: (photo: Photo) => void;
  onFavorite?: (photo: Photo) => void;

  /**
   * When provided, the parent owns the preview (so it can offer prev/next
   * across the whole gallery). When omitted, the card opens its own viewer.
   */
  onOpen?: ((photo: Photo) => void) | undefined;

  /** Called after an AI caption is generated so the parent can keep it. */
  onCaptionChange?: ((photo: Photo, caption: string) => void) | undefined;
};

type PhotoAppSettings = {
  compactGrid?: boolean;
  confirmTrash?: boolean;
  autoplayVideos?: boolean;
  showFileNames?: boolean;
  darkMode?: boolean;
};

const SETTINGS_KEY = "photo-app-settings";
const SETTINGS_CHANGED_EVENT = "photo-app-settings-changed";

function getSettings(): PhotoAppSettings {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);

    return stored ? (JSON.parse(stored) as PhotoAppSettings) : {};
  } catch {
    return {};
  }
}

// Controls fade in on hover/focus for mouse users, and stay visible on touch.
const revealOnHover =
  "transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100";

export function PhotoCard({
  photo,
  folders,
  onRenamed,
  onMoved,
  onTrashed,
  onFavorite,
  onOpen,
  onCaptionChange,
}: PhotoCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [settings, setSettings] = useState<PhotoAppSettings>(getSettings);

  const [mediaError, setMediaError] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [isFavorite, setIsFavorite] = useState(photo.isFavorite === true);

  const [caption, setCaption] = useState(photo.caption ?? null);

  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(photo.caption ?? "");
  const [savingCaption, setSavingCaption] = useState(false);

  const isVideo = photo.contentType?.startsWith("video/") ?? false;

  const isAudio = photo.contentType?.startsWith("audio/") ?? false;

  const isImage = !isVideo && !isAudio;

  useEffect(() => {
    const refreshSettings = () => setSettings(getSettings());

    window.addEventListener("storage", refreshSettings);
    window.addEventListener(SETTINGS_CHANGED_EVENT, refreshSettings);

    return () => {
      window.removeEventListener("storage", refreshSettings);

      window.removeEventListener(SETTINGS_CHANGED_EVENT, refreshSettings);
    };
  }, []);

  useEffect(() => {
    setIsFavorite(photo.isFavorite === true);
    setCaption(photo.caption ?? null);
    if (!editingCaption) {
      setCaptionDraft(photo.caption ?? "");
    }
  }, [photo.isFavorite, photo.caption, editingCaption]);

  useEffect(() => {
    if (!isImage || (photo.captionStatus !== "pending" && photo.captionStatus !== "processing")) {
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const pollCaption = async () => {
      attempts += 1;

      try {
        const response = await getPhoto(photo.photoId);
        const updatedPhoto = response.photo;
        const nextStatus = updatedPhoto.captionStatus;

        if (cancelled) {
          return;
        }

        if (typeof updatedPhoto.caption === "string" && updatedPhoto.caption.trim()) {
          setCaption(updatedPhoto.caption);
          onCaptionChange?.(photo, updatedPhoto.caption);
          return;
        }

        if (nextStatus === "failed" || attempts >= 15) {
          return;
        }

        window.setTimeout(pollCaption, 4000);
      } catch (error) {
        console.error("Background caption status check failed:", error);

        if (!cancelled && attempts < 15) {
          window.setTimeout(pollCaption, 4000);
        }
      }
    };

    const timer = window.setTimeout(pollCaption, 4000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isImage, photo.captionStatus, photo.photoId, onCaptionChange]);

  useEffect(() => {
    setMediaError(false);
    setMediaLoaded(false);
    setRetryKey(0);
  }, [photo.photoId]);

  const baseUrl = photo.url || photo.downloadUrl || "";

  const mediaUrl = useMemo(() => {
    if (!baseUrl || retryKey === 0) {
      return baseUrl;
    }

    return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}retry=${retryKey}`;
  }, [baseUrl, retryKey]);

  const displayName = photo.name || photo.fileName || photo.originalFileName || "Untitled";

  const autoplayVideos = settings.autoplayVideos === true;

  const showFileNames = settings.showFileNames !== false;

  async function handleGenerateCaption() {
    if (generatingCaption || !isImage) {
      return;
    }

    setGeneratingCaption(true);

    try {
      const response = await generatePhotoCaption(photo.photoId);

      setCaption(response.caption);

      onCaptionChange?.(photo, response.caption);

      toast.success("Caption added", {
        description: response.caption,
      });
    } catch (error) {
      console.error("AI caption generation failed:", error);

      toast.error("Couldn't generate a caption", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setGeneratingCaption(false);
    }
  }

  function startCaptionEdit() {
    setCaptionDraft(caption ?? "");
    setEditingCaption(true);
  }

  function cancelCaptionEdit() {
    setCaptionDraft(caption ?? "");
    setEditingCaption(false);
  }

  async function saveCaptionEdit() {
    if (savingCaption) return;

    const nextCaption = captionDraft.trim();

    if (nextCaption.length > 500) {
      toast.error("Caption cannot exceed 500 characters");
      return;
    }

    setSavingCaption(true);

    try {
      const response = await updatePhotoCaption(photo.photoId, nextCaption);
      const updatedCaption = response.photo.caption?.trim() || null;

      setCaption(updatedCaption);
      setCaptionDraft(updatedCaption ?? "");
      setEditingCaption(false);

      onCaptionChange?.(photo, updatedCaption ?? "");

      toast.success("Caption updated");
    } catch (error) {
      console.error("Caption update failed:", error);
      toast.error("Couldn't update caption", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSavingCaption(false);
    }
  }

  async function handleDownload() {
    if (downloading) {
      return;
    }

    setDownloading(true);

    try {
      const response = await requestDownloadUrl(photo.photoId);

      const link = document.createElement("a");

      link.href = response.downloadUrl;

      link.download = photo.name || photo.fileName || "photo";

      link.target = "_blank";
      link.rel = "noopener noreferrer";

      document.body.appendChild(link);

      link.click();

      link.remove();

      toast.success("Download started", {
        description: displayName,
      });
    } catch (error) {
      console.error("Download failed:", error);

      toast.error("Download failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  }

  function handleOpen() {
    if (!mediaUrl || mediaError) {
      return;
    }

    if (onOpen) {
      onOpen(photo);
    } else {
      setPreviewOpen(true);
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    // Only react when the tile itself is focused,
    // not the buttons inside it.
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpen();
    }
  }

  function handleMediaLoaded() {
    setMediaLoaded(true);
    setMediaError(false);
  }

  function handleMediaError() {
    setMediaLoaded(false);
    setMediaError(true);
  }

  function handleRetry() {
    setMediaError(false);
    setMediaLoaded(false);

    setRetryKey((key) => key + 1);
  }

  function handleFavorite(updatedPhoto: Photo) {
    setIsFavorite(updatedPhoto.isFavorite === true);

    onFavorite?.(updatedPhoto);
  }

  const stopPropagation = {
    onClick: (event: { stopPropagation: () => void }) => event.stopPropagation(),

    onKeyDown: (event: { stopPropagation: () => void }) => event.stopPropagation(),
  };

  const canOpen = Boolean(mediaUrl) && !mediaError;

  return (
    <>
      <figure className="group relative w-full overflow-hidden rounded-2xl border border-border bg-muted shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:hover:translate-y-0">
        <div
          data-photo-id={photo.photoId}
          onClick={handleOpen}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-label={`Open ${displayName}`}
          className={`relative flex aspect-square w-full items-center justify-center overflow-hidden bg-zinc-950 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            canOpen ? "cursor-zoom-in" : "cursor-default"
          }`}
        >
          {/* Blurred backdrop */}
          {isImage && mediaUrl && !mediaError ? (
            <>
              <img
                src={mediaUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
              />

              <div className="absolute inset-0 bg-black/30" />
            </>
          ) : null}

          {/* Loading shimmer */}
          {mediaUrl && !mediaError && !mediaLoaded && !isAudio ? (
            <div className="absolute inset-0 z-[1] animate-pulse bg-muted-foreground/10" />
          ) : null}

          {/* Fallback / error */}
          {!mediaUrl || mediaError ? (
            <div className="relative z-[5] flex h-full w-full flex-col items-center justify-center gap-3 bg-muted p-4">
              {isVideo ? (
                <Video className="size-10 text-muted-foreground" />
              ) : isAudio ? (
                <FileAudio className="size-10 text-muted-foreground" />
              ) : (
                <ImageOff className="size-10 text-muted-foreground" />
              )}

              <span className="text-center text-xs text-muted-foreground">
                {mediaError ? "Couldn't load this file" : "No preview available"}
              </span>

              {mediaError ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRetry();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition hover:bg-accent active:scale-95"
                >
                  <RotateCw className="size-3" />
                  Try again
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Image */}
          {!mediaError && mediaUrl && isImage ? (
            <img
              key={mediaUrl}
              src={mediaUrl}
              alt={displayName}
              loading="lazy"
              decoding="async"
              onLoad={handleMediaLoaded}
              onError={handleMediaError}
              className={`relative z-[3] block h-full w-full object-contain transition-opacity duration-300 ${
                mediaLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : null}

          {/* Video */}
          {!mediaError && mediaUrl && isVideo ? (
            <div className="relative z-[3] flex h-full w-full items-center justify-center bg-black">
              <video
                key={mediaUrl}
                src={mediaUrl}
                preload="metadata"
                autoPlay={autoplayVideos}
                muted
                loop={autoplayVideos}
                playsInline
                onLoadedMetadata={handleMediaLoaded}
                onLoadedData={handleMediaLoaded}
                onError={handleMediaError}
                className={`block h-full w-full object-contain transition-opacity duration-300 ${
                  mediaLoaded ? "opacity-100" : "opacity-0"
                }`}
              />

              {!autoplayVideos ? (
                <div className="pointer-events-none absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-xl backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
                  <Play className="ml-0.5 size-5 fill-current" />
                </div>
              ) : null}

              <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                <Video className="size-3" aria-hidden="true" />
                Video
              </span>
            </div>
          ) : null}

          {/* Audio */}
          {!mediaError && mediaUrl && isAudio ? (
            <div className="relative z-[3] flex h-full w-full flex-col items-center justify-center gap-5 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-5">
              <FileAudio className="size-14 text-white" />

              <div className="w-full" {...stopPropagation}>
                <audio
                  src={mediaUrl}
                  controls
                  preload="metadata"
                  onLoadedData={handleMediaLoaded}
                  onError={handleMediaError}
                  className="w-full"
                />
              </div>
            </div>
          ) : null}

          {/* Legibility gradient */}
          {showFileNames || caption ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[8] h-28 bg-gradient-to-t from-black/75 via-black/25 to-transparent sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" />
          ) : null}

          {/* Favorite badge */}
          {isFavorite ? (
            <div
              className="pointer-events-none absolute bottom-3 right-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/50 text-white shadow backdrop-blur-sm motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:duration-200"
              role="img"
              aria-label="Favorite"
              title="Favorite"
            >
              <Heart className="size-4 fill-current text-rose-400" />
            </div>
          ) : null}

          {/* Name + caption */}
          {showFileNames || caption || editingCaption ? (
            <figcaption className="pointer-events-none absolute inset-x-3 bottom-3 z-[9] pr-11 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              {showFileNames ? (
                <div className="truncate text-xs font-semibold">{displayName}</div>
              ) : null}

              {caption ? (
                <div className="pointer-events-auto mt-1 flex items-start gap-1.5 text-[11px] font-medium leading-4 text-white/90">
                  <Sparkles className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 line-clamp-2">{caption}</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      startCaptionEdit();
                    }}
                    className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-full bg-black/45 text-white/80 transition hover:bg-black/70 hover:text-white"
                    title="Edit caption"
                    aria-label="Edit caption"
                  >
                    <Pencil className="size-3" />
                  </button>
                </div>
              ) : null}
            </figcaption>
          ) : null}

          {/* Actions */}
          <div className="absolute right-2 top-2 z-20 flex items-center gap-2" {...stopPropagation}>
            {isImage ? (
              <button
                type="button"
                onClick={() => void handleGenerateCaption()}
                disabled={generatingCaption}
                className={`${revealOnHover} hidden sm:inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white shadow backdrop-blur-sm hover:bg-black/75 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-100`}
                title={caption ? "Regenerate caption" : "Generate caption"}
                aria-label={caption ? "Regenerate caption" : "Generate caption"}
              >
                {generatingCaption ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
              </button>
            ) : null}

            <PhotoMenu
              photo={photo}
              folders={folders}
              onRenamed={onRenamed ?? (() => {})}
              onMoved={onMoved ?? (() => {})}
              onDownload={() => void handleDownload()}
              onTrashed={onTrashed ?? (() => {})}
              onFavorite={handleFavorite}
              onView={() => {
                if (onOpen) {
                  onOpen(photo);
                  return;
                }

                handleOpen();
              }}
              onCaptionChange={onCaptionChange ?? (() => {})}
            />
          </div>

          {/* Download overlay */}
          {downloading ? (
            <div
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 backdrop-blur-[2px]"
              role="status"
              aria-label="Preparing download"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-background/95 shadow-xl">
                <Loader2 className="size-5 animate-spin" />
              </span>
            </div>
          ) : null}
        </div>
      </figure>

      {editingCaption && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[500] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`edit-caption-title-${photo.photoId}`}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  cancelCaptionEdit();
                }
              }}
            >
              <div
                className="w-full max-w-lg rounded-2xl border border-border bg-background p-5 shadow-2xl"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2
                      id={`edit-caption-title-${photo.photoId}`}
                      className="text-base font-semibold"
                    >
                      Edit Caption
                    </h2>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{displayName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={cancelCaptionEdit}
                    disabled={savingCaption}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                    aria-label="Close caption editor"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <textarea
                  value={captionDraft}
                  onChange={(event) => setCaptionDraft(event.target.value.slice(0, 500))}
                  maxLength={500}
                  rows={5}
                  autoFocus
                  className="w-full resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm leading-5 outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                  placeholder="Add a caption..."
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelCaptionEdit();
                    }
                    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                      event.preventDefault();
                      void saveCaptionEdit();
                    }
                  }}
                />

                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{captionDraft.length}/500</span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelCaptionEdit}
                      disabled={savingCaption}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void saveCaptionEdit()}
                      disabled={savingCaption}
                    >
                      {savingCaption ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 size-4" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {previewOpen ? (
        <PhotoLightbox
          photos={[
            {
              ...photo,
              ...(caption ? { caption } : {}),
            },
          ]}
          index={0}
          showFileNames={showFileNames}
          onIndexChange={() => {}}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </>
  );
}

export default PhotoCard;
