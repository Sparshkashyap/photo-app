import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import * as api from "@/services/api";
import {
  clearAuth,
  getToken,
  getUser,
  saveToken,
  saveUser,
  type AuthUser,
} from "@/utils/auth";

type AuthContextValue = {
  /** False until localStorage has been read on the client. */
  ready: boolean;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (input: { email: string; password: string }) => Promise<AuthUser>;
  signup: (input: { name: string; email: string; password: string }) => Promise<AuthUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getToken() ? getUser() : null);
    setReady(true);
  }, []);

  const persist = useCallback((response: api.AuthResponse) => {
    saveToken(response.token);
    saveUser(response.user);
    setUser(response.user);
    return response.user;
  }, []);

  const login = useCallback(
    async (input: { email: string; password: string }) => persist(await api.login(input)),
    [persist],
  );

  const signup = useCallback(
    async (input: { name: string; email: string; password: string }) =>
      persist(await api.signup(input)),
    [persist],
  );

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ready, user, isAuthenticated: Boolean(user), login, signup, logout }),
    [ready, user, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
