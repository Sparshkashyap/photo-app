import {
  ImagePlus,
  Loader2,
} from "lucide-react";

import { PhotoCard } from "@/components/PhotoCard";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import type { Folder } from "@/types/folder";
import type { Photo } from "@/types/photo";

const gridClass =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";

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

  onTrashed?: ((photo: Photo) => void) | undefined;

  onRetry?: (() => void) | undefined;

  error?: string | undefined;

  deletingPhotoId?: string | null | undefined;
};

export function PhotoGallery({
  photos,
  folders,
  loading,
  onUploadClick,
  onRenamed,
  onMoved,
  onTrashed,
  onRetry,
  error,
}: PhotoGalleryProps) {
  if (loading) {
    return (
      <div
        className={gridClass}
        aria-busy="true"
        aria-label="Loading photos"
      >
        {Array.from({
          length: 10,
        }).map((_, index) => (
          <Skeleton
            key={index}
            className="aspect-square w-full rounded-xl"
          />
        ))}
      </div>
    );
  }

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
          Upload your first memory to get started.
        </p>

        <Button
          className="mt-6"
          onClick={onUploadClick}
        >
          Upload photo
        </Button>
      </div>
    );
  }

    return (
    <div
      className={gridClass}
      aria-label="Photo gallery"
    >
      {photos.map((photo) => (
        <PhotoCard
          key={photo.photoId}
          photo={photo}
          folders={folders}
          onRenamed={onRenamed}
          onMoved={onMoved}
          onTrashed={onTrashed ?? ((_: Photo) => {})}
        />
      ))}
    </div>
  );
}

export default PhotoGallery;