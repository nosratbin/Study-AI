/**
 * Pure helpers for the Home ("Today") screen. Calendar days are counted in Bangladesh time (UTC+6, no DST),
 * matching the backend planner (`app/api/routes/planner.py: today()`) and deadline reminders.
 */
import type { StudyTask } from "@/lib/types";

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "Good morning" etc. for an hour of day (0–23); pass `dhakaHour()`. */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Hello";
}

/** The Bangladesh calendar day of `now` as YYYY-MM-DD (what the planner calls "today"). */
export function dhakaDate(now: Date = new Date()): string {
  return new Date(now.getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}

/** The hour of day (0–23) in Bangladesh time. */
export function dhakaHour(now: Date = new Date()): number {
  return new Date(now.getTime() + DHAKA_OFFSET_MS).getUTCHours();
}

/** Whole Bangladesh calendar days from `now` until `iso` (0 = today, negative = past). */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const a = Date.parse(`${dhakaDate(new Date(iso))}T00:00:00Z`);
  const b = Date.parse(`${dhakaDate(now)}T00:00:00Z`);
  return Math.round((a - b) / DAY_MS);
}

/** "Due today", "Due tomorrow", "5 days left". */
export function deadlineLabel(days: number): string {
  if (days <= 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days} days left`;
}

/** Deadlines still open and due within the next 7 days (today included), soonest first. */
export function deadlinesThisWeek<T extends { deadline: string }>(items: T[], now: Date = new Date()): (T & { days: number })[] {
  return items
    .map((d) => ({ ...d, days: daysUntil(d.deadline, now) }))
    .filter((d) => d.days >= 0 && d.days < 7 && Date.parse(d.deadline) >= now.getTime())
    .sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
}

/** True when there is at least one task and every task is done. */
export function allDone(tasks: Pick<StudyTask, "status">[]): boolean {
  return tasks.length > 0 && tasks.every((t) => t.status === "done");
}

/** "30 min", "1 h", "1 h 30 min". */
export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
