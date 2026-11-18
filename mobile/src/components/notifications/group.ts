/**
 * Pure helpers for the notifications screen: day grouping (Bangladesh calendar days) and mapping the backend's
 * web-style `link` (e.g. "/opportunities-hub/<id>") to an in-app route.
 */
import type { AppNotification } from "@/lib/types";

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DayTitle = "Today" | "Yesterday" | "Earlier";

export interface NotificationSection {
  title: DayTitle;
  data: AppNotification[];
}

/** Days since the Unix epoch on the Bangladesh calendar. */
function dhakaDayNumber(ms: number): number {
  return Math.floor((ms + DHAKA_OFFSET_MS) / DAY_MS);
}

/** Today / Yesterday / Earlier sections in that order, keeping each item's order; empty sections are omitted. */
export function groupByDay(items: AppNotification[], now: Date = new Date()): NotificationSection[] {
  const today = dhakaDayNumber(now.getTime());
  const buckets: Record<DayTitle, AppNotification[]> = { Today: [], Yesterday: [], Earlier: [] };
  for (const n of items) {
    const diff = today - dhakaDayNumber(Date.parse(n.created_at));
    buckets[diff <= 0 ? "Today" : diff === 1 ? "Yesterday" : "Earlier"].push(n);
  }
  return (["Today", "Yesterday", "Earlier"] as const).filter((t) => buckets[t].length).map((title) => ({ title, data: buckets[title] }));
}

const SEGMENT = /^[A-Za-z0-9_-]+$/;

/**
 * The app route for a notification link, or null when the app has no screen for it (e.g. /passport, /projects/<id>)
 * or the link is external. Links are written for the web app, so web paths are translated here.
 */
export function routeForLink(link: string | null | undefined): string | null {
  if (!link || !link.startsWith("/") || link.startsWith("//")) return null;
  const path = link.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  if (parts.some((p) => !SEGMENT.test(p))) return null;
  const [head, id, ...rest] = parts;
  if (rest.length) return null;
  switch (head) {
    case undefined:
    case "dashboard":
      return id ? null : "/";
    case "opportunities-hub":
    case "opportunities":
      return id ? `/opportunity/${id}` : "/opportunities";
    case "learn":
      return id ? `/course/${id}` : "/learn";
    case "lessons":
      return id ? `/lesson/${id}` : null;
    case "tutor":
      return id ? null : "/tutor";
    case "settings":
    case "profile":
      return id ? null : "/profile";
    default:
      return null;
  }
}
