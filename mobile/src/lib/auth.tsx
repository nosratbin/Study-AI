/**
 * Session state for the app. Tokens live in expo-secure-store (src/lib/tokens.ts); the backend's mobile mode returns them
 * in the body of /auth/login, /auth/verify-email and /auth/refresh. Mirrors web/src/lib/auth.tsx.
 *
 * Offline-first: a student with a stored session stays signed in when the network is down. Only a definitive answer from
 * the server (a 401 whose refresh was rejected) signs them out. The last user is cached so a cold start offline works.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import NetInfo from "@react-native-community/netinfo";
import { api, ApiError, onSessionExpired, type AuthTokens } from "./api";
import { googleFirebaseIdToken } from "./google";
import {
  clearTokens,
  getCachedUser,
  getPendingRevoke,
  getRefreshToken,
  hasSession,
  setCachedUser,
  setPendingRevoke,
  setTokens,
} from "./tokens";
import { queryClient } from "./query";
import type { User } from "./types";

/** An account waiting for its email code. `resendAt` is epoch ms when "Send a new code" unlocks. */
export interface PendingVerification {
  email: string;
  resendAt: number;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  /** Set by register() and by a login that fails with 403 email_unverified; read by the verify-email screen. */
  pending: PendingVerification | null;
  setPending: (p: PendingVerification | null) => void;
  login: (email: string, password: string) => Promise<User>;
  /** Google account picker -> Firebase ID token -> /auth/google. Rejects with GoogleCancelled when the picker is closed. */
  loginWithGoogle: () => Promise<User>;
  /** Creates the account and emails a code; there is no session until the email is verified. */
  register: (full_name: string, email: string, password: string) => Promise<PendingVerification>;
  verifyEmail: (email: string, code: string) => Promise<User>;
  resendCode: (email: string) => Promise<PendingVerification>;
  logout: () => Promise<void>;
  /**
   * Re-fetch /auth/me (after onboarding or a profile edit). Resolves true when the user was refreshed (or the session
   * turned out to be gone), false when the server couldn't be reached; the current user is kept in that case.
   */
  reload: () => Promise<boolean>;
}

const AuthContext = createContext<AuthState | null>(null);

type AuthOut = AuthTokens & { user: User };

function pendingFrom(email: string, resendAfterSeconds: number): PendingVerification {
  return { email, resendAt: Date.now() + resendAfterSeconds * 1000 };
}

/**
 * The signed-in user, or null when there is definitively no session. Throws when the answer is unknown (offline, 5xx,
 * timeout, or a 401 whose refresh failed for a non-definitive reason, which leaves the refresh token in place).
 */
async function fetchCurrentUser(): Promise<User | null> {
  if (!(await hasSession())) return null;
  try {
    return await api<User>("/auth/me");
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && !(await getRefreshToken())) return null;
    throw e;
  }
}

/** Revoke a refresh token left over from an offline sign-out. Best-effort; kept for the next try on failure. */
async function flushPendingRevoke(): Promise<void> {
  const token = await getPendingRevoke();
  if (!token) return;
  try {
    await api("/auth/logout", { method: "POST", body: { refresh_token: token }, auth: false });
    await setPendingRevoke(null);
  } catch (e) {
    // 4xx means the server won't accept it (already revoked or expired): nothing left to do.
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) await setPendingRevoke(null);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingVerification | null>(null);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) setCachedUser(u);
  }, []);

  const signOutLocally = useCallback(async () => {
    await clearTokens();
    queryClient.clear();
    setUserState(null);
  }, []);

  const reload = useCallback(async () => {
    try {
      const u = await fetchCurrentUser();
      if (u) setUser(u);
      else await signOutLocally();
      return true;
    } catch {
      return false;
    }
  }, [setUser, signOutLocally]);

  useEffect(() => {
    let active = true;
    (async () => {
      // Show the cached user at once when a session exists, then confirm with the server in the background.
      const cached = (await hasSession()) ? await getCachedUser() : null;
      if (!active) return;
      if (cached) {
        setUserState(cached);
        setLoading(false);
      }
      for (let attempt = 0; attempt < 3 && active; attempt++) {
        try {
          const u = await fetchCurrentUser();
          if (!active) return;
          if (u) setUser(u);
          else await signOutLocally();
          break;
        } catch {
          // Unknown (offline/5xx/timeout): keep the cached user, if any; the reconnect listener below retries.
          if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
        }
      }
      if (active) setLoading(false);
    })();

    flushPendingRevoke();
    // Back online: confirm the session and flush any owed revocation.
    let wasOffline = false;
    const offNet = NetInfo.addEventListener((s) => {
      const online = s.isConnected === true && s.isInternetReachable !== false;
      if (online && wasOffline) {
        flushPendingRevoke();
        hasSession().then((has) => {
          if (has && active) reload();
        });
      }
      wasOffline = !online;
    });
    const offExpired = onSessionExpired(() => {
      signOutLocally();
    });
    return () => {
      active = false;
      offNet();
      offExpired();
    };
  }, [reload, setUser, signOutLocally]);

  const signIn = useCallback(
    async (r: AuthOut) => {
      await setTokens(r.access_token, r.refresh_token);
      queryClient.clear();
      setPending(null);
      setUser(r.user);
      return r.user;
    },
    [setUser],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      pending,
      setPending,
      reload,
      async login(email, password) {
        try {
          return await signIn(await api<AuthOut>("/auth/login", { method: "POST", body: { email, password } }));
        } catch (e) {
          // Unverified account: the backend has sent a fresh code; details carry {email, resend_after}.
          if (e instanceof ApiError && e.code === "email_unverified") {
            const d = e.details?.[0];
            const resend = typeof d?.resend_after === "number" ? d.resend_after : 60;
            setPending(pendingFrom(typeof d?.email === "string" ? d.email : email.trim().toLowerCase(), resend));
          }
          throw e;
        }
      },
      async loginWithGoogle() {
        const id_token = await googleFirebaseIdToken();
        return signIn(await api<AuthOut>("/auth/google", { method: "POST", body: { id_token } }));
      },
      async register(full_name, email, password) {
        const r = await api<{ email: string; resend_after: number }>("/auth/register", { method: "POST", body: { full_name, email, password } });
        const p = pendingFrom(r.email, r.resend_after);
        setPending(p);
        return p;
      },
      async verifyEmail(email, code) {
        return signIn(await api<AuthOut>("/auth/verify-email", { method: "POST", body: { email, code } }));
      },
      async resendCode(email) {
        const r = await api<{ email: string; resend_after: number }>("/auth/verify-email/resend", { method: "POST", body: { email } });
        const p = pendingFrom(r.email, r.resend_after);
        setPending(p);
        return p;
      },
      async logout() {
        const refresh_token = await getRefreshToken();
        try {
          await api("/auth/logout", { method: "POST", body: refresh_token ? { refresh_token } : undefined });
        } catch (e) {
          // Couldn't reach the server: remember the refresh token and revoke it once back online.
          const definitive = e instanceof ApiError && e.status >= 400 && e.status < 500;
          if (!definitive && refresh_token) await setPendingRevoke(refresh_token);
        }
        await signOutLocally();
      },
    }),
    [user, loading, pending, reload, signIn, signOutLocally],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
