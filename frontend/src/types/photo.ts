export interface Photo {
  id?: string;

  photoId: string;

  userId: string;

  name: string;

  fileName: string;

  originalFileName?: string;

  contentType: string;

  s3Key: string;

  key?: string;

  url?: string;

  downloadUrl?: string;

  fileSize?: number;

  folderId?: string | null;

  status?:
    | "UPLOADING"
    | "READY"
    | "FAILED"
    | string;

  createdAt?: string;

  updatedAt?: string;

  uploadedAt?: string;

  isTrashed?: boolean;

  trashedAt?: string | null;
}

// ==================================================
// UPLOAD
// ==================================================

export interface UploadUrlResponse {
  success: boolean;

  uploadUrl: string;

  key: string;

  photoId: string;

  fileName?: string;

  expiresIn?: number;
}

// ==================================================
// DOWNLOAD
// ==================================================

export interface DownloadUrlResponse {
  success: boolean;

  downloadUrl: string;
}

// ==================================================
// PHOTOS
// ==================================================

export interface PhotosResponse {
  success: boolean;

  count: number;

  photos: Photo[];
}

export interface PhotoResponse {
  success: boolean;

  message?: string;

  photo: Photo;
}

// ==================================================
// TRASH
// ==================================================

export interface TrashPhoto extends Photo {
  isTrashed?: boolean;

  trashedAt?: string | null;
}

export interface TrashPhotosResponse {
  success: boolean;

  count?: number;

  photos: TrashPhoto[];
}

export interface TrashPhotoResponse {
  success: boolean;

  message?: string;

  photo?: TrashPhoto;
}

export interface EmptyTrashResponse {
  success: boolean;

  message?: string;

  deletedCount?: number;

  count?: number;
}