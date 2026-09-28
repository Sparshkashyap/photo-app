/** Frontend-only configuration constants. */

export const APP_NAME = "Photos";

export const APP_TAGLINE =
  "Your memories, beautifully organized.";

export const MAX_FILE_SIZE_MB = 100;

export const MAX_FILE_SIZE_BYTES =
  MAX_FILE_SIZE_MB * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "video/mp4",
  "audio/mpeg",
  "audio/mp3",
] as const;

export const ALLOWED_EXTENSIONS_LABEL =
  "JPG, JPEG, PNG, WEBP, MP4, MP3";

export function formatFileSize(
  bytes: number,
): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(0)} KB`;
  }

  if (
    bytes <
    1024 * 1024 * 1024
  ) {
    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  return `${(
    bytes /
    (1024 * 1024 * 1024)
  ).toFixed(2)} GB`;
}

export function getMediaType(
  contentType: string,
): "image" | "video" | "audio" | "unknown" {
  const normalized =
    String(contentType || "")
      .toLowerCase();

  if (
    normalized.startsWith(
      "image/",
    )
  ) {
    return "image";
  }

  if (
    normalized.startsWith(
      "video/",
    )
  ) {
    return "video";
  }

  if (
    normalized.startsWith(
      "audio/",
    )
  ) {
    return "audio";
  }

  return "unknown";
}