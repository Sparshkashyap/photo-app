/** Frontend-only configuration constants. */

export const APP_NAME = "Photos";
export const APP_TAGLINE = "Your memories, beautifully organized.";

/** Change this single value to adjust the client-side upload limit. */
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_EXTENSIONS_LABEL = "JPG, JPEG, PNG, WEBP";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
