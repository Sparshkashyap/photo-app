import {
  CheckCircle2,
  ImageUp,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Progress } from "@/components/ui/progress";

import {
  ALLOWED_EXTENSIONS_LABEL,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  formatFileSize,
} from "@/lib/constants";

import {
  requestUploadUrl,
  uploadToPresignedUrl,
  confirmUpload,
} from "@/services/api";

import type { Photo } from "@/types/photo";

type Status =
  | "idle"
  | "uploading"
  | "success";

export function UploadPhoto({
  open,
  onOpenChange,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (photo: Photo) => void;
}) {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [file, setFile] =
    useState<File | null>(null);

  const [photoName, setPhotoName] =
    useState("");

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [dragging, setDragging] =
    useState(false);

  const [status, setStatus] =
    useState<Status>("idle");

  const [progress, setProgress] =
    useState(0);

  const [error, setError] =
    useState<string | null>(null);

  // --------------------------------------------------
  // Preview
  // --------------------------------------------------

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url =
      URL.createObjectURL(file);

    setPreviewUrl(url);

    return () =>
      URL.revokeObjectURL(url);
  }, [file]);

  // --------------------------------------------------
  // Reset
  // --------------------------------------------------

  function reset() {
    setFile(null);
    setPhotoName("");
    setStatus("idle");
    setProgress(0);
    setError(null);
    setDragging(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  // --------------------------------------------------
  // Select file
  // --------------------------------------------------

  function selectFile(
    candidate: File | undefined,
  ) {
    if (!candidate) return;

    if (
      !(ALLOWED_MIME_TYPES as readonly string[])
        .includes(candidate.type)
    ) {
      setFile(null);

      setError(
        `That file type isn't supported. Please choose a ${ALLOWED_EXTENSIONS_LABEL} image.`,
      );

      return;
    }

    if (
      candidate.size >
      MAX_FILE_SIZE_BYTES
    ) {
      setFile(null);

      setError(
        `This photo is larger than ${MAX_FILE_SIZE_MB} MB. Please choose a smaller file.`,
      );

      return;
    }

    setError(null);
    setStatus("idle");
    setProgress(0);

    setFile(candidate);

    // Default custom name = filename without extension
    const defaultName =
      candidate.name.replace(
        /\.[^/.]+$/,
        "",
      );

    setPhotoName(defaultName);
  }

  // --------------------------------------------------
  // Upload
  // --------------------------------------------------

  async function handleUpload() {
    if (!file) return;

    const cleanName =
      photoName.trim();

    if (!cleanName) {
      setError(
        "Please enter a name for your photo.",
      );

      return;
    }

    if (cleanName.length > 120) {
      setError(
        "Photo name cannot exceed 120 characters.",
      );

      return;
    }

    setStatus("uploading");
    setProgress(0);
    setError(null);

    try {
      // 1. Get presigned S3 URL
      const {
        uploadUrl,
        key,
        photoId,
      } =
        await requestUploadUrl({
          fileName: file.name,
          contentType: file.type,
        });

      // 2. Upload directly to S3
      await uploadToPresignedUrl(
        uploadUrl,
        file,
        setProgress,
      );

      // 3. Save metadata in DynamoDB
      const response =
        await confirmUpload({
          photoId,
          key,

          name: cleanName,

          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        });

      // 4. Frontend photo
      const uploadedPhoto: Photo = {
        id:
          response.photo.photoId,

        photoId:
          response.photo.photoId,

        key:
          response.photo.s3Key,

        name:
          response.photo.name,

        originalFileName:
          response.photo.originalFileName,

        fileName:
          response.photo.fileName,

        url:
          previewUrl ?? "",

        contentType:
          response.photo.contentType,

        fileSize:
          response.photo.fileSize,

        uploadedAt:
          response.photo.createdAt,

        createdAt:
          response.photo.createdAt,

        updatedAt:
          response.photo.updatedAt,
      };

      onUploaded(uploadedPhoto);

      setStatus("success");

      toast.success(
        "Photo uploaded successfully",
      );

      window.setTimeout(() => {
        reset();
        onOpenChange(false);
      }, 1100);
    } catch (error) {
      console.error(
        "Upload error:",
        error,
      );

      setStatus("idle");
      setProgress(0);

      setError(
        "Upload failed. Please try again.",
      );

      toast.error(
        "Upload failed. Please try again.",
      );
    }
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (status === "uploading")
          return;

        if (!next) {
          reset();
        }

        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Upload photo
          </DialogTitle>

          <DialogDescription>
            {ALLOWED_EXTENSIONS_LABEL} · up to{" "}
            {MAX_FILE_SIZE_MB} MB
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_MIME_TYPES.join(
            ",",
          )}
          className="sr-only"
          onChange={(event) =>
            selectFile(
              event.target.files?.[0],
            )
          }
        />

        {!file ? (
          <button
            type="button"
            onClick={() =>
              inputRef.current?.click()
            }
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() =>
              setDragging(false)
            }
            onDrop={(event) => {
              event.preventDefault();

              setDragging(false);

              selectFile(
                event.dataTransfer.files?.[0],
              );
            }}
            className={`flex w-full flex-col items-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition ${
              dragging
                ? "border-primary bg-accent"
                : "border-border bg-surface-muted hover:border-primary/50 hover:bg-accent/60"
            }`}
          >
            <span className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-surface text-primary shadow-soft">
              <UploadCloud
                className="size-6"
                aria-hidden="true"
              />
            </span>

            <span className="text-sm font-semibold">
              Drag &amp; drop your photo here
            </span>

            <span className="mt-1 text-sm text-muted-foreground">
              or choose a photo
            </span>
          </button>
        ) : (
          <div className="space-y-4">
            {/* Preview */}
            <div className="flex gap-4 rounded-xl border border-border bg-surface-muted p-3">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={`Preview of ${photoName}`}
                  className="size-24 shrink-0 rounded-lg object-cover"
                />
              ) : null}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {file.name}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {formatFileSize(
                    file.size,
                  )}{" "}
                  ·{" "}
                  {file.type
                    .replace(
                      "image/",
                      "",
                    )
                    .toUpperCase()}
                </p>

                {status === "idle" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-8 px-2 text-xs"
                    onClick={() => {
                      reset();

                      inputRef.current?.click();
                    }}
                  >
                    <X
                      className="size-3.5"
                      aria-hidden="true"
                    />

                    Remove / change
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Custom name */}
            {status !== "success" ? (
              <div className="space-y-2">
                <label
                  htmlFor="photo-name"
                  className="text-sm font-medium"
                >
                  Photo name
                </label>

                <input
                  id="photo-name"
                  value={photoName}
                  maxLength={120}
                  disabled={
                    status === "uploading"
                  }
                  onChange={(event) =>
                    setPhotoName(
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Vrindavan Trip"
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />

                <p className="text-xs text-muted-foreground">
                  Choose a name you'll recognize
                  later.
                </p>
              </div>
            ) : null}

            {/* Progress */}
            {status === "uploading" ? (
              <div
                className="space-y-2"
                aria-live="polite"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />

                  Uploading photo…{" "}
                  {progress}%
                </div>

                <Progress
                  value={progress}
                />
              </div>
            ) : null}

            {/* Success */}
            {status === "success" ? (
              <p
                className="flex items-center gap-2 text-sm font-medium text-primary"
                aria-live="polite"
              >
                <CheckCircle2
                  className="size-4"
                  aria-hidden="true"
                />

                Photo uploaded successfully
              </p>
            ) : null}
          </div>
        )}

        {error ? (
          <p
            role="alert"
            className="text-sm font-medium text-destructive"
          >
            {error}
          </p>
        ) : null}

        {file &&
        status !== "success" ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              disabled={
                status === "uploading"
              }
            >
              Cancel
            </Button>

            <Button
              onClick={handleUpload}
              disabled={
                status === "uploading" ||
                !photoName.trim()
              }
            >
              {status === "uploading" ? (
                <Loader2
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <ImageUp
                  className="size-4"
                  aria-hidden="true"
                />
              )}

              Upload photo
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}