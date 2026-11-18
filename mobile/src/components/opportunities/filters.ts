/**
 * Explore filters and the query string for GET /api/opportunities (`routes/opportunities.py: list_opportunities`:
 * q <= 100 chars, category, level, include_closed). Pure, so it is unit-tested.
 */
import type { EducationLevel, OpportunityCategory } from "@/lib/types";

export interface OpportunityFilters {
  q: string;
  category: OpportunityCategory | null;
  level: EducationLevel | null;
  includeClosed: boolean;
}

export const EMPTY_FILTERS: OpportunityFilters = { q: "", category: null, level: null, includeClosed: false };

/** Matches the backend's `max_length=100` on `q`. */
export const MAX_QUERY_LENGTH = 100;

/** "" when nothing is set, else "?q=...&category=...&level=...&include_closed=true" in that order. */
export function buildOpportunityQuery(f: OpportunityFilters): string {
  const parts: string[] = [];
  const q = f.q.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH).trim();
  if (q) parts.push(`q=${encodeURIComponent(q)}`);
  if (f.category) parts.push(`category=${encodeURIComponent(f.category)}`);
  if (f.level) parts.push(`level=${encodeURIComponent(f.level)}`);
  if (f.includeClosed) parts.push("include_closed=true");
  return parts.length ? `?${parts.join("&")}` : "";
}

/** How many filters live in the bottom sheet (level, closed); shown as a badge on the filter button. */
export function sheetFilterCount(f: Pick<OpportunityFilters, "level" | "includeClosed">): number {
  return (f.level ? 1 : 0) + (f.includeClosed ? 1 : 0);
}

export function hasAnyFilter(f: OpportunityFilters): boolean {
  return buildOpportunityQuery(f) !== "";
}
