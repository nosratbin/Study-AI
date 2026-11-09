"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, SESSION_EXPIRED_EVENT } from "./api";
import { getGoogleIdToken } from "./firebase";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (full_name: string, email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * The signed-in user, or null when signed out. /auth/me refreshes the session itself on a 401.
 * Other failures (offline, 5xx) throw, so callers can keep the user they already have.
 */
async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await api<User>("/auth/me");
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // A temporary failure (offline, server restart) keeps the current user instead of signing them out.
  const reload = useCallback(async () => {
    try {
      setUser(await fetchCurrentUser());
    } catch {
      /* keep previous state */
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = (attempt: number) =>
      fetchCurrentUser().then(
        (u) => {
          if (!active) return;
          setUser(u);
          setLoading(false);
        },
        () => {
          if (!active) return;
          if (attempt < 2) setTimeout(() => load(attempt + 1), 1500);
          else setLoading(false); // still unreachable: treat as signed out
        },
      );
    load(0);
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      active = false;
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      reload,
      async login(email, password) {
        const r = await api<{ user: User }>("/auth/login", { method: "POST", body: { email, password } });
        setUser(r.user);
        return r.user;
      },
      async register(full_name, email, password) {
        const r = await api<{ user: User }>("/auth/register", { method: "POST", body: { full_name, email, password } });
        setUser(r.user);
        return r.user;
      },
      async loginWithGoogle() {
        const id_token = await getGoogleIdToken();
        const r = await api<{ user: User }>("/auth/google", { method: "POST", body: { id_token } });
        setUser(r.user);
        return r.user;
      },
      async logout() {
        await api("/auth/logout", { method: "POST" }).catch(() => undefined);
        setUser(null);
      },
    }),
    [user, loading, reload],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Where a user should land after signing in. */
export function homeFor(user: User): string {
  if (user.role === "student" && !user.onboarding_completed) return "/onboarding";
  return "/dashboard";
}
