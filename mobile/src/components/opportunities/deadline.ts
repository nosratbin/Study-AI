/**
 * Deadline countdown for opportunity cards and detail. Pure and timezone-safe: it only compares epoch milliseconds, so
 * the device's timezone never shifts the result. Counting matches the backend (`services/opportunities.py: _days_left`):
 * whole 24-hour periods left, rounded down. It is recomputed from `deadline` on every render instead of trusting the
 * server's `days_left`, so cached data shown offline doesn't drift.
 */

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
/** Inside this many days the countdown turns orange (DESIGN.md: "turns orange inside 7 days"). */
export const URGENT_DAYS = 7;

export type CountdownState = "none" | "open" | "closed";

export interface Countdown {
  state: CountdownState;
  /** True while open and less than URGENT_DAYS days remain. */
  urgent: boolean;
  /** Whole days left (null when there is no deadline or it has passed). */
  days: number | null;
  /** Compact text for a pill: "5 days left", "3h left", "Closed". */
  short: string;
  /** Words for screen readers: "Closes in 5 days". */
  spoken: string;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function deadlineCountdown(deadline: string | null | undefined, now: number = Date.now()): Countdown {
  const at = deadline ? Date.parse(deadline) : NaN;
  if (Number.isNaN(at)) return { state: "none", urgent: false, days: null, short: "No fixed deadline", spoken: "No fixed deadline" };

  const left = at - now;
  if (left <= 0) return { state: "closed", urgent: false, days: null, short: "Closed", spoken: "Applications closed" };

  const urgent = left < URGENT_DAYS * DAY_MS;
  if (left < HOUR_MS) return { state: "open", urgent, days: 0, short: "Under 1h left", spoken: "Closes in less than an hour" };
  if (left < DAY_MS) {
    const h = Math.floor(left / HOUR_MS);
    return { state: "open", urgent, days: 0, short: `${h}h left`, spoken: `Closes in ${plural(h, "hour")}` };
  }
  const d = Math.floor(left / DAY_MS);
  return { state: "open", urgent, days: d, short: `${plural(d, "day")} left`, spoken: `Closes in ${plural(d, "day")}` };
}
