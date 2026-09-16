/**
 * API layer.
 *
 * UI components never call fetch directly.
 *
 * Frontend:
 *   React/TanStack Router
 *          ↓
 *      api.ts
 *          ↓
 *   Express Backend
 *          ↓
 *      MongoDB
 *
 * Authentication:
 *   Login/Signup → Backend returns JWT
 *   JWT → localStorage
 *   Protected requests → Authorization: Bearer <token>
 *
 * Backend contract:
 *
 *   POST /auth/signup
 *   Body: { name, email, password }
 *   Response: { success, token, user }
 *
 *   POST /auth/login
 *   Body: { email, password }
 *   Response: { success, token, user }
 *
 *   GET /user/profile
 *   Header: Authorization: Bearer <token>
 *
 * Photo endpoints are kept here for the next backend phase:
 *
 *   POST /photos/upload-url
 *   GET  /photos/download-url?key=...
 */

import { getToken } from "@/utils/auth";
import type { AuthUser } from "@/utils/auth";

const BASE_URL = (
  import.meta.env["VITE_API_BASE_URL"] as string | undefined
)?.replace(/\/+$/, "");

if (!BASE_URL) {
  console.warn(
    "VITE_API_BASE_URL is not configured. Add it to frontend/.env",
  );
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
};

type BackendErrorResponse = {
  success?: boolean;
  message?: string;
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

  if (!BASE_URL) {
    throw new ApiError(
      "API URL is not configured. Please add VITE_API_BASE_URL to frontend/.env",
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  /*
   * JWT authentication.
   *
   * If auth=true:
   *
   * localStorage
   *      ↓
   * getToken()
   *      ↓
   * Authorization: Bearer <JWT>
   *
   * Express authMiddleware verifies this token.
   */
  if (auth) {
    const token = getToken();

    if (!token) {
      throw new ApiError(
        "Your session has expired. Please log in again.",
        401,
      );
    }

    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      signal: signal ?? null,
      body: body === undefined ? null : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
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

  /*
   * Backend JWT middleware returns 401 when:
   *
   * - token is missing
   * - token is invalid
   * - token is expired
   */
  if (response.status === 401) {
    throw new ApiError(
      (data as BackendErrorResponse | null)?.message ||
        "Your session has expired. Please log in again.",
      401,
    );
  }

  if (!response.ok) {
    const message =
      (data as BackendErrorResponse | null)?.message ||
      "Something went wrong. Please try again.";

    throw new ApiError(message, response.status);
  }

  return data as T;
}

/* ------------------------------------------------------------------ */
/* Authentication                                                      */
/* ------------------------------------------------------------------ */

export type AuthResponse = {
  success: boolean;
  message?: string;
  token: string;
  user: AuthUser;
};

/**
 * Signup
 *
 * POST /auth/signup
 *
 * Backend:
 *   name
 *   email
 *   password
 *
 * Returns:
 *   token
 *   user
 */
export async function signup(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/signup", {
    method: "POST",
    body: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
    },
  });
}

/**
 * Login
 *
 * POST /auth/login
 *
 * Returns:
 *   token
 *   user
 */
export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: {
      email: input.email.trim().toLowerCase(),
      password: input.password,
    },
  });
}

/**
 * Get currently authenticated user.
 *
 * GET /user/profile
 *
 * This request is protected by backend authMiddleware.
 */
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

/* ------------------------------------------------------------------ */
/* Photo API                                                           */
/* ------------------------------------------------------------------ */

export type UploadUrlResponse = {
  success: boolean;
  uploadUrl: string;
  key: string;
};

/**
 * Request a presigned upload URL.
 *
 * POST /photos/upload-url
 *
 * JWT required.
 *
 * NOTE:
 * This endpoint must be implemented in the backend
 * before photo uploading will work.
 */
export async function requestUploadUrl(input: {
  fileName: string;
  contentType: string;
}): Promise<UploadUrlResponse> {
  return request<UploadUrlResponse>("/photos/upload-url", {
    method: "POST",
    body: input,
    auth: true,
  });
}

/**
 * Upload file directly to a presigned URL.
 *
 * The file does NOT go through Express/Lambda.
 */
export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", uploadUrl);

    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round(
          (event.loaded / event.total) * 100,
        );

        onProgress?.(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
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
        new ApiError("Upload failed. Please try again."),
      );
    };

    xhr.onabort = () => {
      reject(
        new ApiError("Upload was cancelled."),
      );
    };

    xhr.send(file);
  });
}

export type DownloadUrlResponse = {
  success: boolean;
  downloadUrl: string;
};

/**
 * Request a presigned download URL.
 *
 * GET /photos/download-url?key=...
 *
 * JWT required.
 *
 * NOTE:
 * This endpoint must be implemented in the backend
 * before photo downloading will work.
 */
export async function requestDownloadUrl(
  key: string,
): Promise<DownloadUrlResponse> {
  return request<DownloadUrlResponse>(
    `/photos/download-url?key=${encodeURIComponent(key)}`,
    {
      method: "GET",
      auth: true,
    },
  );
}