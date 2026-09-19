export interface Photo {
  url: string | undefined;
  name: string;
  photoId: string;
  userId: string;

  fileName: string;
  originalFileName?: string | undefined;

  contentType: string;

  s3Key: string;

  folderId?: string | null | undefined;

  status?: "UPLOADING" | "READY" | "FAILED" | string | undefined;

  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export interface UploadUrlResponse {
  success: boolean;
  uploadUrl: string;
  photoId: string;
  key: string;
  fileName: string;
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