/**
 * Auth storage layer.
 *
 * Everything token related goes through these helpers, so swapping
 * localStorage for HttpOnly cookies later only touches this file.
 */

const TOKEN_KEY = "photos.token";
const USER_KEY = "photos.user";

export type AuthUser = {
  userId: string;
  name: string;
  email: string;
};

const canUseStorage = () => typeof window !== "undefined";

export function saveToken(token: string): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function removeToken(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export function saveUser(user: AuthUser): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): AuthUser | null {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(USER_KEY);
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
