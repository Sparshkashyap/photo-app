export interface Photo {
  photoId: string;
  userId: string;

  fileName: string;
  originalFileName?: string;

  contentType: string;

  s3Key: string;

  folderId?: string | null;

  status?: "UPLOADING" | "READY" | "FAILED" | string;

  createdAt?: string;
  updatedAt?: string;
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



export type Folder = {
  folderId: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type GetFoldersResponse = {
  success: boolean;
  count: number;
  folders: Folder[];
};

export type CreateFolderResponse = {
  success: boolean;
  message: string;
  folder: Folder;
};

export type RenameFolderResponse = {
  success: boolean;
  message: string;
  folder: Folder;
};

export type DeleteFolderResponse = {
  success: boolean;
  message: string;
};