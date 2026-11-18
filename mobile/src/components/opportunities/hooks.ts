/**
 * Opportunity queries and mutations. Every request goes to the student-only `/api/opportunities` routes, which only ever
 * return verified opportunities (`services/opportunities.py: verified_query`). Nothing here creates opportunity data:
 * optimistic updates only touch the student's own `saved` flag and application status.
 *
 * Query keys: ["opportunities", ...] for lists/detail, ["applications"] for My applications.
 */
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { celebrate } from "@/components/motion";
import { api, toApiError } from "@/lib/api";
import { useApiQuery } from "@/lib/query";
import type { ApplicationStatus, Opportunity, OpportunityMatch, TrackedApplication, TrackedApplicationInfo } from "@/lib/types";

export const opportunityKeys = {
  all: ["opportunities"] as const,
  list: (qs: string) => ["opportunities", "list", qs] as const,
  match: ["opportunities", "match"] as const,
  saved: ["opportunities", "saved"] as const,
  detail: (id: string) => ["opportunities", "detail", id] as const,
  applications: ["applications"] as const,
};

export function useOpportunityList(qs: string, enabled = true) {
  return useApiQuery<Opportunity[]>(opportunityKeys.list(qs), enabled ? `/opportunities${qs}` : null, { placeholderData: (prev) => prev });
}

export function useOpportunityMatches(enabled = true) {
  return useApiQuery<OpportunityMatch[]>(opportunityKeys.match, enabled ? "/opportunities/match" : null);
}

export function useSavedOpportunities(enabled = true) {
  return useApiQuery<Opportunity[]>(opportunityKeys.saved, enabled ? "/opportunities/saved" : null);
}

export function useApplications(enabled = true) {
  return useApiQuery<TrackedApplication[]>(opportunityKeys.applications, enabled ? "/opportunities/applications" : null);
}

export function useOpportunity(id: string | undefined) {
  return useApiQuery<Opportunity>(opportunityKeys.detail(id ?? ""), id ? `/opportunities/${encodeURIComponent(id)}` : null);
}

/** Pull-to-refresh state that only spins for a user-initiated refresh, not background refetches. */
export function usePullRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);
  return { refreshing, onRefresh };
}

function useInvalidateAfterChange() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: opportunityKeys.all }),
      qc.invalidateQueries({ queryKey: opportunityKeys.applications }),
      qc.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
}

/**
 * Set (status) or clear (null) the student's own tracking record. Optimistic on the detail cache; rolls back on error.
 * PUT replaces notes, so the existing note is sent back unchanged.
 */
export function useTrackApplication(o: Opportunity | undefined) {
  const qc = useQueryClient();
  const invalidate = useInvalidateAfterChange();
  return useMutation<TrackedApplicationInfo | null, Error, ApplicationStatus | null, { prev?: Opportunity }>({
    mutationFn: async (status) => {
      if (!o) throw new Error("Opportunity not loaded");
      const path = `/opportunities/${encodeURIComponent(o.id)}/application`;
      if (status === null) {
        await api(path, { method: "DELETE" });
        return null;
      }
      return api<TrackedApplicationInfo>(path, { method: "PUT", body: { status, notes: o.application?.notes ?? null } });
    },
    onMutate: async (status) => {
      if (!o) return {};
      const key = opportunityKeys.detail(o.id);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Opportunity>(key);
      if (prev) {
        const now = new Date().toISOString();
        const applied = status === "applied" || status === "accepted" || status === "rejected";
        qc.setQueryData<Opportunity>(key, {
          ...prev,
          saved: status ? true : prev.saved,
          application: status
            ? { status, notes: prev.application?.notes ?? null, applied_at: applied ? (prev.application?.applied_at ?? now) : null, updated_at: now }
            : null,
        });
      }
      return { prev };
    },
    onSuccess: (application, status) => {
      if (o) qc.setQueryData<Opportunity>(opportunityKeys.detail(o.id), (cur) => (cur ? { ...cur, application, saved: application ? true : cur.saved } : cur));
      if (status === "applied") celebrate();
    },
    onError: (e, _status, ctx) => {
      if (o && ctx?.prev) qc.setQueryData(opportunityKeys.detail(o.id), ctx.prev);
      Alert.alert("Couldn't update your status", toApiError(e).message);
    },
    onSettled: invalidate,
  });
}

/** Bookmark toggle, optimistic on the detail cache. */
export function useToggleSave(o: Opportunity | undefined) {
  const qc = useQueryClient();
  const invalidate = useInvalidateAfterChange();
  return useMutation<Opportunity, Error, boolean, { prev?: Opportunity }>({
    mutationFn: (save) => {
      if (!o) throw new Error("Opportunity not loaded");
      return api<Opportunity>(`/opportunities/${encodeURIComponent(o.id)}/save`, { method: save ? "POST" : "DELETE" });
    },
    onMutate: async (save) => {
      if (!o) return {};
      const key = opportunityKeys.detail(o.id);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Opportunity>(key);
      if (prev) qc.setQueryData<Opportunity>(key, { ...prev, saved: save });
      return { prev };
    },
    onSuccess: (fresh) => {
      qc.setQueryData(opportunityKeys.detail(fresh.id), fresh);
    },
    onError: (e, _save, ctx) => {
      if (o && ctx?.prev) qc.setQueryData(opportunityKeys.detail(o.id), ctx.prev);
      Alert.alert("Couldn't update", toApiError(e).message);
    },
    onSettled: invalidate,
  });
}
