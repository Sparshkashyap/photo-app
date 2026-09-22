import {
  Loader2,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import { toast } from "sonner";

import { PhotoMenu } from "@/components/PhotoMenu";

import {
  requestDownloadUrl,
} from "@/services/api";

import type { Folder } from "@/types/folder";
import type { Photo } from "@/types/photo";

type PhotoCardProps = {
  photo: Photo;

  folders: Folder[];

  onRenamed?: (
    photo: Photo,
  ) => void;

  onMoved?: (
    photo: Photo,
    folderId: string | null,
  ) => void;

  onTrashed?: (
    photo: Photo,
  ) => void;
};

export function PhotoCard({
  photo,
  folders,
  onRenamed,
  onMoved,
  onTrashed,
}: PhotoCardProps) {
  const [downloading, setDownloading] =
    useState(false);

  const [viewerOpen, setViewerOpen] =
    useState(false);

  // --------------------------------------------------
  // Download
  // --------------------------------------------------

  async function handleDownload() {
    if (downloading) {
      return;
    }

    setDownloading(true);

    try {
      const response =
        await requestDownloadUrl(
          photo.photoId,
        );

      const link =
        document.createElement("a");

      link.href =
        response.downloadUrl;

      link.download =
        photo.name ||
        photo.fileName ||
        "photo";

      link.target = "_blank";

      link.rel =
        "noopener noreferrer";

      document.body.appendChild(link);

      link.click();

      link.remove();

      toast.success(
        "Download started",
        {
          description:
            photo.name ||
            photo.fileName ||
            "Your file",
        },
      );
    } catch (error) {
      console.error(
        "Download failed:",
        error,
      );

      toast.error(
        "Download failed",
        {
          description:
            error instanceof Error
              ? error.message
              : "Please try again.",
        },
      );
    } finally {
      setDownloading(false);
    }
  }

  // --------------------------------------------------
  // Photo Viewer
  // --------------------------------------------------

  function openViewer() {
    if (!mediaUrl) {
      toast.error(
        "Photo preview is not available",
      );

      return;
    }

    setViewerOpen(true);
  }

  function closeViewer() {
    setViewerOpen(false);
  }

  // --------------------------------------------------
  // ESC key
  // --------------------------------------------------

  useEffect(() => {
    if (!viewerOpen) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        closeViewer();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [viewerOpen]);

  const isVideo =
    photo.contentType?.startsWith(
      "video/",
    ) ?? false;

  const mediaUrl =
    photo.url ||
    photo.downloadUrl ||
    "";

  const displayName =
    photo.name ||
    photo.fileName ||
    photo.originalFileName ||
    "Untitled photo";

  return (
    <>
      {/* =================================================
          PHOTO CARD
      ================================================= */}

      <figure className="group relative overflow-hidden rounded-xl border border-border bg-surface-muted">
        {/* ------------------------------------------------
            Media
        ------------------------------------------------ */}

        {isVideo ? (
          <video
            src={mediaUrl}
            controls
            preload="metadata"
            onDoubleClick={openViewer}
            className="aspect-square w-full cursor-zoom-in object-cover"
          />
        ) : (
          <img
            src={mediaUrl}
            alt={displayName}
            loading="lazy"
            decoding="async"
            onDoubleClick={openViewer}
            className="aspect-square w-full cursor-zoom-in object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
          />
        )}

        {/* ------------------------------------------------
            Bottom Gradient
        ------------------------------------------------ */}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block" />

        {/* ------------------------------------------------
            Photo Name
        ------------------------------------------------ */}

        <figcaption className="pointer-events-none absolute inset-x-3 bottom-3 hidden truncate text-xs font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block">
          {displayName}
        </figcaption>

        {/* ------------------------------------------------
            Photo Menu
        ------------------------------------------------ */}

        <div className="absolute right-2 top-2">
          <PhotoMenu
            photo={photo}
            folders={folders}
            onRenamed={
              onRenamed ??
              ((_: Photo) => {})
            }
            onMoved={
              onMoved ??
              ((_: Photo, __: string | null) => {})
            }
            onDownload={() => {
              void handleDownload();
            }}
            onTrashed={
              onTrashed ??
              ((_: Photo) => {})
            }
          />
        </div>

        {/* ------------------------------------------------
            Download Loading Overlay
        ------------------------------------------------ */}

        {downloading ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30">
            <span className="flex size-10 items-center justify-center rounded-full bg-background/90 shadow">
              <Loader2 className="size-5 animate-spin" />
            </span>
          </div>
        ) : null}
      </figure>

      {/* =================================================
          FULLSCREEN PHOTO VIEWER
      ================================================= */}

      {viewerOpen ? (
        <div
          className="fixed inset-0 z-[9999] flex h-[100dvh] w-screen items-center justify-center bg-black/95 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Viewing ${displayName}`}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeViewer();
            }
          }}
        >
          {/* ------------------------------------------------
              Top Bar
          ------------------------------------------------ */}

          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-3 py-3 sm:px-5 sm:py-4">
            {/* Photo Name */}

            <div className="pointer-events-auto min-w-0 max-w-[70%]">
              <p className="truncate rounded-full bg-black/45 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-md">
                {displayName}
              </p>
            </div>

            {/* Close */}

            <button
              type="button"
              onClick={closeViewer}
              aria-label="Close photo viewer"
              title="Close"
              className="pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white/15 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/70"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* ------------------------------------------------
              Main Viewer Area
          ------------------------------------------------ */}

          <div className="flex h-full w-full items-center justify-center overflow-hidden">
            {isVideo ? (
              <video
                src={mediaUrl}
                controls
                autoPlay
                playsInline
                className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
                onClick={(event) => {
                  event.stopPropagation();
                }}
              />
            ) : (
              <img
                src={mediaUrl}
                alt={displayName}
                draggable={false}
                className="max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl transition-transform duration-300 ease-out"
                onClick={(event) => {
                  event.stopPropagation();
                }}
              />
            )}
          </div>

          {/* ------------------------------------------------
              Bottom Hint
          ------------------------------------------------ */}

          <div className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 sm:block">
            <span className="rounded-full bg-black/45 px-4 py-2 text-xs text-white/60 backdrop-blur-md">
              Press ESC to close
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default PhotoCard;