/**
 * Suggestions for the institution and district steps, from the backend's open-data lists (GET /api/meta/*, public).
 * Suggestions only: whatever the student types is saved even if it isn't in a list.
 */
import { useEffect, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useApiQuery } from "@/lib/query";
import type { EducationLevel } from "@/lib/types";
import type { District } from "./onboarding";

export interface Institution {
  name: string;
  kinds: EducationLevel[];
}

const KIND_LABEL: Record<EducationLevel, string> = { school: "School", college: "College", university: "University" };

export function kindsLabel(kinds: EducationLevel[]): string {
  return kinds.map((k) => KIND_LABEL[k]).join(" · ");
}

/** `value`, once it has stopped changing for `ms`. */
export function useDebounced<T>(value: T, ms = 250): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
}

/** The backend needs at least 2 characters; fewer returns nothing, so we don't ask. */
export function useInstitutionSearch(query: string, level: EducationLevel | "") {
  const q = useDebounced(query.trim());
  const params = new URLSearchParams({ q, limit: "8", ...(level ? { level } : {}) });
  return useApiQuery<{ items: Institution[] }>(["meta", "institutions", level, q], q.length >= 2 ? `/meta/institutions?${params}` : null, {
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });
}

/** All 64 districts, fetched once and filtered on the phone. */
export function useDistricts() {
  return useApiQuery<{ items: District[] }>(["meta", "districts"], "/meta/districts", { staleTime: Infinity, gcTime: Infinity });
}
