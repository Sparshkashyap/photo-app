import { CheckCircle2, FileAudio, FileVideo, ImageUp, Loader2, UploadCloud, X } from "lucide-react";

import { useEffect, useRef, useState } from "react";

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
  getMediaType,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  formatFileSize,
} from "@/lib/constants";

import { confirmUpload, requestUploadUrl, uploadToPresignedUrl } from "@/services/api";

import type { Photo } from "@/types/photo";

type Status = "idle" | "uploading" | "processing" | "success";

export function UploadPhoto({
  open,
  onOpenChange,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (photo: Photo) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);

  const [photoName, setPhotoName] = useState("");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [dragging, setDragging] = useState(false);

  const [status, setStatus] = useState<Status>("idle");

  const [progress, setProgress] = useState(0);

  const [error, setError] = useState<string | null>(null);

  const mediaType = file ? getMediaType(file.type) : null;

  // ==================================================
  // PREVIEW URL
  // ==================================================

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);

    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // ==================================================
  // RESET
  // ==================================================

  function reset() {
    setFile(null);
    setPhotoName("");
    setPreviewUrl(null);
    setStatus("idle");
    setProgress(0);
    setError(null);
    setDragging(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  // ==================================================
  // SELECT FILE
  // ==================================================

  function selectFile(candidate?: File) {
    if (!candidate) {
      return;
    }

    const supported = (ALLOWED_MIME_TYPES as readonly string[]).includes(candidate.type);

    if (!supported) {
      setFile(null);

      setError(`Unsupported file type. Choose ${ALLOWED_EXTENSIONS_LABEL}.`);

      return;
    }

    if (candidate.size > MAX_FILE_SIZE_BYTES) {
      setFile(null);

      setError(`This file is larger than ${MAX_FILE_SIZE_MB} MB.`);

      return;
    }

    setError(null);
    setStatus("idle");
    setProgress(0);
    setFile(candidate);

    const defaultName = candidate.name
      .replace(/\.[^/.]+$/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);

    setPhotoName(defaultName);
  }

  // ==================================================
  // OPEN FILE PICKER
  // ==================================================

  function openFilePicker() {
    if (status === "uploading") {
      return;
    }

    inputRef.current?.click();
  }

  // ==================================================
  // UPLOAD
  // ==================================================

  async function handleUpload() {
    if (!file) {
      return;
    }

    const cleanName = photoName.trim();

    if (!cleanName) {
      setError("Please enter a name for your media.");

      return;
    }

    if (cleanName.length > 120) {
      setError("Media name cannot exceed 120 characters.");

      return;
    }

    setStatus("uploading");
    setProgress(0);
    setError(null);

    try {
      // ------------------------------------------------
      // 1. Get presigned S3 URL
      // ------------------------------------------------

      const { uploadUrl, key, photoId } = await requestUploadUrl({
        fileName: file.name,

        contentType: file.type,
      });

      // ------------------------------------------------
      // 2. Upload directly to S3
      // ------------------------------------------------

      await uploadToPresignedUrl(uploadUrl, file, setProgress);

      // ------------------------------------------------
      // 3. Save metadata immediately
      // ------------------------------------------------
      // AI caption generation now runs asynchronously after
      // the S3 upload, so the upload does not wait for BLIP.

      const response = await confirmUpload({
        photoId,

        key,

        name: cleanName,

        fileName: file.name,

        contentType: file.type,

        fileSize: file.size,
      });

      // ------------------------------------------------
      // 4. Add uploaded media immediately
      // ------------------------------------------------

      const savedPhoto = response.photo;

      const uploadedPhoto: Photo = {
        id: savedPhoto.photoId,

        photoId: savedPhoto.photoId,

        userId: savedPhoto.userId,

        key: savedPhoto.s3Key,

        s3Key: savedPhoto.s3Key,

        name: savedPhoto.name,

        fileName: savedPhoto.fileName,

        url: previewUrl ?? "",

        contentType: savedPhoto.contentType,

        caption: savedPhoto.caption ?? null,

        captionStatus: savedPhoto.captionStatus ?? "not_applicable",

        mediaType: savedPhoto.mediaType ?? mediaType ?? "image",

        fileSize: savedPhoto.fileSize ?? file.size,

        ...(savedPhoto.originalFileName !== undefined
          ? {
              originalFileName: savedPhoto.originalFileName,
            }
          : {}),

        ...(savedPhoto.downloadUrl !== undefined
          ? {
              downloadUrl: savedPhoto.downloadUrl,
            }
          : {}),

        ...(savedPhoto.folderId !== undefined
          ? {
              folderId: savedPhoto.folderId ?? null,
            }
          : {}),

        isFavorite: savedPhoto.isFavorite ?? false,

        isTrashed: savedPhoto.isTrashed ?? false,

        uploadedAt: savedPhoto.createdAt ?? new Date().toISOString(),

        createdAt: savedPhoto.createdAt ?? new Date().toISOString(),

        ...(savedPhoto.updatedAt !== undefined
          ? {
              updatedAt: savedPhoto.updatedAt,
            }
          : {}),
      };

      onUploaded(uploadedPhoto);

      setStatus("success");
      setProgress(100);

      toast.success(
        mediaType === "image"
          ? "Media uploaded. AI caption is generating in background."
          : "Media uploaded successfully",
      );

      window.setTimeout(() => {
        reset();
        onOpenChange(false);
      }, 900);
    } catch (uploadError) {
      console.error("Upload error:", uploadError);

      const message =
        uploadError instanceof Error ? uploadError.message : "Upload failed. Please try again.";

      setStatus("idle");
      setProgress(0);
      setError(message);

      toast.error("Upload failed", {
        description: message,
      });
    }
  }

  // ==================================================
  // MEDIA PREVIEW
  // ==================================================

  function renderPreview() {
    if (!file || !previewUrl) {
      return null;
    }

    // ------------------------------------------------
    // VIDEO
    // ------------------------------------------------

    if (mediaType === "video") {
      return (
        <div
          className="
            relative
            aspect-video
            w-full
            min-w-0
            overflow-hidden
            rounded-2xl
            bg-black
            ring-1
            ring-border
            motion-safe:animate-in
            motion-safe:fade-in
            motion-safe:duration-300
          "
        >
          <video
            src={previewUrl}
            controls
            playsInline
            preload="metadata"
            className="
              absolute
              inset-0
              h-full
              w-full
              max-w-full
              object-contain
            "
          />
        </div>
      );
    }

    // ------------------------------------------------
    // AUDIO
    // ------------------------------------------------

    if (mediaType === "audio") {
      return (
        <div
          className="
            flex
            min-h-[180px]
            w-full
            min-w-0
            items-center
            justify-center
            rounded-2xl
            bg-surface-muted
            p-5
            ring-1
            ring-border
            sm:min-h-[210px]
            motion-safe:animate-in
            motion-safe:fade-in
            motion-safe:duration-300
          "
        >
          <div
            className="
              w-full
              min-w-0
              max-w-xl
              rounded-2xl
              border
              border-border
              bg-background
              p-5
              shadow-soft
            "
          >
            <div
              className="
                flex
                min-w-0
                items-center
                gap-3
              "
            >
              <span
                className="
                  flex
                  size-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-accent
                  text-primary
                "
              >
                <FileAudio className="size-5" aria-hidden="true" />
              </span>

              <div className="min-w-0">
                <p
                  className="
                    truncate
                    text-sm
                    font-semibold
                  "
                >
                  {file.name}
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-muted-foreground
                  "
                >
                  MP3 audio · {formatFileSize(file.size)}
                </p>
              </div>
            </div>

            <audio
              src={previewUrl}
              controls
              preload="metadata"
              className="
                mt-5
                block
                w-full
                max-w-full
              "
            />
          </div>
        </div>
      );
    }

    // ------------------------------------------------
    // IMAGE
    // ------------------------------------------------

    return (
      <div
        className="
          relative
          aspect-video
          w-full
          min-w-0
          overflow-hidden
          rounded-2xl
          bg-muted
          ring-1
          ring-border
          motion-safe:animate-in
          motion-safe:fade-in
          motion-safe:duration-300
        "
      >
        <img
          src={previewUrl}
          alt={`Preview of ${photoName || file.name}`}
          className="
            absolute
            inset-0
            h-full
            w-full
            max-w-full
            object-contain
          "
        />
      </div>
    );
  }

  // ==================================================
  // MEDIA ICON
  // ==================================================

  function renderMediaIcon() {
    if (mediaType === "video") {
      return <FileVideo className="size-5" aria-hidden="true" />;
    }

    if (mediaType === "audio") {
      return <FileAudio className="size-5" aria-hidden="true" />;
    }

    return <ImageUp className="size-5" aria-hidden="true" />;
  }

  // ==================================================
  // MEDIA LABEL
  // ==================================================

  function mediaLabel() {
    if (mediaType === "video") {
      return "MP4 video";
    }

    if (mediaType === "audio") {
      return "MP3 audio";
    }

    return "Image";
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (status === "uploading") {
          return;
        }

        if (!next) {
          reset();
        }

        onOpenChange(next);
      }}
    >
      <DialogContent
        className="
          flex
          w-[calc(100vw-24px)]
          max-w-[760px]
          min-w-0
          max-h-[calc(100vh-24px)]
          flex-col
          gap-0
          overflow-hidden
          rounded-2xl
          p-0
          sm:max-h-[calc(100vh-48px)]
        "
      >
        <div
          className="
            min-w-0
            overflow-y-auto
          "
        >
          {/* ==================================================
              HEADER
          ================================================== */}

          <div
            className="
              border-b
              border-border
              px-5
              py-4
              pr-14
              sm:px-6
              sm:py-5
            "
          >
            <DialogHeader
              className="
                space-y-1
                text-left
              "
            >
              <DialogTitle
                className="
                  text-xl
                  font-semibold
                  tracking-tight
                  sm:text-2xl
                "
              >
                Upload media
              </DialogTitle>

              <DialogDescription>
                {ALLOWED_EXTENSIONS_LABEL}
                {" · "}
                up to {MAX_FILE_SIZE_MB} MB
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* ==================================================
              CONTENT
          ================================================== */}

          <div
            className="
              min-w-0
              space-y-5
              px-5
              py-5
              sm:px-6
              sm:py-6
            "
          >
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_MIME_TYPES.join(",")}
              className="sr-only"
              onChange={(event) => selectFile(event.target.files?.[0])}
            />

            {/* ==================================================
                EMPTY STATE
            ================================================== */}

            {!file ? (
              <button
                type="button"
                onClick={openFilePicker}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();

                  setDragging(false);

                  selectFile(event.dataTransfer.files?.[0]);
                }}
                className={`
                  flex
                  min-h-[270px]
                  w-full
                  min-w-0
                  flex-col
                  items-center
                  justify-center
                  rounded-2xl
                  border-2
                  border-dashed
                  px-6
                  py-10
                  text-center
                  transition-all
                  duration-200
                  sm:min-h-[300px]
                  ${
                    dragging
                      ? "scale-[1.01] border-primary bg-accent shadow-inner"
                      : "border-border bg-surface-muted hover:border-primary/50 hover:bg-accent/50"
                  }
                `}
              >
                <span
                  className={`
                    mb-4
                    flex
                    size-14
                    items-center
                    justify-center
                    rounded-2xl
                    bg-background
                    text-primary
                    shadow-soft
                    transition-transform
                    duration-200
                    ${dragging ? "scale-110 -translate-y-1" : ""}
                  `}
                >
                  <UploadCloud className="size-7" aria-hidden="true" />
                </span>

                <span
                  className="
                    text-base
                    font-semibold
                  "
                >
                  {dragging ? "Drop it right here" : "Drag & drop your media here"}
                </span>

                <span
                  className="
                    mt-1
                    text-sm
                    text-muted-foreground
                  "
                >
                  or click to choose a file
                </span>

                <span
                  className="
                    mt-4
                    rounded-full
                    bg-background
                    px-3
                    py-1.5
                    text-xs
                    text-muted-foreground
                  "
                >
                  Images · MP4 · MP3 · max {MAX_FILE_SIZE_MB} MB
                </span>
              </button>
            ) : (
              <>
                {/* ==================================================
                    PREVIEW
                ================================================== */}

                <div className="min-w-0">{renderPreview()}</div>

                {/* ==================================================
                    FILE INFO
                ================================================== */}

                <div
                  className="
                    flex
                    min-w-0
                    items-center
                    gap-3
                    rounded-xl
                    border
                    border-border
                    bg-surface-muted
                    p-3
                  "
                >
                  <span
                    className="
                      flex
                      size-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-background
                      text-primary
                    "
                  >
                    {renderMediaIcon()}
                  </span>

                  <div
                    className="
                      min-w-0
                      flex-1
                    "
                  >
                    <p
                      className="
                        truncate
                        text-sm
                        font-semibold
                      "
                      title={file.name}
                    >
                      {file.name}
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-muted-foreground
                      "
                    >
                      {formatFileSize(file.size)}
                      {" · "}
                      {mediaLabel()}
                    </p>
                  </div>

                  {status === "idle" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openFilePicker}
                      className="shrink-0 transition-transform active:scale-95"
                    >
                      Change
                    </Button>
                  ) : null}

                  {status === "idle" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={reset}
                      className="
                        size-9
                        shrink-0
                        transition-transform
                        active:scale-90
                      "
                      aria-label="Remove file"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>

                {/* ==================================================
                    NAME
                ================================================== */}

                {status !== "success" ? (
                  <div
                    className="
                      min-w-0
                      space-y-2
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        gap-3
                      "
                    >
                      <label
                        htmlFor="photo-name"
                        className="
                          text-sm
                          font-medium
                        "
                      >
                        Name
                      </label>

                      <span
                        className="
                          shrink-0
                          text-xs
                          text-muted-foreground
                        "
                      >
                        {photoName.length}/120
                      </span>
                    </div>

                    <input
                      id="photo-name"
                      value={photoName}
                      maxLength={120}
                      disabled={status === "uploading" || status === "processing"}
                      onChange={(event) => setPhotoName(event.target.value)}
                      placeholder="e.g. Vrindavan Trip"
                      className="
                        h-11
                        w-full
                        min-w-0
                        rounded-xl
                        border
                        border-border
                        bg-background
                        px-3.5
                        text-sm
                        outline-none
                        transition
                        placeholder:text-muted-foreground
                        focus:border-primary
                        focus:ring-2
                        focus:ring-primary/20
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                    />
                  </div>
                ) : null}

                {/* ==================================================
                    PROGRESS
                ================================================== */}

                {status === "uploading" || status === "processing" ? (
                  <div
                    className="
                      min-w-0
                      space-y-2
                      rounded-xl
                      border
                      border-border
                      bg-surface-muted
                      p-3.5
                      motion-safe:animate-in
                      motion-safe:fade-in
                      motion-safe:duration-200
                    "
                    aria-live="polite"
                  >
                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        gap-3
                        text-sm
                      "
                    >
                      <span
                        className="
                          flex
                          min-w-0
                          items-center
                          gap-2
                          text-muted-foreground
                        "
                      >
                        <Loader2
                          className="
                            size-4
                            shrink-0
                            animate-spin
                          "
                          aria-hidden="true"
                        />

                        <span className="truncate">
                          {status === "processing" ? "Generating AI caption…" : "Uploading media…"}
                        </span>
                      </span>

                      <span
                        className="
                          shrink-0
                          font-semibold
                          tabular-nums
                        "
                      >
                        {status === "processing" ? "AI" : `${progress}%`}
                      </span>
                    </div>

                    <Progress value={progress} className="h-2 transition-[width] duration-300" />
                  </div>
                ) : null}

                {/* ==================================================
                    SUCCESS
                ================================================== */}

                {status === "success" ? (
                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      rounded-xl
                      bg-accent
                      px-4
                      py-3
                      text-sm
                      font-medium
                      text-primary
                      motion-safe:animate-in
                      motion-safe:zoom-in-95
                      motion-safe:fade-in
                      motion-safe:duration-200
                    "
                    aria-live="polite"
                  >
                    <CheckCircle2
                      className="
                        size-4
                        shrink-0
                      "
                      aria-hidden="true"
                    />
                    Media uploaded successfully
                  </div>
                ) : null}
              </>
            )}

            {/* ==================================================
                ERROR
            ================================================== */}

            {error ? (
              <p
                role="alert"
                className="
                  rounded-xl
                  bg-destructive/10
                  px-3.5
                  py-3
                  text-sm
                  font-medium
                  leading-5
                  text-destructive
                  motion-safe:animate-in
                  motion-safe:fade-in
                  motion-safe:slide-in-from-top-1
                  motion-safe:duration-200
                "
              >
                {error}
              </p>
            ) : null}
          </div>

          {/* ==================================================
              FOOTER
          ================================================== */}

          {file && status !== "success" ? (
            <div
              className="
                sticky
                bottom-0
                flex
                flex-col-reverse
                gap-2
                border-t
                border-border
                bg-background/95
                px-5
                py-4
                backdrop-blur
                sm:flex-row
                sm:justify-end
                sm:px-6
              "
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
                disabled={status === "uploading" || status === "processing"}
                className="
                  w-full
                  transition-transform
                  active:scale-95
                  sm:w-auto
                "
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleUpload}
                disabled={status === "uploading" || status === "processing" || !photoName.trim()}
                className="
                  w-full
                  transition-transform
                  active:scale-95
                  sm:w-auto
                "
              >
                {status === "uploading" || status === "processing" ? (
                  <Loader2
                    className="
                      size-4
                      animate-spin
                    "
                    aria-hidden="true"
                  />
                ) : (
                  <UploadCloud className="size-4" aria-hidden="true" />
                )}

                {status === "uploading"
                  ? "Uploading…"
                  : status === "processing"
                    ? "Generating AI caption…"
                    : "Upload media"}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UploadPhoto;
