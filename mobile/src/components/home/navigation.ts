/**
 * Navigation for Home and Notifications. A quick double tap must not push a screen twice, so calls within
 * NAV_LOCK_MS of the last one are dropped. Tab routes use `router.navigate` (it returns to the existing tabs navigator,
 * so a pushed screen such as Notifications doesn't stack a second one); detail routes are pushed.
 */
import { router, type Href } from "expo-router";

export const NAV_LOCK_MS = 700;
export const TAB_ROUTES = new Set(["/", "/learn", "/tutor", "/opportunities", "/profile"]);

let lastNav = -Infinity;

export function isTabRoute(route: string): boolean {
  return TAB_ROUTES.has(route);
}

/** Open `route` once per tap: navigate for tabs, push for detail screens. Returns false when dropped as a repeat. */
export function go(route: string, now: number = Date.now()): boolean {
  if (now - lastNav < NAV_LOCK_MS) return false;
  lastNav = now;
  if (isTabRoute(route)) router.navigate(route as Href);
  else router.push(route as Href);
  return true;
}

/** Test hook: forget the last navigation time. */
export function resetNavLock() {
  lastNav = -Infinity;
}
