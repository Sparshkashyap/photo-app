import {
  ImagePlus,
  Loader2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import { PhotoCard } from "@/components/PhotoCard";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import type { Folder } from "@/types/folder";
import type { Photo } from "@/types/photo";

const normalGridClass =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";

const compactGridClass =
  "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8";

const SETTINGS_KEY =
  "photo-app-settings";

type PhotoAppSettings = {
  compactGrid?: boolean;
};

type PhotoGalleryProps = {
  photos: Photo[];

  folders: Folder[];

  loading: boolean;

  onUploadClick: () => void;

  onRenamed: (
    photo: Photo,
  ) => void;

  onMoved: (
    photo: Photo,
    folderId: string | null,
  ) => void;

  onTrashed?: (
    photo: Photo,
  ) => void;

  onFavorite?: (
    photo: Photo,
  ) => void;

  onRetry?: () => void;

  error?: string;

  deletingPhotoId?: string | null;
};

function getCompactGridSetting() {
  if (
    typeof window ===
    "undefined"
  ) {
    return false;
  }

  try {
    const stored =
      localStorage.getItem(
        SETTINGS_KEY,
      );

    if (!stored) {
      return false;
    }

    const settings =
      JSON.parse(
        stored,
      ) as PhotoAppSettings;

    return (
      settings.compactGrid ===
      true
    );
  } catch {
    return false;
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
  const [
    compactGrid,
    setCompactGrid,
  ] = useState(
    getCompactGridSetting,
  );

  // ==================================================
  // Listen for settings changes
  // ==================================================

  useEffect(() => {
    function handleStorageChange() {
      setCompactGrid(
        getCompactGridSetting(),
      );
    }

    window.addEventListener(
      "storage",
      handleStorageChange,
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange,
      );
    };
  }, []);

  // ==================================================
  // Same-tab settings refresh
  // ==================================================

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        const next =
          getCompactGridSetting();

        setCompactGrid(
          (previous) =>
            previous === next
              ? previous
              : next,
        );
      }, 500);

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, []);

  const gridClass =
    compactGrid
      ? compactGridClass
      : normalGridClass;

  // ==================================================
  // Loading State
  // ==================================================

  if (loading) {
    return (
      <div
        className={gridClass}
        aria-busy="true"
        aria-label="Loading photos"
      >
        {Array.from({
          length: 10,
        }).map(
          (_, index) => (
            <Skeleton
              key={index}
              className="aspect-square w-full rounded-xl"
            />
          ),
        )}
      </div>
    );
  }

  // ==================================================
  // Error State
  // ==================================================

  if (error) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-surface px-6 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <Loader2 className="size-6 text-destructive" />
        </div>

        <div>
          <h3 className="font-semibold">
            Failed to load photos
          </h3>

          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {error}
          </p>
        </div>

        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
          >
            Try Again
          </Button>
        ) : null}
      </div>
    );
  }

  // ==================================================
  // Empty State
  // ==================================================

  if (photos.length === 0) {
    return (
      <div className="panel flex min-h-[300px] flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-5 inline-flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <ImagePlus
            className="size-6"
            aria-hidden="true"
          />
        </span>

        <h3 className="text-lg font-semibold">
          Your photos will appear here
        </h3>

        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          Upload your first memory
          to get started.
        </p>

        <Button
          className="mt-6"
          onClick={
            onUploadClick
          }
        >
          Upload photo
        </Button>
      </div>
    );
  }

  // ==================================================
  // Photo Grid
  // ==================================================

  return (
    <div
      className={gridClass}
      aria-label="Photo gallery"
    >
      {photos.map(
        (photo) => {
          const isDeleting =
            deletingPhotoId ===
            photo.photoId;

          return (
            <div
              key={photo.photoId}
              className="relative min-w-0"
            >
              <PhotoCard
                photo={photo}
                folders={folders}
                onRenamed={onRenamed}
                onMoved={onMoved}
                {...(onTrashed
                  ? {
                      onTrashed,
                    }
                  : {})}
                {...(onFavorite
                  ? {
                      onFavorite,
                    }
                  : {})}
              />

              {/* ==================================================
                  Individual Delete Loading State
              ================================================== */}

              {isDeleting ? (
                <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-black/30 backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 rounded-full bg-background/95 px-4 py-2 text-sm font-medium shadow-lg">
                    <Loader2 className="size-4 animate-spin" />

                    <span>
                      Moving to Trash...
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          );
        },
      )}
    </div>
  );
}

export default PhotoGallery;