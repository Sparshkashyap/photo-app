import { ImagePlus } from "lucide-react";

import { PhotoCard } from "@/components/PhotoCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import type { Photo } from "@/types/photo";

const gridClass =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";

export function PhotoGallery({
  photos,
  loading,
  onUploadClick,
  onRenamed,
}: {
  photos: Photo[];
  loading: boolean;
  onUploadClick: () => void;
  onRenamed: (photo: Photo) => void;
}) {
  if (loading) {
    return (
      <div
        className={gridClass}
        aria-busy="true"
        aria-label="Loading photos"
      >
        {Array.from({ length: 10 }).map(
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

  if (photos.length === 0) {
    return (
      <div className="panel flex flex-col items-center px-6 py-16 text-center">
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
          Upload your first memory to get
          started.
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
    <div className={gridClass}>
      {photos.map((photo) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          onRenamed={onRenamed}
        />
      ))}
    </div>
  );
}