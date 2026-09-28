import { Heart, ImageOff, Loader2, RotateCw, Video, X } from "lucide-react";

import {
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { toast } from "sonner";

import { PhotoMenu } from "@/components/PhotoMenu";

import { requestDownloadUrl } from "@/services/api";

import type { Folder } from "@/types/folder";
import type { Photo } from "@/types/photo";

type PhotoCardProps = {
  photo: Photo;

  folders: Folder[];

  onRenamed?: (photo: Photo) => void;

  onMoved?: (photo: Photo, folderId: string | null) => void;

  onTrashed?: (photo: Photo) => void;

  onFavorite?: (photo: Photo) => void;
};

type PhotoAppSettings = {
  compactGrid?: boolean;
  confirmTrash?: boolean;
  autoplayVideos?: boolean;
  showFileNames?: boolean;
  darkMode?: boolean;
};

const SETTINGS_KEY = "photo-app-settings";

// Dispatched by the Settings page after every write, so preferences
// (autoplay, file names, ...) take effect immediately in this tab too —
// the native "storage" event only fires in *other* tabs.
const SETTINGS_CHANGED_EVENT = "photo-app-settings-changed";

function getSettings(): PhotoAppSettings {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);

    if (!stored) {
      return {};
    }

    return JSON.parse(stored) as PhotoAppSettings;
  } catch {
    return {};
  }
}

export function PhotoCard({
  photo,
  folders,
  onRenamed,
  onMoved,
  onTrashed,
  onFavorite,
}: PhotoCardProps) {
  const [downloading, setDownloading] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);

  const [settings, setSettings] = useState<PhotoAppSettings>(getSettings);

  const [mediaError, setMediaError] = useState(false);

  const [mediaLoaded, setMediaLoaded] = useState(false);

  const [isFavorite, setIsFavorite] = useState(photo.isFavorite === true);

  // ==================================================
  // Listen for settings changes (same tab + other tabs)
  // ==================================================

  useEffect(() => {
    const refreshSettings = () => {
      setSettings(getSettings());
    };

    window.addEventListener("storage", refreshSettings);

    window.addEventListener(SETTINGS_CHANGED_EVENT, refreshSettings);

    return () => {
      window.removeEventListener("storage", refreshSettings);

      window.removeEventListener(SETTINGS_CHANGED_EVENT, refreshSettings);
    };
  }, []);

  // ==================================================
  // Synchronize favorite state
  // ==================================================

  useEffect(() => {
    setIsFavorite(photo.isFavorite === true);
  }, [photo.isFavorite]);

  // ==================================================
  // Download
  // ==================================================

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
        description: photo.name || photo.fileName || "Your file",
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

  // ==================================================
  // Media information
  // ==================================================

  const isVideo = photo.contentType?.startsWith("video/") ?? false;

  const mediaUrl = photo.url || photo.downloadUrl || "";

  const displayName = photo.name || photo.fileName || photo.originalFileName || "Untitled photo";

  const showFileNames = settings.showFileNames !== false;

  const autoplayVideos = settings.autoplayVideos === true;

  // ==================================================
  // Reset media state when the photo (or its URL) changes
  // ==================================================

  useEffect(() => {
    setMediaError(false);
    // Videos report "loaded" via onLoadedData below; for images
    // we still want the fade-in, so start hidden until onLoad fires.
    setMediaLoaded(isVideo);
  }, [photo.photoId, mediaUrl, isVideo]);

  // ==================================================
  // Close preview with Escape
  // ==================================================

  useEffect(() => {
    if (!previewOpen) {
      return;
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      document.body.style.overflow = previousOverflow;
    };
  }, [previewOpen]);

  // ==================================================
  // Open fullscreen preview
  //
  // A single click opens the preview (matching the
  // role="button" semantics below and the Enter/Space
  // keyboard handler) — a double-click requirement here
  // was invisible to users and inconsistent with keyboard use.
  // ==================================================

  function handlePreviewOpen(event: ReactMouseEvent<HTMLElement>) {
    if (event.target instanceof HTMLVideoElement) {
      return;
    }

    if (event.target instanceof HTMLElement && event.target.closest("button")) {
      return;
    }

    if (!mediaUrl || mediaError) {
      return;
    }

    setPreviewOpen(true);
  }

  // ==================================================
  // Keyboard preview
  // ==================================================

  function handlePreviewKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (mediaUrl && !mediaError) {
        setPreviewOpen(true);
      }
    }
  }

  // ==================================================
  // Media error / retry
  // ==================================================

  function handleMediaError() {
    setMediaError(true);
    setMediaLoaded(true);
  }

  function handleMediaLoaded() {
    setMediaLoaded(true);
  }

  function handleRetryMedia(event: ReactMouseEvent) {
    event.stopPropagation();
    setMediaError(false);
    setMediaLoaded(false);
  }

  // ==================================================
  // Favorite
  // ==================================================

  function handleFavorite(updatedPhoto: Photo) {
    const nextFavorite = updatedPhoto.isFavorite === true;

    setIsFavorite(nextFavorite);

    onFavorite?.(updatedPhoto);
  }

  return (
    <>
      {/* ==================================================
          Photo Card
      ================================================== */}

      <figure className="group relative overflow-hidden rounded-xl border border-border bg-surface-muted">
        {/* ==================================================
            Media
        ================================================== */}

        <div
          onClick={handlePreviewOpen}
          onKeyDown={handlePreviewKeyDown}
          role="button"
          tabIndex={0}
          aria-label={`Open ${displayName} preview`}
          className={`relative rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            mediaUrl && !mediaError ? "cursor-zoom-in" : "cursor-default"
          }`}
        >
          {/* Loading shimmer, visible until the media reports it's ready */}

          {mediaUrl && !mediaError && !mediaLoaded ? (
            <div className="absolute inset-0 z-[1] animate-pulse bg-muted" />
          ) : null}

          {/* Media unavailable */}

          {!mediaUrl || mediaError ? (
            <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-muted">
              {isVideo ? (
                <Video className="size-10 text-muted-foreground" />
              ) : (
                <ImageOff className="size-10 text-muted-foreground" />
              )}

              <span className="px-4 text-center text-xs text-muted-foreground">
                {mediaError ? "Unable to load media" : "Preview unavailable"}
              </span>

              {mediaError ? (
                <button
                  type="button"
                  onClick={handleRetryMedia}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium transition hover:bg-accent"
                >
                  <RotateCw className="size-3" />
                  Retry
                </button>
              ) : null}
            </div>
          ) : isVideo ? (
            <video
              src={mediaUrl}
              controls
              preload="metadata"
              autoPlay={autoplayVideos}
              muted={autoplayVideos}
              playsInline
              onLoadedData={handleMediaLoaded}
              onError={handleMediaError}
              className={`aspect-square w-full object-cover transition-[opacity,transform] duration-300 ease-out group-hover:scale-[1.04] ${
                mediaLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : (
            <img
              src={mediaUrl}
              alt={displayName}
              loading="lazy"
              decoding="async"
              onLoad={handleMediaLoaded}
              onError={handleMediaError}
              className={`aspect-square w-full object-cover transition-[opacity,transform] duration-300 ease-out group-hover:scale-[1.04] ${
                mediaLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          )}
        </div>

        {/* ==================================================
            Bottom gradient
        ================================================== */}

        {showFileNames ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        ) : null}

        {/* ==================================================
            Favorite indicator
        ================================================== */}

        {isFavorite ? (
          <div
            className="pointer-events-none absolute left-2 top-2 z-10 flex size-8 animate-in zoom-in-50 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm duration-200"
            aria-label="Favorite photo"
            title="Favorite"
          >
            <Heart className="size-4 fill-current text-rose-400" />
          </div>
        ) : null}

        {/* ==================================================
            Name
        ================================================== */}

        {showFileNames ? (
          <figcaption className="pointer-events-none absolute inset-x-3 bottom-3 hidden truncate text-xs font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block">
            {displayName}
          </figcaption>
        ) : null}

        {/* ==================================================
            Menu
        ================================================== */}

        <div
          className="absolute right-2 top-2 z-10"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <PhotoMenu
            photo={photo}
            folders={folders}
            onRenamed={onRenamed ?? ((_: Photo) => {})}
            onMoved={onMoved ?? ((_: Photo, __: string | null) => {})}
            onDownload={() => {
              void handleDownload();
            }}
            onTrashed={onTrashed ?? ((_: Photo) => {})}
            onFavorite={handleFavorite}
          />
        </div>

        {/* ==================================================
            Download overlay
        ================================================== */}

        {downloading ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
            <span className="flex size-10 items-center justify-center rounded-full bg-background/90 shadow-lg">
              <Loader2 className="size-5 animate-spin" />
            </span>
          </div>
        ) : null}
      </figure>

      {/* ==================================================
          Full Screen Preview
      ================================================== */}

      {previewOpen ? (
        <div
          className="fixed inset-0 z-[100] flex animate-in fade-in items-center justify-center bg-black/85 p-4 backdrop-blur-sm duration-150 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview of ${displayName}`}
          onClick={() => {
            setPreviewOpen(false);
          }}
        >
          {/* Close button */}

          <button
            type="button"
            onClick={() => {
              setPreviewOpen(false);
            }}
            aria-label="Close preview"
            title="Close preview"
            className="absolute right-4 top-4 z-[110] flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/50 sm:right-6 sm:top-6"
          >
            <X className="size-5" />
          </button>

          {/* Preview content */}

          <div
            className="relative flex max-h-[92vh] max-w-[95vw] animate-in zoom-in-95 items-center justify-center duration-150"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {isVideo ? (
              <video
                src={mediaUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
              />
            ) : (
              <img
                src={mediaUrl}
                alt={displayName}
                className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
              />
            )}
          </div>

          {/* Photo information */}

          {showFileNames ? (
            <div className="absolute bottom-4 left-1/2 max-w-[80vw] -translate-x-1/2 truncate rounded-full border border-white/10 bg-black/60 px-4 py-2 text-sm font-medium text-white backdrop-blur sm:bottom-6">
              {displayName}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export default PhotoCard;
