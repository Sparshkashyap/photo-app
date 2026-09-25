/**
 * Authentication storage layer.
 *
 * JWT + user are stored locally for the current frontend architecture.
 * The backend must enforce the single-active-session rule.
 */

const TOKEN_KEY = "photos.token";
const USER_KEY = "photos.user";
const DEVICE_KEY = "photos.device.id";

export type AuthProvider =
  | "password"
  | "google"
  | "facebook"
  | "instagram";

export type AuthUser = {
  userId: string;
  name: string;
  email: string;
  provider?: AuthProvider;
};

const canUseStorage = () =>
  typeof window !== "undefined";

function createDeviceId(): string {
  if (!canUseStorage()) {
    return "";
  }

  const existing =
    window.localStorage.getItem(DEVICE_KEY);

  if (existing) {
    return existing;
  }

  const deviceId =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  window.localStorage.setItem(
    DEVICE_KEY,
    deviceId,
  );

  return deviceId;
}

export function getDeviceId(): string {
  return createDeviceId();
}

export function saveToken(token: string): void {
  if (!canUseStorage()) return;

  window.localStorage.setItem(
    TOKEN_KEY,
    token,
  );
}

export function getToken(): string | null {
  if (!canUseStorage()) return null;

  return window.localStorage.getItem(
    TOKEN_KEY,
  );
}

export function removeToken(): void {
  if (!canUseStorage()) return;

  window.localStorage.removeItem(TOKEN_KEY);
}

export function saveUser(user: AuthUser): void {
  if (!canUseStorage()) return;

  window.localStorage.setItem(
    USER_KEY,
    JSON.stringify(user),
  );
}

export function getUser(): AuthUser | null {
  if (!canUseStorage()) return null;

  const raw =
    window.localStorage.getItem(USER_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function clearAuth(): void {
  removeToken();

  if (!canUseStorage()) return;

  window.localStorage.removeItem(USER_KEY);
}

export function saveAuth(
  token: string,
  user: AuthUser,
): void {
  saveToken(token);
  saveUser(user);
}

export function getAuthHeaders(): Record<
  string,
  string
> {
  const token = getToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}