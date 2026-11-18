/** Pure helpers for the Profile screen (unit-tested; no native imports). */
import type { Language } from "@/lib/types";

export type ThemePreference = "system" | "light" | "dark";
/** `Appearance.setColorScheme` argument (not exported from the react-native root). */
export type ColorSchemeOverride = "light" | "dark" | "auto";

export const THEME_OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: "system", label: "System", hint: "Match your phone's setting" },
  { value: "light", label: "Light", hint: "Always light" },
  { value: "dark", label: "Dark", hint: "Always dark" },
];

export const LANGUAGE_OPTIONS: { value: Language; label: string; hint: string }[] = [
  { value: "en", label: "English", hint: "Lessons and the AI Tutor answer in English" },
  { value: "bn", label: "বাংলা", hint: "Bangla where available" },
];

export function isThemePreference(v: unknown): v is ThemePreference {
  return v === "system" || v === "light" || v === "dark";
}

/** What `Appearance.setColorScheme` takes: "auto" removes the override and follows the system. */
export function toColorSchemeOverride(p: ThemePreference): ColorSchemeOverride {
  return p === "system" ? "auto" : p;
}

/** Up to two initials for the avatar fallback: "Nusrat Jahan Rimi" → "NR", "rahim" → "R". */
export function initials(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const first = Array.from(words[0])[0] ?? "";
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? "") : "";
  return (first + last).toUpperCase();
}
