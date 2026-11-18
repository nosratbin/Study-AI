import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, render, waitFor } from "@testing-library/react-native";
import { useEffect } from "react";
import { Text } from "react-native";
import type { User } from "../types";

const USER: User = {
  id: "u1",
  email: "a@example.com",
  full_name: "Ayesha",
  role: "student",
  avatar_url: null,
  onboarding_completed: true,
  created_at: "2026-01-01T00:00:00Z",
};

const mockState: { access: string | null; refresh: string | null; user: User | null; revoke: string | null } = {
  access: null,
  refresh: null,
  user: null,
  revoke: null,
};

jest.mock("../tokens", () => ({
  getAccessToken: jest.fn(async () => mockState.access),
  getRefreshToken: jest.fn(async () => mockState.refresh),
  hasSession: jest.fn(async () => !!mockState.access || !!mockState.refresh),
  setTokens: jest.fn(async (a: string, r: string) => {
    mockState.access = a;
    mockState.refresh = r;
  }),
  clearTokens: jest.fn(async () => {
    mockState.access = null;
    mockState.refresh = null;
    mockState.user = null;
  }),
  getCachedUser: jest.fn(async () => mockState.user),
  setCachedUser: jest.fn(async (u: User) => {
    mockState.user = u;
  }),
  getPendingRevoke: jest.fn(async () => mockState.revoke),
  setPendingRevoke: jest.fn(async (t: string | null) => {
    mockState.revoke = t;
  }),
}));

const mockApi = jest.fn<(path: string, opts?: { method?: string; body?: unknown; auth?: boolean }) => Promise<unknown>>();

jest.mock("../api", () => {
  const actual = jest.requireActual<typeof import("../api")>("../api");
  return { ...actual, api: (path: string, opts?: { method?: string; body?: unknown; auth?: boolean }) => mockApi(path, opts) };
});

// eslint-disable-next-line import/first
import { ApiError } from "../api";
// eslint-disable-next-line import/first
import { AuthProvider, useAuth } from "../auth";

const offline = () => new ApiError(0, "network_error", "offline");

let ctx: ReturnType<typeof useAuth>;
function Probe() {
  const auth = useAuth();
  useEffect(() => {
    ctx = auth;
  });
  return <Text>{auth.loading ? "loading" : (auth.user?.full_name ?? "signed-out")}</Text>;
}

async function mount() {
  return await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

beforeEach(() => {
  mockState.access = null;
  mockState.refresh = null;
  mockState.user = null;
  mockState.revoke = null;
  mockApi.mockReset();
});

describe("AuthProvider", () => {
  it("is signed out without a stored session and never calls /auth/me", async () => {
    const screen = await mount();
    await waitFor(() => expect(screen.getByText("signed-out")).toBeTruthy());
    expect(mockApi).not.toHaveBeenCalledWith("/auth/me", undefined);
  });

  it("stays signed in with the cached user when a cold start is offline", async () => {
    mockState.access = "A";
    mockState.refresh = "R";
    mockState.user = USER;
    mockApi.mockRejectedValue(offline());
    const screen = await mount();
    await waitFor(() => expect(screen.getByText("Ayesha")).toBeTruthy());
    // Retries happen in the background; the user must not be signed out.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 3200));
    });
    expect(screen.getByText("Ayesha")).toBeTruthy();
    expect(mockState.refresh).toBe("R");
  }, 10_000);

  it("signs out when the server definitively rejects the session", async () => {
    mockState.access = "A";
    mockState.refresh = "R";
    mockState.user = USER;
    mockApi.mockImplementation(async (path) => {
      if (path === "/auth/me") {
        mockState.refresh = null; // api() clears tokens when the refresh is rejected
        throw new ApiError(401, "token_expired", "expired");
      }
      return undefined;
    });
    const screen = await mount();
    await waitFor(() => expect(screen.getByText("signed-out")).toBeTruthy());
    expect(mockState.user).toBeNull();
  });

  it("reload() resolves false and keeps the user when offline", async () => {
    mockState.access = "A";
    mockState.refresh = "R";
    mockApi.mockResolvedValueOnce(USER);
    const screen = await mount();
    await waitFor(() => expect(screen.getByText("Ayesha")).toBeTruthy());
    mockApi.mockRejectedValue(offline());
    let ok: boolean | undefined;
    await act(async () => {
      ok = await ctx.reload();
    });
    expect(ok).toBe(false);
    expect(screen.getByText("Ayesha")).toBeTruthy();
  });

  it("logout offline clears the local session and remembers the token to revoke", async () => {
    mockState.access = "A";
    mockState.refresh = "R";
    mockApi.mockResolvedValueOnce(USER);
    const screen = await mount();
    await waitFor(() => expect(screen.getByText("Ayesha")).toBeTruthy());
    mockApi.mockRejectedValue(offline());
    await act(async () => {
      await ctx.logout();
    });
    expect(screen.getByText("signed-out")).toBeTruthy();
    expect(mockState.access).toBeNull();
    expect(mockState.revoke).toBe("R");
  });

  it("flushes a pending revocation without the current bearer token", async () => {
    mockState.revoke = "OLD";
    mockApi.mockResolvedValue(undefined);
    const screen = await mount();
    await waitFor(() => expect(screen.getByText("signed-out")).toBeTruthy());
    await waitFor(() => expect(mockState.revoke).toBeNull());
    expect(mockApi).toHaveBeenCalledWith("/auth/logout", { method: "POST", body: { refresh_token: "OLD" }, auth: false });
  });
});
