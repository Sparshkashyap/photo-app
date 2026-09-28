import {
  FileAudio,
  Heart,
  ImageOff,
  Loader2,
  Play,
  RotateCw,
  Video,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
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

  onMoved?: (
    photo: Photo,
    folderId: string | null,
  ) => void;

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

const SETTINGS_CHANGED_EVENT =
  "photo-app-settings-changed";

function getSettings(): PhotoAppSettings {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored =
      localStorage.getItem(SETTINGS_KEY);

    if (!stored) {
      return {};
    }

    return JSON.parse(
      stored,
    ) as PhotoAppSettings;
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
  const [downloading, setDownloading] =
    useState(false);

  const [previewOpen, setPreviewOpen] =
    useState(false);

  const [settings, setSettings] =
    useState<PhotoAppSettings>(
      getSettings,
    );

  const [mediaError, setMediaError] =
    useState(false);

  const [mediaLoaded, setMediaLoaded] =
    useState(false);

  const [isFavorite, setIsFavorite] =
    useState(
      photo.isFavorite === true,
    );

  // ==================================================
  // SETTINGS
  // ==================================================

  useEffect(() => {
    const refreshSettings = () => {
      setSettings(getSettings());
    };

    window.addEventListener(
      "storage",
      refreshSettings,
    );

    window.addEventListener(
      SETTINGS_CHANGED_EVENT,
      refreshSettings,
    );

    return () => {
      window.removeEventListener(
        "storage",
        refreshSettings,
      );

      window.removeEventListener(
        SETTINGS_CHANGED_EVENT,
        refreshSettings,
      );
    };
  }, []);

  // ==================================================
  // SYNC FAVORITE STATE
  // ==================================================

  useEffect(() => {
    setIsFavorite(
      photo.isFavorite === true,
    );
  }, [photo.isFavorite]);

  // ==================================================
  // RESET MEDIA STATE WHEN PHOTO CHANGES
  // ==================================================

  useEffect(() => {
    setMediaError(false);
    setMediaLoaded(false);
  }, [photo.photoId]);

  // ==================================================
  // ESCAPE FULLSCREEN
  // ==================================================

  useEffect(() => {
    if (!previewOpen) {
      return;
    }

    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setPreviewOpen(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [previewOpen]);

  // ==================================================
  // LOCK BODY SCROLL WHILE PREVIEW IS OPEN
  // ==================================================

  useEffect(() => {
    if (!previewOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [previewOpen]);

  // ==================================================
  // DATA
  // ==================================================

  const isVideo =
    photo.contentType?.startsWith(
      "video/",
    ) ?? false;

  const isAudio =
    photo.contentType?.startsWith(
      "audio/",
    ) ?? false;

  const mediaUrl =
    photo.url ||
    photo.downloadUrl ||
    "";

  const displayName =
    photo.name ||
    photo.fileName ||
    photo.originalFileName ||
    "Untitled";

  const autoplayVideos =
    settings.autoplayVideos === true;

  const showFileNames =
    settings.showFileNames !== false;

  // ==================================================
  // DOWNLOAD
  // ==================================================

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

      document.body.appendChild(
        link,
      );

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

  // ==================================================
  // PREVIEW
  // ==================================================

  function handlePreviewOpen() {
    if (!mediaUrl || mediaError) {
      return;
    }

    setPreviewOpen(true);
  }

  // ==================================================
  // CHECK INTERACTIVE ELEMENT
  //
  // This is important because keyboard events from
  // Rename inputs / buttons / media controls should
  // never be interpreted as card keyboard shortcuts.
  // ==================================================

  function isInteractiveTarget(
    target: EventTarget | null,
  ) {
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

    if (
      target.isContentEditable
    ) {
      return true;
    }

    return Boolean(
      target.closest(
        "input, textarea, select, button, video, audio, [contenteditable='true']",
      ),
    );
  }

  // ==================================================
  // KEYBOARD PREVIEW
  //
  // IMPORTANT:
  // Space is intentionally NOT handled here.
  //
  // Only Enter opens the preview.
  // ==================================================

  function handlePreviewKeyDown(
    event: ReactKeyboardEvent<HTMLElement>,
  ) {
    if (
      isInteractiveTarget(
        event.target,
      )
    ) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      handlePreviewOpen();
    }
  }

  // ==================================================
  // KEYBOARD CAPTURE
  //
  // Prevents Space / Enter from bubbling from inputs
  // such as Rename into the PhotoCard.
  //
  // IMPORTANT:
  // We DO NOT preventDefault().
  //
  // Therefore:
  // Space still types a space.
  // Enter still works normally where appropriate.
  // Video controls remain native.
  // ==================================================

  function handleCardKeyDownCapture(
    event: ReactKeyboardEvent<HTMLElement>,
  ) {
    if (
      !isInteractiveTarget(
        event.target,
      )
    ) {
      return;
    }

    if (
      event.key === " " ||
      event.key === "Spacebar" ||
      event.key === "Enter"
    ) {
      event.stopPropagation();
    }
  }

  // ==================================================
  // MEDIA LOADED
  // ==================================================

  function handleMediaLoaded() {
    setMediaLoaded(true);
    setMediaError(false);
  }

  // ==================================================
  // MEDIA ERROR
  // ==================================================

  function handleMediaError() {
    setMediaLoaded(false);
    setMediaError(true);
  }

  // ==================================================
  // RETRY MEDIA
  // ==================================================

  function handleRetryMedia() {
    setMediaError(false);
    setMediaLoaded(false);

    /*
     * Adding a cache-busting query forces the browser
     * to request the signed URL again when necessary.
     */
    const separator =
      mediaUrl.includes("?")
        ? "&"
        : "?";

    const retryUrl =
      `${mediaUrl}${separator}retry=${Date.now()}`;

    const mediaElement =
      document.querySelector(
        `[data-photo-id="${photo.photoId}"] img, [data-photo-id="${photo.photoId}"] video`,
      ) as
        | HTMLImageElement
        | HTMLVideoElement
        | null;

    if (mediaElement) {
      mediaElement.src = retryUrl;

      if (
        mediaElement instanceof
        HTMLVideoElement
      ) {
        mediaElement.load();
      }
    }
  }

  // ==================================================
  // FAVORITE
  // ==================================================

  function handleFavorite(
    updatedPhoto: Photo,
  ) {
    setIsFavorite(
      updatedPhoto.isFavorite === true,
    );

    onFavorite?.(updatedPhoto);
  }

  // ==================================================
  // RENDER
  // ==================================================

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
        {/* ==================================================
            FIXED GALLERY CARD

            The gallery card is ALWAYS square.

            The actual media keeps its ORIGINAL aspect ratio.
            Nothing is stretched.
            Nothing is cropped.

            Examples:

            1920x1080 video
            -> remains landscape

            1080x1920 video
            -> remains portrait

            1080x1080 video
            -> remains square
        ================================================== */}

        <div
          data-photo-id={photo.photoId}
          onDoubleClick={handlePreviewOpen}
          onKeyDownCapture={
            handleCardKeyDownCapture
          }
          onKeyDown={
            handlePreviewKeyDown
          }
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
          {/* ==================================================
              IMAGE BLURRED BACKGROUND

              This only fills the empty area.
              It does NOT affect the actual media.
          ================================================== */}

          {!isVideo &&
          !isAudio &&
          mediaUrl &&
          !mediaError ? (
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

          {/* Dark overlay */}
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

          {/* ==================================================
              LOADING
          ================================================== */}

          {mediaUrl &&
          !mediaError &&
          !mediaLoaded ? (
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

          {/* ==================================================
              ERROR / NO MEDIA
          ================================================== */}

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
                {mediaError
                  ? "Unable to load media"
                  : "Preview unavailable"}
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

          {/* ==================================================
              VIDEO

              IMPORTANT:

              The video itself is NOT square.

              h-auto + w-auto
              max-h-full
              max-w-full
              object-contain

              preserves the video's real aspect ratio.

              The surrounding gallery card is square,
              but the video is not forced into a square.
          ================================================== */}

          {!mediaError &&
          mediaUrl &&
          isVideo ? (
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
                /*
                 * Let the parent handle the double-click
                 * for preview.
                 */
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
                onLoadedMetadata={
                  handleMediaLoaded
                }
                onLoadedData={
                  handleMediaLoaded
                }
                onError={
                  handleMediaError
                }
                className={`
                  block
                  h-auto
                  w-auto
                  max-h-full
                  max-w-full
                  object-contain
                  transition-opacity
                  duration-300
                  ${
                    mediaLoaded
                      ? "opacity-100"
                      : "opacity-0"
                  }
                `}
              />

              {/* Play indicator */}

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

              {/* Video label */}

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

          {/* ==================================================
              AUDIO
          ================================================== */}

          {!mediaError &&
          mediaUrl &&
          isAudio ? (
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
                onClick={(event) =>
                  event.stopPropagation()
                }
                onDoubleClick={(event) =>
                  event.stopPropagation()
                }
                onKeyDown={(event) =>
                  event.stopPropagation()
                }
              >
                <audio
                  src={mediaUrl}
                  controls
                  preload="metadata"
                  onLoadedData={
                    handleMediaLoaded
                  }
                  onError={
                    handleMediaError
                  }
                  className="w-full"
                />
              </div>
            </div>
          ) : null}

          {/* ==================================================
              IMAGE

              Original aspect ratio preserved.
          ================================================== */}

          {!mediaError &&
          mediaUrl &&
          !isVideo &&
          !isAudio ? (
            <img
              key={mediaUrl}
              src={mediaUrl}
              alt={displayName}
              loading="lazy"
              decoding="async"
              onLoad={
                handleMediaLoaded
              }
              onError={
                handleMediaError
              }
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
                ${
                  mediaLoaded
                    ? "opacity-100"
                    : "opacity-0"
                }
              `}
            />
          ) : null}

          {/* ==================================================
              BOTTOM GRADIENT
          ================================================== */}

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

          {/* ==================================================
              FAVORITE ICON
          ================================================== */}

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

          {/* ==================================================
              FILE NAME
          ================================================== */}

          {showFileNames ? (
            <figcaption
              className="
                pointer-events-none
                absolute
                inset-x-3
                bottom-3
                z-[9]
                truncate
                pr-12
                text-xs
                font-semibold
                text-white
                drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]
              "
            >
              {displayName}
            </figcaption>
          ) : null}

          {/* ==================================================
              THREE DOT MENU
          ================================================== */}

          <div
            className="
              absolute
              right-2
              top-2
              z-20
            "
            onClick={(event) =>
              event.stopPropagation()
            }
            onDoubleClick={(event) =>
              event.stopPropagation()
            }
            onKeyDown={(event) =>
              event.stopPropagation()
            }
          >
            <PhotoMenu
              photo={photo}
              folders={folders}
              onRenamed={
                onRenamed ??
                (() => {})
              }
              onMoved={
                onMoved ??
                (() => {})
              }
              onDownload={() => {
                void handleDownload();
              }}
              onTrashed={
                onTrashed ??
                (() => {})
              }
              onFavorite={
                handleFavorite
              }
            />
          </div>

          {/* ==================================================
              DOWNLOAD LOADING
          ================================================== */}

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

      {/* ======================================================
          FULL SCREEN ORIGINAL PREVIEW

          IMPORTANT:

          There is NO fixed width/height here.

          The browser calculates the media's real dimensions.

          max-height / max-width only prevent it from
          overflowing the screen.

          Therefore:

          Horizontal:
          1920x1080 -> horizontal

          Vertical:
          1080x1920 -> vertical

          Square:
          1080x1080 -> square
      ====================================================== */}

      {previewOpen ? (
        <div
          className="
            fixed
            inset-0
            z-[100]
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
          onClick={() =>
            setPreviewOpen(false)
          }
        >
          {/* ==================================================
              CLOSE BUTTON
          ================================================== */}

          <button
            type="button"
            onClick={() =>
              setPreviewOpen(false)
            }
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

          {/* ==================================================
              ORIGINAL MEDIA
          ================================================== */}

          <div
            className="
              relative
              flex
              max-h-[94vh]
              max-w-[96vw]
              items-center
              justify-center
              motion-safe:animate-in
              motion-safe:zoom-in-95
              motion-safe:duration-200
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* ==================================================
                FULLSCREEN VIDEO

                No object-cover.
                No aspect-square.
                No forced width.
                No forced height.

                Only max dimensions are applied.
            ================================================== */}

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
                  max-h-[92vh]
                  max-w-[95vw]
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
                  flex-col
                  items-center
                  gap-6
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/70
                  p-8
                  shadow-2xl
                  backdrop-blur
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

                <audio
                  src={mediaUrl}
                  controls
                  autoPlay
                  className="w-full"
                />
              </div>
            ) : (
              <img
                src={mediaUrl}
                alt={displayName}
                className="
                  block
                  h-auto
                  w-auto
                  max-h-[92vh]
                  max-w-[95vw]
                  rounded-lg
                  object-contain
                  shadow-2xl
                "
              />
            )}
          </div>

          {/* ==================================================
              FULLSCREEN FILE NAME
          ================================================== */}

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
        </div>
      ) : null}
    </>
  );
}

export default PhotoCard;