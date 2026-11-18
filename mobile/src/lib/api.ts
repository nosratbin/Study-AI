/**
 * Client for the FastAPI backend in native mode: every request sends `X-Client-Type: mobile`, so auth endpoints return
 * tokens in the body instead of cookies. The access token goes in `Authorization: Bearer`; a 401 triggers one
 * deduplicated refresh-and-retry, mirroring web/src/lib/api.ts.
 */
import { API_URL } from "./config";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./tokens";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    /** Validation errors are {field, message}; some errors carry other data (email_unverified: {email, resend_after}). */
    public details?: { field?: string | null; message?: string; [key: string]: unknown }[],
  ) {
    super(message);
  }

  /** Map backend validation details to { field: message } for forms. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of this.details ?? []) if (d.field && d.message && !out[d.field]) out[d.field] = d.message.replace(/^Value error, /, "");
    return out;
  }
}

/** Turn anything thrown into an ApiError, for display. */
export function toApiError(e: unknown): ApiError {
  return e instanceof ApiError ? e : new ApiError(0, "unknown", "Something went wrong. Please try again.");
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

/** Auth endpoints that must never trigger an automatic refresh-and-retry. */
const NO_REFRESH = new Set([
  "/auth/login", "/auth/register", "/auth/google", "/auth/refresh", "/auth/logout",
  "/auth/verify-email", "/auth/verify-email/link", "/auth/verify-email/resend",
]);

type Listener = () => void;
const expiredListeners = new Set<Listener>();

/** AuthProvider subscribes here to sign the user out when the session can no longer be refreshed. */
export function onSessionExpired(fn: Listener): () => void {
  expiredListeners.add(fn);
  return () => {
    expiredListeners.delete(fn);
  };
}

let refreshing: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refresh_token = await getRefreshToken();
  if (!refresh_token) return false;
  try {
    const res = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Client-Type": "mobile" },
      body: JSON.stringify({ refresh_token }),
    });
    if (!res.ok) {
      // Only a definitive rejection ends the session; a 5xx or 429 keeps the tokens for a later try.
      if (res.status === 401 || res.status === 403) await clearTokens();
      return false;
    }
    const body = (await res.json()) as Partial<AuthTokens>;
    if (!body.access_token || !body.refresh_token) return false;
    await setTokens(body.access_token, body.refresh_token);
    return true;
  } catch {
    return false;
  }
}

/** One refresh at a time: requests that hit 401 while a refresh is in flight share its result. */
function tryRefresh(): Promise<boolean> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    const e = body?.error;
    if (e) return new ApiError(res.status, e.code, e.message, e.details);
  } catch {
    /* non-JSON */
  }
  if (res.status >= 500) return new ApiError(res.status, "server_unavailable", "The server is not responding. Please try again shortly.");
  return new ApiError(res.status, "http_error", "Request failed");
}

/** Android's OkHttp client has no timeouts by default, so a stalled 2G connection would hang forever. */
export const REQUEST_TIMEOUT_MS = 20_000;

const OFFLINE_MESSAGE = "You appear to be offline. Check your connection and try again.";

/**
 * fetch with a timeout. A caller's `signal` aborting rethrows its AbortError (TanStack Query cancellation); our own
 * timeout becomes a network_error ApiError.
 */
async function fetchWithTimeout(url: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const forward = () => controller.abort();
  if (signal?.aborted) {
    clearTimeout(timer);
    throw Object.assign(new Error("Aborted"), { name: "AbortError" });
  }
  signal?.addEventListener("abort", forward);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (!timedOut && signal?.aborted) throw e;
    if (timedOut) throw new ApiError(0, "network_error", "The connection is too slow right now. Please try again.");
    throw new ApiError(0, "network_error", OFFLINE_MESSAGE);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forward);
  }
}

export async function api<T>(
  path: string,
  /** `auth: false` sends no Authorization header (e.g. revoking a previous session's refresh token). */
  opts: { method?: Method; body?: unknown; retry?: boolean; signal?: AbortSignal; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, retry = true, signal, auth = true } = opts;
  const headers: Record<string, string> = { "X-Client-Type": "mobile", Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = auth ? await getAccessToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetchWithTimeout(
    `${API_URL}${path}`,
    { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined },
    signal,
  );

  if (res.status === 401 && auth && retry && !NO_REFRESH.has(path)) {
    if (await tryRefresh()) return api<T>(path, { ...opts, retry: false });
    if (!(await getRefreshToken())) expiredListeners.forEach((fn) => fn());
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
