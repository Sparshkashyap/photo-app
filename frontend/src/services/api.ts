/**
 * API service for Photo App
 *
 * Frontend:
 * React / TanStack Router
 *        ↓
 *      api.ts
 *        ↓
 * API Gateway
 *        ↓
 * Lambda + Express
 *
 * Authentication:
 * Login / Signup
 *        ↓
 *      JWT
 *        ↓
 * auth.ts
 *        ↓
 * localStorage: photos.token
 *        ↓
 * Authorization: Bearer <token>
 */

import type { AuthUser } from "@/utils/auth";
import { getToken } from "@/utils/auth";
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

  constructor(
    message: string,
    status = 0,
  ) {
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

  // JSON body
  if (body !== undefined) {
    headers["Content-Type"] =
      "application/json";
  }

  // JWT authentication
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

  // ------------------------------------------------
  // Unauthorized
  // ------------------------------------------------

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

  // ------------------------------------------------
  // Other API errors
  // ------------------------------------------------

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

// --------------------------------------------------
// Auth Response
// --------------------------------------------------

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
        password: input.password,
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
        password: input.password,
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

// --------------------------------------------------
// Upload URL Response
// --------------------------------------------------

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
        fileName: input.fileName,
        contentType:
          input.contentType,
      },

      auth: true,
    },
  );
}

// --------------------------------------------------
// Upload Directly To S3
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
        if (event.lengthComputable) {
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
  };
};

// --------------------------------------------------
// Confirm Upload
// --------------------------------------------------

export async function confirmUpload(
  input: {
    photoId: string;
    key: string;

    name: string;

    fileName: string;
    contentType: string;
    fileSize: number;
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

  if (trimmedName.length > 200) {
    throw new ApiError(
      "Photo name must be 200 characters or less.",
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

        key: input.key,

        name: trimmedName,

        fileName:
          input.fileName,

        contentType:
          input.contentType,

        fileSize:
          input.fileSize,
      },

      auth: true,
    },
  );
}

// ==================================================
// GET PHOTOS — PHASE 2
// ==================================================

// --------------------------------------------------
// Search / Sort / Filter Types
// --------------------------------------------------

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
};

// --------------------------------------------------
// Photo API Item
// --------------------------------------------------

export type PhotoApiItem = {
  photoId: string;
  userId: string;

  s3Key: string;

  // Custom photo name
  name: string;

  // Original uploaded filename
  originalFileName?: string;

  // Backward compatibility
  fileName: string;

  contentType: string;
  fileSize: number;

  createdAt: string;
  updatedAt?: string;

  downloadUrl: string;

  // Optional aliases
  url?: string;
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
//
// Phase 2:
//
// GET /photos
// GET /photos?search=trip
// GET /photos?sort=newest
// GET /photos?sort=oldest
// GET /photos?sort=name_asc
// GET /photos?sort=name_desc
// GET /photos?type=image
//
// Combined:
// GET /photos?search=trip&sort=newest&type=image
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
  };
};

// --------------------------------------------------
// Rename Photo
// --------------------------------------------------

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

  if (trimmedName.length > 200) {
    throw new ApiError(
      "Photo name must be 200 characters or less.",
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
// DOWNLOAD
// ==================================================

// --------------------------------------------------
// Download URL Response
// --------------------------------------------------

export type DownloadUrlResponse = {
  success: boolean;
  downloadUrl: string;
};

// --------------------------------------------------
// Request Download URL
// --------------------------------------------------

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