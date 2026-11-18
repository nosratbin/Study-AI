/**
 * Recent Learn searches for this app session. Kept in memory: the project has no general key-value store yet
 * (expo-secure-store is for secrets), so the list resets when the app restarts.
 */
import { useSyncExternalStore } from "react";
import { addRecentSearch } from "./progress";

let recents: string[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function rememberSearch(query: string) {
  const next = addRecentSearch(recents, query);
  if (next !== recents) {
    recents = next;
    emit();
  }
}

export function forgetSearch(query: string) {
  recents = recents.filter((q) => q !== query);
  emit();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useRecentSearches(): string[] {
  return useSyncExternalStore(subscribe, () => recents);
}
