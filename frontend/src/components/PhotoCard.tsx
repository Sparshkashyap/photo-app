import {
  FileAudio,
  Heart,
  ImageOff,
  Loader2,
  Play,
  RotateCw,
  Sparkles,
  Video,
  X,
} from "lucide-react";

import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { createPortal } from "react-dom";

import { toast } from "sonner";

import { PhotoMenu } from "@/components/PhotoMenu";
import { generatePhotoCaption, requestDownloadUrl } from "@/services/api";

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

  const [caption, setCaption] = useState(photo.caption ?? null);

  const [generatingCaption, setGeneratingCaption] = useState(false);

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

  useEffect(() => {
    setIsFavorite(photo.isFavorite === true);
    setCaption(photo.caption ?? null);
  }, [photo.isFavorite, photo.caption]);

  useEffect(() => {
    setMediaError(false);
    setMediaLoaded(false);
  }, [photo.photoId]);

  useEffect(() => {
    if (!previewOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [previewOpen]);

  useEffect(() => {
    if (!previewOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [previewOpen]);

  const isVideo = photo.contentType?.startsWith("video/") ?? false;

  const isAudio = photo.contentType?.startsWith("audio/") ?? false;

  const mediaUrl = photo.url || photo.downloadUrl || "";

  const displayName = photo.name || photo.fileName || photo.originalFileName || "Untitled";

  const autoplayVideos = settings.autoplayVideos === true;

  const showFileNames = settings.showFileNames !== false;

  async function handleGenerateCaption() {
    if (generatingCaption || isVideo || isAudio) return;

    setGeneratingCaption(true);
    try {
      const response = await generatePhotoCaption(photo.photoId);
      setCaption(response.caption);
      toast.success("AI caption generated", { description: response.caption });
    } catch (error) {
      console.error("AI caption generation failed:", error);
      toast.error("AI caption generation failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setGeneratingCaption(false);
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

  function handlePreviewOpen() {
    if (!mediaUrl || mediaError) {
      return;
    }

    setPreviewOpen(true);
  }

  function isInteractiveTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLButtonElement ||
      target instanceof HTMLVideoElement ||
      target instanceof HTMLAudioElement
    ) {
      return true;
    }

    if (target.isContentEditable) {
      return true;
    }

    return Boolean(
      target.closest("input, textarea, select, button, video, audio, [contenteditable='true']"),
    );
  }

  function handlePreviewKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (isInteractiveTarget(event.target)) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      handlePreviewOpen();
    }
  }

  function handleCardKeyDownCapture(event: ReactKeyboardEvent<HTMLElement>) {
    if (!isInteractiveTarget(event.target)) {
      return;
    }

    if (event.key === " " || event.key === "Spacebar" || event.key === "Enter") {
      event.stopPropagation();
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

  function handleRetryMedia() {
    setMediaError(false);

    setMediaLoaded(false);

    const separator = mediaUrl.includes("?") ? "&" : "?";

    const retryUrl = `${mediaUrl}${separator}retry=${Date.now()}`;

    const mediaElement = document.querySelector(
      `[data-photo-id="${photo.photoId}"] img, [data-photo-id="${photo.photoId}"] video`,
    ) as HTMLImageElement | HTMLVideoElement | null;

    if (mediaElement) {
      mediaElement.src = retryUrl;

      if (mediaElement instanceof HTMLVideoElement) {
        mediaElement.load();
      }
    }
  }

  function handleFavorite(updatedPhoto: Photo) {
    setIsFavorite(updatedPhoto.isFavorite === true);

    onFavorite?.(updatedPhoto);
  }

  return (
    <>
      <figure
        className="
          group
          relative
          w-full
          overflow-hidden
          rounded-2xl
          border
          border-border
          bg-background
          shadow-sm
          transition-all
          duration-200
          hover:-translate-y-0.5
          hover:shadow-lg
        "
      >
        <div
          data-photo-id={photo.photoId}
          onDoubleClick={handlePreviewOpen}
          onKeyDownCapture={handleCardKeyDownCapture}
          onKeyDown={handlePreviewKeyDown}
          role="button"
          tabIndex={0}
          aria-label={`Open ${displayName} preview`}
          className="
            relative
            flex
            aspect-square
            w-full
            items-center
            justify-center
            overflow-hidden
            bg-black
            outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
            focus-visible:ring-offset-2
          "
        >
          {!isVideo && !isAudio && mediaUrl && !mediaError ? (
            <img
              src={mediaUrl}
              alt=""
              aria-hidden="true"
              className="
                absolute
                inset-0
                h-full
                w-full
                scale-110
                object-cover
                opacity-40
                blur-2xl
                transition-transform
                duration-500
                ease-out
                group-hover:scale-125
              "
            />
          ) : (
            <div
              className="
                absolute
                inset-0
                bg-gradient-to-br
                from-black
                via-zinc-900
                to-black
              "
            />
          )}

          <div
            className="
              absolute
              inset-0
              bg-black/10
              transition-colors
              duration-200
              group-hover:bg-black/0
            "
          />

          {mediaUrl && !mediaError && !mediaLoaded ? (
            <div
              className="
                absolute
                inset-0
                z-[1]
                animate-pulse
                bg-muted/30
              "
            />
          ) : null}

          {!mediaUrl || mediaError ? (
            <div
              className="
                relative
                z-[5]
                flex
                h-full
                w-full
                flex-col
                items-center
                justify-center
                gap-3
                bg-muted/80
                p-4
              "
            >
              {isVideo ? (
                <Video
                  className="
                    size-10
                    text-muted-foreground
                  "
                />
              ) : isAudio ? (
                <FileAudio
                  className="
                    size-10
                    text-muted-foreground
                  "
                />
              ) : (
                <ImageOff
                  className="
                    size-10
                    text-muted-foreground
                  "
                />
              )}

              <span
                className="
                  text-center
                  text-xs
                  text-muted-foreground
                "
              >
                {mediaError ? "Unable to load media" : "Preview unavailable"}
              </span>

              {mediaError ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();

                    handleRetryMedia();
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                  }}
                  className="
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-full
                    border
                    border-border
                    bg-background
                    px-3
                    py-1.5
                    text-xs
                    font-medium
                    transition
                    hover:bg-accent
                    active:scale-95
                  "
                >
                  <RotateCw className="size-3" />
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}

          {!mediaError && mediaUrl && isVideo ? (
            <div
              className="
                relative
                z-[3]
                flex
                h-full
                w-full
                items-center
                justify-center
              "
              onDoubleClick={(event) => {
                event.stopPropagation();

                handlePreviewOpen();
              }}
            >
              <video
                key={mediaUrl}
                src={mediaUrl}
                preload="metadata"
                autoPlay={autoplayVideos}
                muted={autoplayVideos}
                loop={autoplayVideos}
                playsInline
                onLoadedMetadata={handleMediaLoaded}
                onLoadedData={handleMediaLoaded}
                onError={handleMediaError}
                className={`
                  block
                  h-auto
                  w-auto
                  max-h-full
                  max-w-full
                  object-contain
                  transition-opacity
                  duration-300
                  ${mediaLoaded ? "opacity-100" : "opacity-0"}
                `}
              />

              {!autoplayVideos ? (
                <div
                  className="
                    pointer-events-none
                    absolute
                    left-1/2
                    top-1/2
                    flex
                    size-12
                    -translate-x-1/2
                    -translate-y-1/2
                    items-center
                    justify-center
                    rounded-full
                    bg-black/60
                    text-white
                    shadow-xl
                    backdrop-blur-sm
                    transition-transform
                    duration-200
                    group-hover:scale-110
                  "
                >
                  <Play
                    className="
                      ml-0.5
                      size-5
                      fill-current
                    "
                  />
                </div>
              ) : null}

              <span
                className="
                  pointer-events-none
                  absolute
                  bottom-3
                  left-3
                  rounded-md
                  bg-black/60
                  px-2
                  py-1
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-wide
                  text-white
                  backdrop-blur-sm
                "
              >
                Video
              </span>
            </div>
          ) : null}

          {!mediaError && mediaUrl && isAudio ? (
            <div
              className="
                relative
                z-[3]
                flex
                h-full
                w-full
                flex-col
                items-center
                justify-center
                gap-5
                p-5
              "
            >
              <FileAudio
                className="
                  size-14
                  text-white
                "
              />

              <div
                className="w-full"
                onClick={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
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

          {!mediaError && mediaUrl && !isVideo && !isAudio ? (
            <img
              key={mediaUrl}
              src={mediaUrl}
              alt={displayName}
              loading="lazy"
              decoding="async"
              onLoad={handleMediaLoaded}
              onError={handleMediaError}
              className={`
                relative
                z-[3]
                block
                h-auto
                w-auto
                max-h-full
                max-w-full
                object-contain
                transition-opacity
                duration-300
                ${mediaLoaded ? "opacity-100" : "opacity-0"}
              `}
            />
          ) : null}

          <div
            className="
              pointer-events-none
              absolute
              inset-x-0
              bottom-0
              z-[8]
              h-28
              bg-gradient-to-t
              from-black/75
              via-black/25
              to-transparent
              transition-opacity
              duration-200
              group-hover:opacity-100
            "
          />

          {isFavorite ? (
            <div
              className="
                pointer-events-none
                absolute
                left-3
                top-3
                z-10
                flex
                size-8
                items-center
                justify-center
                rounded-full
                bg-black/50
                text-white
                shadow
                backdrop-blur-sm
                motion-safe:animate-in
                motion-safe:zoom-in-75
                motion-safe:duration-200
              "
              aria-label="Favorite"
              title="Favorite"
            >
              <Heart
                className="
                  size-4
                  fill-current
                  text-rose-400
                "
              />
            </div>
          ) : null}

          {showFileNames || caption ? (
            <figcaption
              className="
                pointer-events-none
                absolute
                inset-x-3
                bottom-3
                z-[9]
                pr-12
                text-white
                drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]
              "
            >
              {showFileNames ? (
                <div className="truncate text-[11px] font-semibold sm:text-xs">{displayName}</div>
              ) : null}

              {caption ? (
                <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] font-medium leading-4 text-white/90 sm:mt-1 sm:items-start sm:gap-1.5 sm:text-[11px]">
                  <Sparkles className="size-3 shrink-0 sm:mt-0.5" aria-hidden="true" />
                  <span className="line-clamp-1 sm:line-clamp-2">{caption}</span>
                </div>
              ) : null}
            </figcaption>
          ) : null}

          <div
            className="
              absolute
              right-1.5
              top-1.5
              z-20
              flex
              items-center
              gap-1
              sm:right-2
              sm:top-2
              sm:gap-2
            "
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {!isVideo && !isAudio ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleGenerateCaption();
                }}
                disabled={generatingCaption}
                className="inline-flex size-8 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-sm transition hover:bg-black/75 active:scale-95 disabled:opacity-70 sm:size-9"
                title={caption ? "Regenerate AI caption" : "Generate AI caption"}
                aria-label={caption ? "Regenerate AI caption" : "Generate AI caption"}
              >
                {generatingCaption ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
              </button>
            ) : null}

            <div className="origin-top-right max-sm:scale-[0.88]">
              <PhotoMenu
                photo={photo}
                folders={folders}
                onRenamed={onRenamed ?? (() => {})}
                onMoved={onMoved ?? (() => {})}
                onDownload={() => {
                  void handleDownload();
                }}
                onTrashed={onTrashed ?? (() => {})}
                onFavorite={handleFavorite}
                onView={handlePreviewOpen}
              />
            </div>
          </div>

          {downloading ? (
            <div
              className="
                absolute
                inset-0
                z-30
                flex
                items-center
                justify-center
                bg-black/35
                backdrop-blur-[2px]
              "
            >
              <span
                className="
                  flex
                  size-11
                  items-center
                  justify-center
                  rounded-full
                  bg-background/95
                  shadow-xl
                "
              >
                <Loader2
                  className="
                    size-5
                    animate-spin
                  "
                />
              </span>
            </div>
          ) : null}
        </div>
      </figure>

      {previewOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-0 backdrop-blur-md motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
              role="dialog"
              aria-modal="true"
              aria-label={`Preview of ${displayName}`}
              onClick={() => setPreviewOpen(false)}
            >
              <div
                className="relative flex h-full w-full flex-col overflow-hidden bg-black sm:h-[96dvh] sm:max-h-[960px] sm:w-[96vw] sm:max-w-[1400px] sm:rounded-2xl sm:border sm:border-white/10 sm:shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-black/70 px-4 backdrop-blur-xl sm:px-5">
                  <div className="min-w-0 pr-4">
                    <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                    <p className="mt-0.5 text-[11px] text-white/50">
                      {isVideo ? "Video preview" : isAudio ? "Audio preview" : "Image preview"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewOpen(false)}
                    aria-label="Close preview"
                    title="Close preview"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_55%)] p-3 sm:p-6">
                  {isVideo ? (
                    <video
                      key={mediaUrl}
                      src={mediaUrl}
                      controls
                      autoPlay
                      playsInline
                      preload="metadata"
                      className="block max-h-full max-w-full rounded-xl object-contain shadow-2xl"
                    />
                  ) : isAudio ? (
                    <div className="flex w-[min(92vw,680px)] flex-col items-center gap-6 rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl sm:p-10">
                      <div className="flex size-20 items-center justify-center rounded-2xl bg-white/10 text-white">
                        <FileAudio className="size-10" />
                      </div>
                      <audio src={mediaUrl} controls autoPlay className="w-full" />
                    </div>
                  ) : (
                    <img
                      src={mediaUrl}
                      alt={displayName}
                      className="block max-h-full max-w-full rounded-xl object-contain shadow-2xl"
                    />
                  )}
                </div>

                {(showFileNames && displayName) || caption ? (
                  <div className="shrink-0 border-t border-white/10 bg-black/75 px-4 py-4 backdrop-blur-xl sm:px-6">
                    <div className="mx-auto max-w-4xl">
                      {showFileNames ? (
                        <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                      ) : null}

                      {caption ? (
                        <div className="mt-2 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5">
                          <Sparkles
                            className="mt-0.5 size-4 shrink-0 text-white/80"
                            aria-hidden="true"
                          />
                          <p className="text-sm leading-5 text-white/85">{caption}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export default PhotoCard;
