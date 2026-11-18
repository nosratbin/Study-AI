/** Profile data: GET/PATCH /api/students/profile (students only; staff get 403, so callers skip it for them). */
import { Alert } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, toApiError } from "@/lib/api";
import { useApiQuery } from "@/lib/query";
import type { EducationLevel, Language, StudentProfile } from "@/lib/types";

export const PROFILE_KEY = ["profile"] as const;

export function useStudentProfile(enabled: boolean) {
  return useApiQuery<StudentProfile>(PROFILE_KEY, enabled ? "/students/profile" : null);
}

export type ProfilePatch = { preferred_language?: Language; education_level?: EducationLevel };

/** Optimistic PATCH. Level and language shape courses, the dashboard and the tutor, so everything else is refreshed after. */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation<StudentProfile, Error, ProfilePatch, { prev?: StudentProfile }>({
    mutationFn: (patch) => api<StudentProfile>("/students/profile", { method: "PATCH", body: patch }),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: PROFILE_KEY });
      const prev = qc.getQueryData<StudentProfile>(PROFILE_KEY);
      if (prev) qc.setQueryData<StudentProfile>(PROFILE_KEY, { ...prev, ...patch });
      return { prev };
    },
    onSuccess: (p) => {
      qc.setQueryData(PROFILE_KEY, p);
    },
    onError: (e, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(PROFILE_KEY, ctx.prev);
      Alert.alert("Couldn't save", toApiError(e).message);
    },
    onSettled: () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== PROFILE_KEY[0] }),
  });
}
