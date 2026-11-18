/**
 * Appearance preference (System / Light / Dark). Applied with `Appearance.setColorScheme`, which `useColorScheme()`,
 * `useColors()` and the NativeWind `light-dark()` tokens all follow, and persisted in expo-secure-store.
 *
 * Call `restoreThemePreference()` once at module scope in src/app/_layout.tsx (next to
 * `SplashScreen.preventAutoHideAsync()`), so the saved choice is applied before the first frame.
 */
import { useSyncExternalStore } from "react";
import { Appearance } from "react-native";
import * as SecureStore from "expo-secure-store";
import { isThemePreference, toColorSchemeOverride, type ThemePreference } from "./settings";

const KEY = "iccheghuri.theme";

let current: ThemePreference = "system";
let restored = false;
const listeners = new Set<() => void>();

function apply(p: ThemePreference) {
  try {
    Appearance.setColorScheme(toColorSchemeOverride(p));
  } catch {
    /* Appearance unavailable (tests, web): keep following the system */
  }
}

function emit() {
  listeners.forEach((fn) => fn());
}

/** Read the saved preference synchronously and apply it. Safe to call more than once. */
export function restoreThemePreference(): ThemePreference {
  if (restored) return current;
  restored = true;
  try {
    const saved = SecureStore.getItem(KEY);
    if (isThemePreference(saved)) current = saved;
  } catch {
    /* keystore unavailable: fall back to System */
  }
  if (current !== "system") apply(current);
  return current;
}

export function setThemePreference(p: ThemePreference) {
  restored = true;
  current = p;
  apply(p);
  emit();
  SecureStore.setItemAsync(KEY, p).catch(() => undefined);
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, () => (restored ? current : restoreThemePreference()));
}
