export type Photo = {
  id: string;

  photoId: string;

  key: string;

  // Custom photo name
  name: string;

  // Original uploaded filename
  originalFileName: string;

  // Backward-compatible filename
  fileName: string;

  // Presigned S3 URL
  url: string;

  contentType: string;

  fileSize: number;

  uploadedAt: string;

  createdAt: string;

  updatedAt?: string;
};