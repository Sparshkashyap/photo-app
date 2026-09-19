/**
 * API service for Photo App
 *
 * Frontend
 * React / TanStack Router
 *        ↓
 *      api.ts
 *        ↓
 * API Gateway
 *        ↓
 * Lambda + Express
 *        ↓
 * DynamoDB + S3
 */

import type { AuthUser } from "@/utils/auth";
import { getToken } from "@/utils/auth";

import type {
  CreateFolderResponse,
  DeleteFolderResponse,
  Folder,
  GetFoldersResponse,
  RenameFolderResponse,
} from "@/types/folder";

import type { Photo } from "@/types/photo";

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const API_BASE_URL = (
  import.meta.env["VITE_API_BASE_URL"] as
    | string
    | undefined
)?.replace(/\/+$/, "");

// --------------------------------------------------
// Errors
// --------------------------------------------------

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);

    this.name = "ApiError";
    this.status = status;
  }
}

// --------------------------------------------------
// Request Types
// --------------------------------------------------

type RequestOptions = {
  method?:
    | "GET"
    | "POST"
    | "PUT"
    | "PATCH"
    | "DELETE";

  body?: unknown;

  auth?: boolean;

  signal?: AbortSignal;
};

type BackendErrorResponse = {
  success?: boolean;
  message?: string;
};

// --------------------------------------------------
// Base Request
// --------------------------------------------------

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    auth = false,
    signal,
  } = options;

  if (!API_BASE_URL) {
    throw new ApiError(
      "API URL is not configured. Please add VITE_API_BASE_URL to frontend/.env",
    );
  }

  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers["Content-Type"] =
      "application/json";
  }

  if (auth) {
    const token = getToken();

    if (!token) {
      throw new ApiError(
        "Your session has expired. Please log in again.",
        401,
      );
    }

    headers["Authorization"] =
      `Bearer ${token}`;
  }

  const requestInit: RequestInit = {
    method,
    headers,
  };

  if (signal !== undefined) {
    requestInit.signal = signal;
  }

  if (body !== undefined) {
    requestInit.body =
      JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}${path}`,
      requestInit,
    );
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new ApiError(
      "We couldn't reach the server. Please check that the backend is running.",
    );
  }

  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.status === 401) {
    throw new ApiError(
      (
        data as
          | BackendErrorResponse
          | null
      )?.message ||
        "Your session has expired. Please log in again.",
      401,
    );
  }

  if (!response.ok) {
    throw new ApiError(
      (
        data as
          | BackendErrorResponse
          | null
      )?.message ||
        "Something went wrong. Please try again.",
      response.status,
    );
  }

  return data as T;
}

// ==================================================
// AUTHENTICATION
// ==================================================

export type AuthResponse = {
  success: boolean;
  message?: string;
  token: string;
  user: AuthUser;
};

// --------------------------------------------------
// Signup
// --------------------------------------------------

export async function signup(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>(
    "/auth/signup",
    {
      method: "POST",

      body: {
        name: input.name.trim(),

        email:
          input.email
            .trim()
            .toLowerCase(),

        password:
          input.password,
      },
    },
  );
}

// --------------------------------------------------
// Login
// --------------------------------------------------

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>(
    "/auth/login",
    {
      method: "POST",

      body: {
        email:
          input.email
            .trim()
            .toLowerCase(),

        password:
          input.password,
      },
    },
  );
}

// --------------------------------------------------
// Get User Profile
// --------------------------------------------------

export async function getUserProfile(): Promise<{
  success: boolean;
  user: AuthUser;
}> {
  return request<{
    success: boolean;
    user: AuthUser;
  }>("/user/profile", {
    method: "GET",
    auth: true,
  });
}

// ==================================================
// PHOTO UPLOAD
// ==================================================

export type UploadUrlResponse = {
  success: boolean;
  uploadUrl: string;
  key: string;
  photoId: string;
};

// --------------------------------------------------
// Request Upload URL
// --------------------------------------------------

export async function requestUploadUrl(
  input: {
    fileName: string;
    contentType: string;
  },
): Promise<UploadUrlResponse> {
  return request<UploadUrlResponse>(
    "/photos/upload-url",
    {
      method: "POST",

      body: {
        fileName:
          input.fileName,

        contentType:
          input.contentType,
      },

      auth: true,
    },
  );
}

// --------------------------------------------------
// Upload To S3
// --------------------------------------------------

export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: File,
  onProgress?: (
    percent: number,
  ) => void,
): Promise<void> {
  await new Promise<void>(
    (resolve, reject) => {
      const xhr =
        new XMLHttpRequest();

      xhr.open(
        "PUT",
        uploadUrl,
      );

      xhr.setRequestHeader(
        "Content-Type",
        file.type,
      );

      xhr.upload.onprogress = (
        event,
      ) => {
        if (
          event.lengthComputable
        ) {
          const percent =
            Math.round(
              (event.loaded /
                event.total) *
                100,
            );

          onProgress?.(percent);
        }
      };

      xhr.onload = () => {
        if (
          xhr.status >= 200 &&
          xhr.status < 300
        ) {
          onProgress?.(100);

          resolve();

          return;
        }

        reject(
          new ApiError(
            "Upload failed. Please try again.",
            xhr.status,
          ),
        );
      };

      xhr.onerror = () => {
        reject(
          new ApiError(
            "Upload failed. Please try again.",
          ),
        );
      };

      xhr.onabort = () => {
        reject(
          new ApiError(
            "Upload was cancelled.",
          ),
        );
      };

      xhr.send(file);
    },
  );
}

// ==================================================
// CONFIRM UPLOAD
// ==================================================

export type ConfirmUploadResponse = {
  success: boolean;
  message: string;

  photo: {
    photoId: string;
    userId: string;

    name: string;

    originalFileName: string;

    fileName: string;

    s3Key: string;

    contentType: string;

    fileSize: number;

    createdAt: string;

    updatedAt: string;

    folderId?: string;
  };
};

export async function confirmUpload(
  input: {
    photoId: string;

    key: string;

    name: string;

    fileName: string;

    contentType: string;

    fileSize: number;

    folderId?: string | null;
  },
): Promise<ConfirmUploadResponse> {
  const trimmedName =
    input.name.trim();

  if (!trimmedName) {
    throw new ApiError(
      "Photo name cannot be empty.",
      400,
    );
  }

  if (
    trimmedName.length > 120
  ) {
    throw new ApiError(
      "Photo name must be 120 characters or less.",
      400,
    );
  }

  return request<ConfirmUploadResponse>(
    "/photos/confirm",
    {
      method: "POST",

      body: {
        photoId:
          input.photoId,

        key:
          input.key,

        name:
          trimmedName,

        fileName:
          input.fileName,

        contentType:
          input.contentType,

        fileSize:
          input.fileSize,

        folderId:
          input.folderId ??
          null,
      },

      auth: true,
    },
  );
}

// ==================================================
// PHOTO TYPES
// ==================================================

export type PhotoSort =
  | "newest"
  | "oldest"
  | "name_asc"
  | "name_desc";

export type PhotoType =
  | "all"
  | "image"
  | "video";

export type GetPhotosOptions = {
  search?: string;

  sort?: PhotoSort;

  type?: PhotoType;

  folderId?: string | null;
};

// --------------------------------------------------
// API Photo
// --------------------------------------------------

export type PhotoApiItem = {
  photoId: string;

  userId: string;

  s3Key: string;

  name: string;

  originalFileName?: string;

  fileName: string;

  contentType: string;

  fileSize: number;

  createdAt: string;

  updatedAt?: string;

  downloadUrl: string;

  url?: string;

  folderId?: string;
};

// --------------------------------------------------
// Get Photos Response
// --------------------------------------------------

export type GetPhotosResponse = {
  success: boolean;

  count: number;

  photos: PhotoApiItem[];
};

// --------------------------------------------------
// Get Photos
// --------------------------------------------------

export async function getPhotos(
  options: GetPhotosOptions = {},
): Promise<GetPhotosResponse> {
  const params =
    new URLSearchParams();

  const search =
    options.search?.trim();

  if (search) {
    params.set(
      "search",
      search,
    );
  }

  if (options.sort) {
    params.set(
      "sort",
      options.sort,
    );
  }

  if (options.type) {
    params.set(
      "type",
      options.type,
    );
  }

  if (
    options.folderId !==
    undefined
  ) {
    params.set(
      "folderId",
      options.folderId || "root",
    );
  }

  const queryString =
    params.toString();

  const path = queryString
    ? `/photos?${queryString}`
    : "/photos";

  return request<GetPhotosResponse>(
    path,
    {
      method: "GET",
      auth: true,
    },
  );
}

// ==================================================
// RENAME PHOTO
// ==================================================

export type RenamePhotoResponse = {
  success: boolean;

  message: string;

  photo: {
    photoId: string;

    userId: string;

    name: string;

    originalFileName?: string;

    fileName: string;

    s3Key: string;

    contentType: string;

    fileSize: number;

    createdAt: string;

    updatedAt: string;

    folderId?: string;
  };
};

export async function renamePhoto(
  photoId: string,
  name: string,
): Promise<RenamePhotoResponse> {
  const trimmedName =
    name.trim();

  if (!trimmedName) {
    throw new ApiError(
      "Photo name cannot be empty.",
      400,
    );
  }

  if (
    trimmedName.length > 120
  ) {
    throw new ApiError(
      "Photo name must be 120 characters or less.",
      400,
    );
  }

  return request<RenamePhotoResponse>(
    `/photos/${encodeURIComponent(
      photoId,
    )}`,
    {
      method: "PATCH",

      body: {
        name:
          trimmedName,
      },

      auth: true,
    },
  );
}

// ==================================================
// MOVE PHOTO TO FOLDER
// ==================================================

export type MovePhotoResponse = {
  success: boolean;

  message: string;

  photo: {
    photoId: string;

    userId: string;

    name: string;

    originalFileName?: string;

    fileName: string;

    s3Key: string;

    contentType: string;

    fileSize: number;

    createdAt: string;

    updatedAt: string;

    folderId?: string;
  };
};

export async function movePhotoToFolder(
  photoId: string,
  folderId: string | null,
): Promise<MovePhotoResponse> {
  return request<MovePhotoResponse>(
    `/photos/${encodeURIComponent(
      photoId,
    )}/folder`,
    {
      method: "PATCH",

      body: {
        folderId,
      },

      auth: true,
    },
  );
}

// ==================================================
// DOWNLOAD
// ==================================================

export type DownloadUrlResponse = {
  success: boolean;

  downloadUrl: string;
};

export async function requestDownloadUrl(
  photoId: string,
): Promise<DownloadUrlResponse> {
  return request<DownloadUrlResponse>(
    `/photos/download-url?photoId=${encodeURIComponent(
      photoId,
    )}`,
    {
      method: "GET",
      auth: true,
    },
  );
}

// ==================================================
// FOLDERS — PHASE 3
// ==================================================

// --------------------------------------------------
// Get Folders
// --------------------------------------------------

export async function getFolders(): Promise<GetFoldersResponse> {
  return request<GetFoldersResponse>(
    "/folders",
    {
      method: "GET",
      auth: true,
    },
  );
}

// --------------------------------------------------
// Create Folder
// --------------------------------------------------

export async function createFolder(
  name: string,
): Promise<CreateFolderResponse> {
  const trimmedName =
    name.trim();

  if (!trimmedName) {
    throw new ApiError(
      "Folder name cannot be empty.",
      400,
    );
  }

  if (
    trimmedName.length > 100
  ) {
    throw new ApiError(
      "Folder name must be 100 characters or less.",
      400,
    );
  }

  return request<CreateFolderResponse>(
    "/folders",
    {
      method: "POST",

      body: {
        name:
          trimmedName,
      },

      auth: true,
    },
  );
}

// --------------------------------------------------
// Rename Folder
// --------------------------------------------------

export async function renameFolder(
  folderId: string,
  name: string,
): Promise<RenameFolderResponse> {
  const trimmedName =
    name.trim();

  if (!trimmedName) {
    throw new ApiError(
      "Folder name cannot be empty.",
      400,
    );
  }

  if (
    trimmedName.length > 100
  ) {
    throw new ApiError(
      "Folder name must be 100 characters or less.",
      400,
    );
  }

  return request<RenameFolderResponse>(
    `/folders/${encodeURIComponent(
      folderId,
    )}`,
    {
      method: "PATCH",

      body: {
        name:
          trimmedName,
      },

      auth: true,
    },
  );
}

// --------------------------------------------------
// Delete Folder
// --------------------------------------------------

export async function deleteFolder(
  folderId: string,
): Promise<DeleteFolderResponse> {
  return request<DeleteFolderResponse>(
    `/folders/${encodeURIComponent(
      folderId,
    )}`,
    {
      method: "DELETE",
      auth: true,
    },
  );
}