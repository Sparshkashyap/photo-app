import { FileAudio, Heart, ImageOff, Loader2, Play, RotateCw, Sparkles, Video, X } from "lucide-react";

import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { createPortal } from "react-dom";

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
  }, [photo.isFavorite]);

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

          {showFileNames || photo.caption ? (
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
                <div className="truncate text-xs font-semibold">{displayName}</div>
              ) : null}

              {photo.caption ? (
                <div className="mt-1 flex items-start gap-1.5 text-[11px] font-medium leading-4 text-white/90">
                  <Sparkles className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                  <span className="line-clamp-2">{photo.caption}</span>
                </div>
              ) : null}
            </figcaption>
          ) : null}

          <div
            className="
              absolute
              right-2
              top-2
              z-20
            "
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
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
              className="
                fixed
                inset-0
                z-[9999]
                flex
                items-center
                justify-center
                bg-black/95
                p-3
                backdrop-blur-sm
                sm:p-6
                motion-safe:animate-in
                motion-safe:fade-in
                motion-safe:duration-150
              "
              role="dialog"
              aria-modal="true"
              aria-label={`Preview of ${displayName}`}
              onClick={() => setPreviewOpen(false)}
            >
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                aria-label="Close preview"
                title="Close preview"
                className="
                  absolute
                  right-4
                  top-4
                  z-[110]
                  flex
                  size-11
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-white/20
                  bg-black/60
                  text-white
                  shadow-lg
                  backdrop-blur
                  transition
                  hover:bg-white/15
                  active:scale-90
                  focus:outline-none
                  focus:ring-2
                  focus:ring-white/50
                  sm:right-6
                  sm:top-6
                "
              >
                <X className="size-5" />
              </button>

              <div
                className="
                  relative
                  flex
                  max-h-[calc(100dvh-72px)]
                  max-w-[calc(100vw-24px)]
                  items-center
                  justify-center
                  motion-safe:animate-in
                  motion-safe:zoom-in-95
                  motion-safe:duration-200
                "
                onClick={(event) => event.stopPropagation()}
              >
                {isVideo ? (
                  <video
                    key={mediaUrl}
                    src={mediaUrl}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                    className="
                      block
                      h-auto
                      w-auto
                      max-h-[calc(100dvh-96px)]
                      max-w-[calc(100vw-24px)]
                      rounded-lg
                      object-contain
                      shadow-2xl
                    "
                  />
                ) : isAudio ? (
                  <div
                    className="
                      flex
                      w-[min(92vw,720px)]
                      max-h-[calc(100dvh-96px)]
                      flex-col
                      items-center
                      gap-6
                      overflow-auto
                      rounded-2xl
                      border
                      border-white/10
                      bg-black/70
                      p-6
                      shadow-2xl
                      backdrop-blur
                      sm:p-8
                    "
                  >
                    <FileAudio
                      className="
                        size-20
                        text-white
                      "
                    />

                    <p
                      className="
                        max-w-full
                        truncate
                        text-sm
                        font-medium
                        text-white
                      "
                    >
                      {displayName}
                    </p>

                    <audio src={mediaUrl} controls autoPlay className="w-full" />
                  </div>
                ) : (
                  <img
                    src={mediaUrl}
                    alt={displayName}
                    className="
                      block
                      h-auto
                      w-auto
                      max-h-[calc(100dvh-96px)]
                      max-w-[calc(100vw-24px)]
                      rounded-lg
                      object-contain
                      shadow-2xl
                    "
                  />
                )}

                {photo.caption ? (
                  <div className="pointer-events-none absolute bottom-3 left-1/2 z-[105] flex max-w-[min(92vw,720px)] -translate-x-1/2 items-start gap-2 rounded-xl border border-white/10 bg-black/65 px-4 py-3 text-sm font-medium text-white backdrop-blur sm:bottom-5">
                    <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span className="text-center leading-5">{photo.caption}</span>
                  </div>
                ) : null}
              </div>

              {showFileNames ? (
                <div
                  className="
                    pointer-events-none
                    absolute
                    bottom-4
                    left-1/2
                    max-w-[80vw]
                    -translate-x-1/2
                    truncate
                    rounded-full
                    border
                    border-white/10
                    bg-black/60
                    px-4
                    py-2
                    text-sm
                    font-medium
                    text-white
                    backdrop-blur
                    sm:bottom-6
                  "
                >
                  {displayName}
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export default PhotoCard;
