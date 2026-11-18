import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

const store: { access: string | null; refresh: string | null } = { access: null, refresh: null };

jest.mock("../tokens", () => ({
  getAccessToken: jest.fn(async () => store.access),
  getRefreshToken: jest.fn(async () => store.refresh),
  setTokens: jest.fn(async (a: string, r: string) => {
    store.access = a;
    store.refresh = r;
  }),
  clearTokens: jest.fn(async () => {
    store.access = null;
    store.refresh = null;
  }),
}));

// eslint-disable-next-line import/first
import { api, ApiError, onSessionExpired, REQUEST_TIMEOUT_MS } from "../api";

type Call = { url: string; init: RequestInit };
let calls: Call[];

function json(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function mockFetch(handler: (url: string, init: RequestInit) => Promise<Response>) {
  globalThis.fetch = jest.fn((url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return handler(String(url), init ?? {});
  }) as unknown as typeof fetch;
}

function header(init: RequestInit, name: string): string | undefined {
  return (init.headers as Record<string, string> | undefined)?.[name];
}

beforeEach(() => {
  calls = [];
  store.access = "A1";
  store.refresh = "R1";
});

afterEach(() => {
  jest.useRealTimers();
});

describe("api", () => {
  it("sends the mobile client header and bearer token", async () => {
    mockFetch(async () => json(200, { ok: true }));
    await expect(api("/auth/me")).resolves.toEqual({ ok: true });
    expect(header(calls[0].init, "X-Client-Type")).toBe("mobile");
    expect(header(calls[0].init, "Authorization")).toBe("Bearer A1");
  });

  it("omits the bearer token when auth is false", async () => {
    mockFetch(async () => json(204, null));
    await api("/auth/logout", { method: "POST", body: { refresh_token: "OLD" }, auth: false });
    expect(header(calls[0].init, "Authorization")).toBeUndefined();
  });

  it("refreshes once on 401 and retries with the new token", async () => {
    mockFetch(async (url, init) => {
      if (url.endsWith("/auth/refresh")) {
        expect(JSON.parse(String(init.body))).toEqual({ refresh_token: "R1" });
        return json(200, { access_token: "A2", refresh_token: "R2" });
      }
      return header(init, "Authorization") === "Bearer A2" ? json(200, { id: "u" }) : json(401, { error: { code: "token_expired", message: "x" } });
    });
    await expect(api("/students/dashboard")).resolves.toEqual({ id: "u" });
    expect(calls.filter((c) => c.url.endsWith("/auth/refresh"))).toHaveLength(1);
    expect(store).toEqual({ access: "A2", refresh: "R2" });
  });

  it("deduplicates concurrent refreshes", async () => {
    mockFetch(async (url, init) => {
      if (url.endsWith("/auth/refresh")) return json(200, { access_token: "A2", refresh_token: "R2" });
      return header(init, "Authorization") === "Bearer A2" ? json(200, {}) : json(401, {});
    });
    await Promise.all([api("/a"), api("/b"), api("/c")]);
    expect(calls.filter((c) => c.url.endsWith("/auth/refresh"))).toHaveLength(1);
  });

  it("ends the session only when the refresh is rejected", async () => {
    const expired = jest.fn();
    const off = onSessionExpired(expired);
    mockFetch(async (url) => (url.endsWith("/auth/refresh") ? json(401, {}) : json(401, { error: { code: "x", message: "m" } })));
    await expect(api("/a")).rejects.toMatchObject({ status: 401 });
    expect(store.refresh).toBeNull();
    expect(expired).toHaveBeenCalledTimes(1);
    off();
  });

  it("keeps the session when the refresh fails for a non-definitive reason", async () => {
    const expired = jest.fn();
    const off = onSessionExpired(expired);
    mockFetch(async (url) => (url.endsWith("/auth/refresh") ? json(503, {}) : json(401, {})));
    await expect(api("/a")).rejects.toMatchObject({ status: 401 });
    expect(store.refresh).toBe("R1");
    expect(expired).not.toHaveBeenCalled();
    off();
  });

  it("maps a network failure to network_error", async () => {
    mockFetch(async () => {
      throw new TypeError("Network request failed");
    });
    await expect(api("/a")).rejects.toMatchObject({ status: 0, code: "network_error" });
  });

  it("times out a stalled request as network_error", async () => {
    jest.useFakeTimers();
    mockFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("Aborted"), { name: "AbortError" })));
        }),
    );
    const p = api("/slow");
    const assertion = expect(p).rejects.toMatchObject({ code: "network_error" });
    await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1);
    await assertion;
  });

  it("rethrows a caller abort as AbortError, not network_error", async () => {
    mockFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("Aborted"), { name: "AbortError" })));
        }),
    );
    const controller = new AbortController();
    const p = api("/a", { signal: controller.signal });
    controller.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });

  it("parses the backend error shape and field errors", async () => {
    mockFetch(async () =>
      json(422, { error: { code: "validation_error", message: "Invalid", details: [{ field: "email", message: "Value error, Bad email" }] } }),
    );
    const err = (await api("/auth/register", { method: "POST", body: {} }).catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.fieldErrors()).toEqual({ email: "Bad email" });
  });
});
