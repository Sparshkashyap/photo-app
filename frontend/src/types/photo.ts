export interface Photo {
  id?: string;

  photoId: string;

  userId: string;

  key?: string;

  name: string;

  fileName: string;

  originalFileName?: string;

  contentType: string;

  s3Key: string;

  url?: string;

  downloadUrl?: string;

  fileSize?: number;

  uploadedAt?: string;

  folderId?: string | null;

  status?:
    | "UPLOADING"
    | "READY"
    | "FAILED"
    | string;

  createdAt?: string;

  updatedAt?: string;

  isTrashed?: boolean;

  trashedAt?: string | null;
}

export interface UploadUrlResponse {
  success: boolean;

  uploadUrl: string;

  photoId: string;

  key: string;

  fileName?: string;

  expiresIn?: number;
}

export interface DownloadUrlResponse {
  success: boolean;

  downloadUrl: string;

  url?: string;

  expiresIn?: number;

  photo?: {
    photoId: string;

    fileName: string;

    contentType: string;

    s3Key: string;
  };
}

export interface PhotosResponse {
  success: boolean;

  photos: Photo[];
}

export interface PhotoResponse {
  success: boolean;

  photo?: Photo;

  message?: string;
}

/* ==================================================
   TRASH
================================================== */

export interface TrashPhotosResponse {
  success: boolean;

  count?: number;

  photos: Photo[];
}

export interface TrashPhotoResponse {
  success: boolean;

  message?: string;

  photo?: Photo;
}

export interface RestorePhotoResponse {
  success: boolean;

  message?: string;

  photo?: Photo;
}

export interface DeleteForeverResponse {
  success: boolean;

  message?: string;
}

export interface EmptyTrashResponse {
  success: boolean;

  message?: string;

  deletedCount?: number;
}