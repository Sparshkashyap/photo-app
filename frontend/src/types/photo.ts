export interface Photo {
  id?: string;

  photoId: string;

  userId: string;

  key?: string;

  s3Key: string;

  name: string;

  originalFileName?: string;

  fileName: string;

  contentType: string;

  fileSize?: number;

  folderId?: string | null;

  status?:
    | "UPLOADING"
    | "READY"
    | "FAILED"
    | string;

  url?: string;

  downloadUrl?: string;

  uploadedAt?: string;

  createdAt?: string;

  updatedAt?: string;

  isTrashed?: boolean;

  trashedAt?: string | null;

  isFavorite?: boolean;
}

// ==================================================
// TRASH
// ==================================================

export interface TrashPhoto extends Photo {
  isTrashed: true;

  trashedAt?: string | null;
}

export interface TrashPhotosResponse {
  success: boolean;

  count: number;

  photos: TrashPhoto[];
}

export interface TrashActionResponse {
  success: boolean;

  message: string;

  photo?: Photo;
}

export interface EmptyTrashResponse {
  success: boolean;

  message: string;

  count?: number;
}

// ==================================================
// SHARE
// ==================================================

export interface SharedPhoto {
  photoId: string;

  name: string;

  originalFileName?: string;

  fileName: string;

  contentType: string;

  fileSize?: number;

  createdAt?: string;

  updatedAt?: string;

  folderId?: string | null;

  downloadUrl: string;

  url?: string;
}

export interface ShareInfo {
  shareId: string;

  photoId: string;

  token: string;

  expiresAt?: string | null;

  createdAt?: string;

  revoked?: boolean;

  shareUrl?: string;
}

export interface CreateShareResponse {
  success: boolean;

  message?: string;

  share: ShareInfo;
}

export interface RevokeShareResponse {
  success: boolean;

  message: string;
}

export interface GetSharedPhotoResponse {
  success: boolean;

  photo: SharedPhoto;

  share?: ShareInfo;
}