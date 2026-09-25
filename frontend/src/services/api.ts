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
import {
  clearAuth,
  getDeviceId,
  getToken,
  saveAuth,
} from "@/utils/auth";

import type {
  CreateFolderResponse,
  DeleteFolderResponse,
  GetFoldersResponse,
  RenameFolderResponse,
} from "@/types/folder";

import type {
  CreateShareResponse,
  EmptyTrashResponse,
  GetSharedPhotoResponse,
  Photo,
  RevokeShareResponse,
  TrashActionResponse,
  TrashPhotosResponse,
} from "@/types/photo";

// ==================================================
// CONFIGURATION
// ==================================================

const API_BASE_URL = (
  import.meta.env[
    "VITE_API_BASE_URL"
  ] as string | undefined
)?.replace(/\/+$/, "");

// ==================================================
// ERRORS
// ==================================================

export class ApiError extends Error {
  status: number;
  code?: string | undefined;
  details?: unknown | undefined;

  constructor(
    message: string,
    status = 0,
    code?: string,
    details?: unknown,
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ==================================================
// REQUEST
// ==================================================

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
  code?: string;
  error?: string;
  details?: unknown;
};

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

  const headers: Record<
    string,
    string
  > = {};

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
        "AUTH_REQUIRED",
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

  const errorData =
    data as
      | BackendErrorResponse
      | null;

  if (response.status === 401) {
    clearAuth();

    throw new ApiError(
      errorData?.message ||
        "Your session has expired. Please log in again.",
      401,
      errorData?.code ||
        "AUTH_REQUIRED",
      errorData?.details,
    );
  }

  if (!response.ok) {
    throw new ApiError(
      errorData?.message ||
        "Something went wrong. Please try again.",
      response.status,
      errorData?.code,
      errorData?.details,
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

  session?: {
    sessionId?: string;
    deviceId?: string;
  };
};

export type OAuthProvider =
  | "google"
  | "facebook"
  | "instagram";

export type ActiveSessionResponse = {
  success: boolean;

  hasActiveSession: boolean;

  session?: {
    deviceName?: string;
    createdAt?: string;
    lastActiveAt?: string;
  };
};

export async function signup(
  input: {
    name: string;
    email: string;
    password: string;
  },
): Promise<AuthResponse> {
  return request<AuthResponse>(
    "/auth/signup",
    {
      method: "POST",

      body: {
        name: input.name.trim(),

        email: input.email
          .trim()
          .toLowerCase(),

        password: input.password,

        deviceId: getDeviceId(),
      },
    },
  );
}

export async function login(
  input: {
    email: string;
    password: string;
  },
): Promise<AuthResponse> {
  return request<AuthResponse>(
    "/auth/login",
    {
      method: "POST",

      body: {
        email: input.email
          .trim()
          .toLowerCase(),

        password: input.password,

        deviceId: getDeviceId(),
      },
    },
  );
}

export async function loginWithOAuth(
  provider: OAuthProvider,
): Promise<void> {
  if (!API_BASE_URL) {
    throw new ApiError(
      "API URL is not configured.",
    );
  }

  const deviceId =
    encodeURIComponent(
      getDeviceId(),
    );

  const callbackUrl =
    `${window.location.origin}/login`;

  const encodedCallback =
    encodeURIComponent(
      callbackUrl,
    );

  window.location.assign(
    `${API_BASE_URL}/auth/${provider}?deviceId=${deviceId}&redirectUri=${encodedCallback}`,
  );
}

export async function logout(): Promise<{
  success: boolean;
  message?: string;
}> {
  const token = getToken();

  if (!token) {
    clearAuth();

    return {
      success: true,
    };
  }

  try {
    return await request<{
      success: boolean;
      message?: string;
    }>("/auth/logout", {
      method: "POST",
      auth: true,
      body: {
        deviceId: getDeviceId(),
      },
    });
  } finally {
    clearAuth();
  }
}

export async function getActiveSession(): Promise<ActiveSessionResponse> {
  return request<ActiveSessionResponse>(
    "/auth/active-session",
    {
      method: "GET",
      body: undefined,
    },
  );
}

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
  fileName?: string;
  expiresIn?: number;
};

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

export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: File,
  onProgress?: (
    percent: number,
  ) => void,
): Promise<void> {
  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
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

      xhr.upload.onprogress =
        (event) => {
          if (
            event.lengthComputable
          ) {
            const percent =
              Math.round(
                (event.loaded /
                  event.total) *
                  100,
              );

            onProgress?.(
              percent,
            );
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
  photo: Photo;
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
          input.folderId ?? null,
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
  folderId?: string | null;
  isTrashed?: boolean;
  trashedAt?: string | null;
  isFavorite?: boolean;
};

export type GetPhotosResponse = {
  success: boolean;
  count: number;
  photos: PhotoApiItem[];
};

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
      options.folderId ||
        "root",
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
  photo: Photo;
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
        name: trimmedName,
      },

      auth: true,
    },
  );
}

// ==================================================
// MOVE PHOTO
// ==================================================

export type MovePhotoResponse = {
  success: boolean;
  message: string;
  photo: Photo;
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
// TRASH
// ==================================================

export async function trashPhoto(
  photoId: string,
): Promise<TrashActionResponse> {
  return request<TrashActionResponse>(
    `/photos/${encodeURIComponent(
      photoId,
    )}`,
    {
      method: "DELETE",
      auth: true,
    },
  );
}

export async function getTrashPhotos(): Promise<TrashPhotosResponse> {
  return request<TrashPhotosResponse>(
    "/trash",
    {
      method: "GET",
      auth: true,
    },
  );
}

export async function restorePhoto(
  photoId: string,
): Promise<TrashActionResponse> {
  return request<TrashActionResponse>(
    `/trash/${encodeURIComponent(
      photoId,
    )}/restore`,
    {
      method: "POST",
      auth: true,
    },
  );
}

export async function deletePhotoForever(
  photoId: string,
): Promise<TrashActionResponse> {
  return request<TrashActionResponse>(
    `/trash/${encodeURIComponent(
      photoId,
    )}`,
    {
      method: "DELETE",
      auth: true,
    },
  );
}

export async function emptyTrash(): Promise<EmptyTrashResponse> {
  return request<EmptyTrashResponse>(
    "/trash",
    {
      method: "DELETE",
      auth: true,
    },
  );
}

// ==================================================
// FOLDERS
// ==================================================

export async function getFolders(): Promise<GetFoldersResponse> {
  return request<GetFoldersResponse>(
    "/folders",
    {
      method: "GET",
      auth: true,
    },
  );
}

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
      "Folder name cannot exceed 100 characters.",
      400,
    );
  }

  return request<CreateFolderResponse>(
    "/folders",
    {
      method: "POST",

      body: {
        name: trimmedName,
      },

      auth: true,
    },
  );
}

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

  return request<RenameFolderResponse>(
    `/folders/${encodeURIComponent(
      folderId,
    )}`,
    {
      method: "PATCH",

      body: {
        name: trimmedName,
      },

      auth: true,
    },
  );
}

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

// ==================================================
// FAVORITES
// ==================================================

export type FavoriteResponse = {
  success: boolean;
  message?: string;
  photo: Photo;
};

export async function setFavorite(
  photoId: string,
  isFavorite: boolean,
): Promise<FavoriteResponse> {
  return request<FavoriteResponse>(
    `/photos/${encodeURIComponent(
      photoId,
    )}/favorite`,
    {
      method: "PATCH",

      body: {
        isFavorite,
      },

      auth: true,
    },
  );
}

// ==================================================
// SHARING
// ==================================================

export async function createShare(
  photoId: string,
): Promise<CreateShareResponse> {
  return request<CreateShareResponse>(
    `/photos/${encodeURIComponent(
      photoId,
    )}/share`,
    {
      method: "POST",
      auth: true,
    },
  );
}

export async function revokeShare(
  photoId: string,
  shareId: string,
): Promise<RevokeShareResponse> {
  return request<RevokeShareResponse>(
    `/photos/${encodeURIComponent(
      photoId,
    )}/share/${encodeURIComponent(
      shareId,
    )}`,
    {
      method: "DELETE",
      auth: true,
    },
  );
}

export async function getSharedPhoto(
  token: string,
): Promise<GetSharedPhotoResponse> {
  return request<GetSharedPhotoResponse>(
    `/shared/${encodeURIComponent(
      token,
    )}`,
    {
      method: "GET",
      auth: false,
    },
  );
}