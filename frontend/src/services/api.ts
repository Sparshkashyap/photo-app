/**
 * API layer. UI components never call fetch directly.
 *
 * When VITE_API_BASE_URL is configured, real requests are made against the
 * backend contract below. Without it, a local mock implementation keeps the
 * frontend fully demonstrable. Delete the mock branches once the backend is
 * live — no component changes required.
 *
 * Contract:
 *   POST /auth/signup            { name, email, password }
 *   POST /auth/login             { email, password } -> { token, user }
 *   POST /photos/upload-url      { fileName, contentType } -> { uploadUrl, key }
 *   GET  /photos/download-url?key=... -> { downloadUrl }
 */

import { getToken } from "@/utils/auth";
import type { AuthUser } from "@/utils/auth";

const BASE_URL = import.meta.env["VITE_API_BASE_URL"] as string | undefined;

export const USING_MOCK_API = !BASE_URL;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = false, signal } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (!token) throw new ApiError("Your session has expired. Please log in again.", 401);
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
  } catch {
    throw new ApiError("We couldn't reach the server. Please check your connection.");
  }

  if (response.status === 401) {
    throw new ApiError("Your session has expired. Please log in again.", 401);
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      (data as { message?: string } | null)?.message ?? "Something went wrong. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data as T;
}

/* ------------------------------------------------------------------ */
/* Mock implementation (development only)                              */
/* ------------------------------------------------------------------ */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_USERS_KEY = "photos.mockUsers";

type MockAccount = { name: string; email: string; password: string; userId: string };

function readMockAccounts(): MockAccount[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(MOCK_USERS_KEY) ?? "[]") as MockAccount[];
  } catch {
    return [];
  }
}

function writeMockAccounts(accounts: MockAccount[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(accounts));
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export type AuthResponse = { success: boolean; token: string; user: AuthUser };

export async function signup(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  if (USING_MOCK_API) {
    await delay(900);
    const accounts = readMockAccounts();
    const email = input.email.trim().toLowerCase();
    if (accounts.some((a) => a.email === email)) {
      throw new ApiError("An account with this email already exists.", 409);
    }
    const account: MockAccount = {
      name: input.name.trim(),
      email,
      password: input.password,
      userId: crypto.randomUUID(),
    };
    writeMockAccounts([...accounts, account]);
    return {
      success: true,
      token: `mock.${account.userId}`,
      user: { userId: account.userId, name: account.name, email: account.email },
    };
  }

  return request<AuthResponse>("/auth/signup", { method: "POST", body: input });
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  if (USING_MOCK_API) {
    await delay(900);
    const email = input.email.trim().toLowerCase();
    const accounts = readMockAccounts();
    const found = accounts.find((a) => a.email === email);
    if (found && found.password !== input.password) {
      throw new ApiError("Unable to sign in. Please check your email and password.", 401);
    }
    const account: MockAccount =
      found ??
      (() => {
        // Demo convenience: unknown emails sign in as a guest account.
        const created: MockAccount = {
          name: email.split("@")[0]!.replace(/[._-]+/g, " "),
          email,
          password: input.password,
          userId: crypto.randomUUID(),
        };
        writeMockAccounts([...accounts, created]);
        return created;
      })();

    return {
      success: true,
      token: `mock.${account.userId}`,
      user: { userId: account.userId, name: account.name, email: account.email },
    };
  }

  return request<AuthResponse>("/auth/login", { method: "POST", body: input });
}

export type UploadUrlResponse = { success: boolean; uploadUrl: string; key: string };

export async function requestUploadUrl(input: {
  fileName: string;
  contentType: string;
}): Promise<UploadUrlResponse> {
  if (USING_MOCK_API) {
    await delay(600);
    return {
      success: true,
      uploadUrl: "mock://upload",
      key: `photos/mock-user/${Date.now()}-${input.fileName}`,
    };
  }

  return request<UploadUrlResponse>("/photos/upload-url", {
    method: "POST",
    body: input,
    auth: true,
  });
}

/** Uploads the file bytes straight to the presigned URL (never through Lambda). */
export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  if (USING_MOCK_API) {
    for (let percent = 10; percent <= 100; percent += 10) {
      await delay(90);
      onProgress?.(percent);
    }
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new ApiError("Upload failed. Please try again.", xhr.status));
    xhr.onerror = () => reject(new ApiError("Upload failed. Please try again."));
    xhr.send(file);
  });
}

export type DownloadUrlResponse = { success: boolean; downloadUrl: string };

export async function requestDownloadUrl(key: string): Promise<DownloadUrlResponse> {
  if (USING_MOCK_API) {
    await delay(500);
    return { success: true, downloadUrl: `mock://download/${key}` };
  }

  return request<DownloadUrlResponse>(
    `/photos/download-url?key=${encodeURIComponent(key)}`,
    { auth: true },
  );
}
