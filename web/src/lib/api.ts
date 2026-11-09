/** Thin client for the FastAPI backend (same-origin /api, httpOnly cookie session). */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { field: string | null; message: string }[],
  ) {
    super(message);
  }

  /** Map backend validation details to { field: message } for forms. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of this.details ?? []) if (d.field && !out[d.field]) out[d.field] = d.message.replace(/^Value error, /, "");
    return out;
  }
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

let refreshing: Promise<boolean> | null = null;

/** Auth endpoints that must never trigger an automatic refresh-and-retry. */
const NO_REFRESH = new Set(["/auth/login", "/auth/register", "/auth/google", "/auth/refresh", "/auth/logout"]);

/** Fired when the session can no longer be refreshed; AuthProvider signs the user out. */
export const SESSION_EXPIRED_EVENT = "learnai:session-expired";

async function tryRefresh(): Promise<boolean> {
  // Deduplicate concurrent refreshes.
  refreshing ??= fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => setTimeout(() => (refreshing = null), 0));
  return refreshing;
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    const e = body?.error;
    if (e) return new ApiError(res.status, e.code, e.message, e.details);
  } catch {
    /* non-JSON (e.g. backend down behind the proxy) */
  }
  if (res.status >= 500)
    return new ApiError(res.status, "server_unavailable", "The server is not responding. Please try again shortly.");
  return new ApiError(res.status, "http_error", res.statusText || "Request failed");
}

export async function api<T>(path: string, opts: { method?: Method; body?: unknown; retry?: boolean } = {}): Promise<T> {
  const { method = "GET", body, retry = true } = opts;
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "network_error", "You appear to be offline. Check your connection and try again.");
  }

  if (res.status === 401 && retry && !NO_REFRESH.has(path)) {
    if (await tryRefresh()) return api<T>(path, { ...opts, retry: false });
    if (typeof window !== "undefined" && path !== "/auth/me") window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
