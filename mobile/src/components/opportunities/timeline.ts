/**
 * "My applications" timeline: tracked applications grouped by stage in pipeline order, then saved-but-untracked
 * opportunities. Pure, so it is unit-tested.
 */
import { APPLICATION_LABELS, type ApplicationStatus, type Opportunity, type TrackedApplication } from "@/lib/types";

export const STATUS_ORDER: ApplicationStatus[] = ["planned", "applied", "accepted", "rejected"];

/** Position on the three-step track Planned → Applied → Result. */
export function statusStep(s: ApplicationStatus): 0 | 1 | 2 {
  return s === "planned" ? 0 : s === "applied" ? 1 : 2;
}

export type TimelineKey = ApplicationStatus | "saved";

export interface TimelineItem {
  opportunity: Opportunity;
  status: ApplicationStatus | null;
}

export interface TimelineSection {
  key: TimelineKey;
  title: string;
  data: TimelineItem[];
}

const time = (iso: string | null | undefined) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? null : t;
};

/** Soonest deadline first; no deadline after dated ones; ties by title. */
function byDeadline(a: Opportunity, b: Opportunity): number {
  const ta = time(a.deadline);
  const tb = time(b.deadline);
  if (ta !== tb) {
    if (ta === null) return 1;
    if (tb === null) return -1;
    return ta - tb;
  }
  return a.title.localeCompare(b.title);
}

/** Most recent first, ties by title. */
function byRecent(at: (t: TrackedApplication) => string | null) {
  return (a: TrackedApplication, b: TrackedApplication) => {
    const d = (time(at(b)) ?? 0) - (time(at(a)) ?? 0);
    return d !== 0 ? d : a.opportunity.title.localeCompare(b.opportunity.title);
  };
}

export const SAVED_TITLE = "Saved";

export function buildTimeline(applications: TrackedApplication[], saved: Opportunity[] = []): TimelineSection[] {
  const sections: TimelineSection[] = [];
  for (const status of STATUS_ORDER) {
    const rows = applications.filter((t) => t.application.status === status);
    if (!rows.length) continue;
    if (status === "planned") rows.sort((a, b) => byDeadline(a.opportunity, b.opportunity));
    else if (status === "applied") rows.sort(byRecent((t) => t.application.applied_at ?? t.application.updated_at));
    else rows.sort(byRecent((t) => t.application.updated_at));
    sections.push({ key: status, title: APPLICATION_LABELS[status], data: rows.map((t) => ({ opportunity: t.opportunity, status })) });
  }
  const tracked = new Set(applications.map((t) => t.opportunity.id));
  const onlySaved = saved.filter((o) => !tracked.has(o.id)).sort(byDeadline);
  if (onlySaved.length) sections.push({ key: "saved", title: SAVED_TITLE, data: onlySaved.map((o) => ({ opportunity: o, status: null })) });
  return sections;
}
