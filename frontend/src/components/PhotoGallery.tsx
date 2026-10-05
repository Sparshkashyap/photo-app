import { AlertTriangle, ImagePlus, Loader2 } from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PhotoCard } from "@/components/PhotoCard";
import { PhotoLightbox } from "@/components/Photolightbox";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import type { Folder } from "@/types/folder";
import type { Photo } from "@/types/photo";

const normalGridClass =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";

const compactGridClass =
  "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8";

const SETTINGS_KEY = "photo-app-settings";

// Dispatched by the Settings page after a write, so this grid reacts
// immediately in the same tab without polling localStorage.
const SETTINGS_CHANGED_EVENT = "photo-app-settings-changed";

// Cap staggered delays so a huge library doesn't wait on a long animation queue.
const MAX_STAGGERED_ITEMS = 24;

type PhotoAppSettings = {
  compactGrid?: boolean;
  showFileNames?: boolean;
};

type PhotoGalleryProps = {
  photos: Photo[];
  folders: Folder[];
  loading: boolean;
  onUploadClick: () => void;
  onRenamed: (photo: Photo) => void;
  onMoved: (photo: Photo, folderId: string | null) => void;
  onTrashed?: (photo: Photo) => void;
  onFavorite?: (photo: Photo) => void;
  onRetry?: () => void;
  error?: string;
  deletingPhotoId?: string | null;
};

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

export function PhotoGallery({
  photos,
  folders,
  loading,
  onUploadClick,
  onRenamed,
  onMoved,
  onTrashed,
  onFavorite,
  onRetry,
  error,
  deletingPhotoId,
}: PhotoGalleryProps) {
  const [settings, setSettings] = useState<PhotoAppSettings>(getSettings);
  const [openPhotoId, setOpenPhotoId] = useState<string | null>(null);

  // Captions generated in this session, so the viewer shows them even
  // before the parent refetches its list.
  const [captionOverrides, setCaptionOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    const refresh = () => setSettings(getSettings());

    window.addEventListener("storage", refresh);
    window.addEventListener(SETTINGS_CHANGED_EVENT, refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(SETTINGS_CHANGED_EVENT, refresh);
    };
  }, []);

  const compactGrid = settings.compactGrid === true;
  const showFileNames = settings.showFileNames !== false;
  const gridClass = compactGrid ? compactGridClass : normalGridClass;

  const viewerPhotos = useMemo(
    () =>
      photos.map((photo) => {
        const caption = captionOverrides[photo.photoId];

        return caption ? { ...photo, caption } : photo;
      }),
    [photos, captionOverrides],
  );

  const openIndex = openPhotoId
    ? viewerPhotos.findIndex((photo) => photo.photoId === openPhotoId)
    : -1;

  // If the open photo disappears (trashed, moved out of this view), close the viewer.
  useEffect(() => {
    if (openPhotoId && openIndex === -1) {
      setOpenPhotoId(null);
    }
  }, [openPhotoId, openIndex]);

  const handleOpen = useCallback((photo: Photo) => setOpenPhotoId(photo.photoId), []);

  const handleCloseViewer = useCallback(() => setOpenPhotoId(null), []);

  const handleIndexChange = useCallback(
    (index: number) => {
      const next = viewerPhotos[index];

      if (next) setOpenPhotoId(next.photoId);
    },
    [viewerPhotos],
  );

  const handleCaptionChange = useCallback((photo: Photo, caption: string) => {
    setCaptionOverrides((previous) => ({ ...previous, [photo.photoId]: caption }));
  }, []);

  // ==================================================
  // Loading state
  // ==================================================

  if (loading) {
    return (
      <div className={gridClass} role="status" aria-busy="true" aria-label="Loading photos">
        {Array.from({ length: compactGrid ? 16 : 12 }).map((_, index) => (
          <Skeleton
            key={index}
            className="aspect-square w-full rounded-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 motion-safe:fill-mode-both"
            style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
          />
        ))}
      </div>
    );
  }

  // ==================================================
  // Error state
  // ==================================================

  if (error) {
    return (
      <div
        role="alert"
        className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-6 text-destructive" aria-hidden="true" />
        </div>

        <div>
          <h3 className="font-semibold">Couldn't load your photos</h3>

          <p className="mt-1 max-w-md text-sm text-muted-foreground">{error}</p>
        </div>

        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            className="rounded-xl transition-transform active:scale-95"
          >
            Try again
          </Button>
        ) : null}
      </div>
    );
  }

  // ==================================================
  // Empty state
  // ==================================================

  if (photos.length === 0) {
    return (
      <div className="panel flex min-h-[300px] flex-col items-center justify-center px-6 py-16 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
        <span className="mb-5 inline-flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <ImagePlus className="size-6" aria-hidden="true" />
        </span>

        <h3 className="text-lg font-semibold">Nothing here yet</h3>

        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          Upload photos or videos and they'll show up here.
        </p>

        <Button
          className="mt-6 rounded-xl shadow-sm transition-all hover:shadow active:scale-95"
          onClick={onUploadClick}
        >
          Upload photos
        </Button>
      </div>
    );
  }

  // ==================================================
  // Photo grid
  // ==================================================

  return (
    <>
      <ul
        className={`${gridClass} list-none p-0`}
        aria-label={`Photo gallery, ${photos.length} items`}
      >
        {photos.map((photo, index) => {
          const isDeleting = deletingPhotoId === photo.photoId;

          return (
            <li
              key={photo.photoId}
              className="relative min-w-0 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 motion-safe:fill-mode-both"
              style={{
                animationDelay: `${Math.min(index, MAX_STAGGERED_ITEMS) * 20}ms`,
              }}
            >
              <PhotoCard
                photo={photo}
                folders={folders}
                onRenamed={onRenamed}
                onMoved={onMoved}
                onOpen={handleOpen}
                onCaptionChange={handleCaptionChange}
                {...(onTrashed ? { onTrashed } : {})}
                {...(onFavorite ? { onFavorite } : {})}
              />

              {isDeleting ? (
                <div
                  role="status"
                  className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-[1px] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
                >
                  <div className="flex items-center gap-2 rounded-full bg-background/95 px-4 py-2 text-sm font-medium shadow-lg">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    <span>Moving to Trash…</span>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {openIndex >= 0 ? (
        <PhotoLightbox
          photos={viewerPhotos}
          index={openIndex}
          showFileNames={showFileNames}
          onIndexChange={handleIndexChange}
          onClose={handleCloseViewer}
        />
      ) : null}
    </>
  );
}

export default PhotoGallery;
