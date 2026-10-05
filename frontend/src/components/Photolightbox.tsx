import { ChevronLeft, ChevronRight, FileAudio, Loader2, Sparkles, X } from "lucide-react";

import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";

import { createPortal } from "react-dom";

import type { Photo } from "@/types/photo";

type PhotoLightboxProps = {
  photos: Photo[];
  index: number;
  showFileNames?: boolean;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

const SWIPE_THRESHOLD = 50;

function getMediaUrl(photo: Photo) {
  return photo.url || photo.downloadUrl || "";
}

function getName(photo: Photo) {
  return photo.name || photo.fileName || photo.originalFileName || "Untitled";
}

export function PhotoLightbox({
  photos,
  index,
  showFileNames = true,
  onIndexChange,
  onClose,
}: PhotoLightboxProps) {
  const photo = photos[index];

  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const closeRef = useRef<HTMLButtonElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  const goPrev = useCallback(() => {
    if (index > 0) onIndexChange(index - 1);
  }, [index, onIndexChange]);

  const goNext = useCallback(() => {
    if (index < photos.length - 1) onIndexChange(index + 1);
  }, [index, photos.length, onIndexChange]);

  // Keyboard: Esc closes, arrows navigate.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        goPrev();
      } else if (event.key === "ArrowRight") {
        goNext();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [goPrev, goNext, onClose]);

  // Lock page scroll and restore focus to whatever opened the viewer.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  // Preload neighbours so next/prev feels instant.
  useEffect(() => {
    [photos[index - 1], photos[index + 1]].forEach((neighbour) => {
      if (!neighbour) return;

      const contentType = neighbour.contentType ?? "";
      if (contentType.startsWith("video/") || contentType.startsWith("audio/")) return;

      const url = getMediaUrl(neighbour);
      if (url) {
        const image = new Image();
        image.src = url;
      }
    });
  }, [index, photos]);

  if (!photo) {
    return null;
  }

  const isVideo = photo.contentType?.startsWith("video/") ?? false;
  const isAudio = photo.contentType?.startsWith("audio/") ?? false;
  const mediaUrl = getMediaUrl(photo);
  const displayName = getName(photo);
  const loading = !isVideo && !isAudio && mediaUrl !== loadedUrl && mediaUrl !== failedUrl;
  const failed = mediaUrl === failedUrl;

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;

    touchStartX.current = null;

    if (start === null || end === undefined) return;

    const delta = end - start;

    if (Math.abs(delta) < SWIPE_THRESHOLD) return;

    if (delta > 0) goPrev();
    else goNext();
  }

  const navButtonClass =
    "absolute top-1/2 z-[110] hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:scale-90 sm:flex";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${displayName}`}
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-[110] flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent p-3 sm:p-5">
        <div className="min-w-0 pl-1 text-white">
          {showFileNames ? <p className="truncate text-sm font-medium">{displayName}</p> : null}

          {photos.length > 1 ? (
            <p className="text-xs text-white/60" aria-live="polite">
              {index + 1} of {photos.length}
            </p>
          ) : null}
        </div>

        <button
          ref={closeRef}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          aria-label="Close preview"
          title="Close (Esc)"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:scale-90"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Prev / Next */}
      {hasPrev ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            goPrev();
          }}
          aria-label="Previous"
          title="Previous (←)"
          className={`${navButtonClass} left-4`}
        >
          <ChevronLeft className="size-6" />
        </button>
      ) : null}

      {hasNext ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            goNext();
          }}
          aria-label="Next"
          title="Next (→)"
          className={`${navButtonClass} right-4`}
        >
          <ChevronRight className="size-6" />
        </button>
      ) : null}

      {/* Media */}
      <div
        className="relative flex max-h-[calc(100dvh-120px)] max-w-[calc(100vw-24px)] items-center justify-center sm:max-w-[calc(100vw-160px)]"
        onClick={(event) => event.stopPropagation()}
      >
        {loading ? (
          <Loader2 className="absolute size-8 animate-spin text-white/70" aria-label="Loading" />
        ) : null}

        {failed || !mediaUrl ? (
          <p className="rounded-xl border border-white/10 bg-black/60 px-5 py-4 text-sm text-white/80">
            This file couldn't be loaded. Close the preview and try again.
          </p>
        ) : isVideo ? (
          <video
            key={mediaUrl}
            src={mediaUrl}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="block h-auto max-h-[calc(100dvh-120px)] w-auto max-w-full rounded-lg object-contain shadow-2xl"
          />
        ) : isAudio ? (
          <div className="flex w-[min(92vw,720px)] flex-col items-center gap-6 rounded-2xl border border-white/10 bg-black/70 p-6 shadow-2xl backdrop-blur sm:p-8">
            <FileAudio className="size-20 text-white" />

            <p className="max-w-full truncate text-sm font-medium text-white">{displayName}</p>

            <audio key={mediaUrl} src={mediaUrl} controls autoPlay className="w-full" />
          </div>
        ) : (
          <img
            key={mediaUrl}
            src={mediaUrl}
            alt={displayName}
            onLoad={() => setLoadedUrl(mediaUrl)}
            onError={() => setFailedUrl(mediaUrl)}
            draggable={false}
            className={`block h-auto max-h-[calc(100dvh-120px)] w-auto max-w-full select-none rounded-lg object-contain shadow-2xl transition-opacity duration-200 ${
              loading ? "opacity-0" : "opacity-100"
            }`}
          />
        )}
      </div>

      {/* Caption */}
      {photo.caption ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[105] flex justify-center bg-gradient-to-t from-black/80 to-transparent p-4 pb-5 sm:pb-7">
          <div className="flex max-w-[min(92vw,720px)] items-start gap-2 text-sm font-medium text-white/95">
            <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="leading-5">{photo.caption}</span>
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

export default PhotoLightbox;
