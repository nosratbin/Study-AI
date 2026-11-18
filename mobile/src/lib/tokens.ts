/**
 * Session storage in the OS keystore (expo-secure-store). The access token is cached in memory to avoid a keystore read
 * per request. Also keeps the last signed-in user (so a cold start offline stays signed in) and a refresh token whose
 * server-side revocation is still owed after an offline sign-out.
 */
import * as SecureStore from "expo-secure-store";
import type { User } from "./types";

const ACCESS = "iccheghuri.access";
const REFRESH = "iccheghuri.refresh";
const USER = "iccheghuri.user";
const PENDING_REVOKE = "iccheghuri.pending-revoke";

let accessCache: string | null | undefined;

export async function getAccessToken(): Promise<string | null> {
  if (accessCache === undefined) accessCache = await SecureStore.getItemAsync(ACCESS);
  return accessCache;
}

export function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH);
}

export async function hasSession(): Promise<boolean> {
  return !!(await getAccessToken()) || !!(await getRefreshToken());
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  accessCache = access;
  await Promise.all([SecureStore.setItemAsync(ACCESS, access), SecureStore.setItemAsync(REFRESH, refresh)]);
}

/** Clears the tokens and the cached user. */
export async function clearTokens(): Promise<void> {
  accessCache = null;
  await Promise.all([SecureStore.deleteItemAsync(ACCESS), SecureStore.deleteItemAsync(REFRESH), SecureStore.deleteItemAsync(USER)]);
}

export async function getCachedUser(): Promise<User | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER);
    const u = raw ? (JSON.parse(raw) as Partial<User>) : null;
    return u && typeof u.id === "string" && typeof u.role === "string" ? (u as User) : null;
  } catch {
    return null;
  }
}

export function setCachedUser(user: User): Promise<void> {
  return SecureStore.setItemAsync(USER, JSON.stringify(user)).catch(() => undefined);
}

export function getPendingRevoke(): Promise<string | null> {
  return SecureStore.getItemAsync(PENDING_REVOKE);
}

export function setPendingRevoke(refreshToken: string | null): Promise<void> {
  return (refreshToken ? SecureStore.setItemAsync(PENDING_REVOKE, refreshToken) : SecureStore.deleteItemAsync(PENDING_REVOKE)).catch(
    () => undefined,
  );
}
