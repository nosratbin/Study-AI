/**
 * Learn data hooks. Keys: ["courses"] (catalogue), ["course", slug] (detail), ["lesson", id] (reader).
 * Progress changes invalidate every key that shows progress, including other screens' ("dashboard", "roadmap").
 */
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api, type ApiError } from "@/lib/api";
import { useApiQuery } from "@/lib/query";
import type { CourseCard, CourseDetail, Dashboard, Lesson } from "@/lib/types";
import type { ProgressOut } from "./progress";

export const lessonPath = (id: string) => `/lessons/${encodeURIComponent(id)}`;

export function useCourses() {
  return useApiQuery<CourseCard[]>(["courses"], "/courses");
}

/** Recommended courses live on the student dashboard (students only; staff get no rail). */
export function useDashboard(enabled: boolean) {
  return useApiQuery<Dashboard>(["dashboard"], enabled ? "/students/dashboard" : null);
}

export function useCourse(slug: string | undefined) {
  return useApiQuery<CourseDetail>(["course", slug], slug ? `/courses/${encodeURIComponent(slug)}` : null);
}

export function useLesson(id: string | undefined) {
  return useApiQuery<Lesson>(["lesson", id], id ? lessonPath(id) : null);
}

export function prefetchLesson(client: QueryClient, id: string | null) {
  if (!id) return;
  client.prefetchQuery({ queryKey: ["lesson", id], queryFn: ({ signal }) => api<Lesson>(lessonPath(id), { signal }) }).catch(() => undefined);
}

function invalidateProgress(client: QueryClient, certificate: boolean) {
  // ["course"] is a prefix: it refreshes every cached course detail, whatever key suffix a screen used.
  for (const key of [["courses"], ["course"], ["dashboard"], ["roadmap"]]) client.invalidateQueries({ queryKey: key });
  if (certificate) {
    // The backend also sends a "Certificate earned" notification; the ["notifications"] prefix refreshes the bell.
    client.invalidateQueries({ queryKey: ["passport"] });
    client.invalidateQueries({ queryKey: ["notifications"] });
  }
}

/** POST /learning/progress. "in_progress" is sent when a lesson opens; "completed" by Mark complete. */
export function useLessonProgress() {
  const client = useQueryClient();
  return useMutation<ProgressOut, ApiError, { lessonId: string; status: "in_progress" | "completed" }>({
    mutationFn: ({ lessonId, status }) => api<ProgressOut>("/learning/progress", { method: "POST", body: { lesson_id: lessonId, status } }),
    onSuccess: (p) => {
      client.setQueryData<Lesson>(["lesson", p.lesson_id], (l) => (l ? { ...l, status: p.status } : l));
      invalidateProgress(client, !!p.certificate_code);
    },
  });
}
