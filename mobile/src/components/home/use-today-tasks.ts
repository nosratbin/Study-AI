/**
 * Today's study tasks from the planner (Bangladesh calendar day), with an optimistic done/undo toggle and a quick
 * "plan this lesson for today" action. All keys live under "planner" so the weekly summary (streak) refreshes too.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ApiError } from "@/lib/api";
import { useApiQuery } from "@/lib/query";
import type { PlannerSummary, StudyTask, TaskSuggestion, TaskStatus } from "@/lib/types";
import { allDone } from "./today";

export const PLANNER_KEY = ["planner"] as const;
const TOGGLE_KEY = ["planner", "toggle"] as const;

export const todayTasksKey = (day: string) => ["planner", "tasks", day] as const;

export function useTodayTasks(day: string, enabled: boolean) {
  return useApiQuery<StudyTask[]>(todayTasksKey(day), enabled ? `/planner/tasks?from=${day}&to=${day}` : null);
}

export function usePlannerSummary(enabled: boolean) {
  return useApiQuery<PlannerSummary>(["planner", "summary"], enabled ? "/planner/summary" : null);
}

export function useTaskSuggestions(enabled: boolean) {
  return useApiQuery<TaskSuggestion[]>(["planner", "suggestions"], enabled ? "/planner/suggestions" : null);
}

type ToggleVars = { task: StudyTask; status: TaskStatus };
type ToggleContext = { before?: Pick<StudyTask, "status" | "done_at"> };

/**
 * Optimistic toggle. `onAllDone` fires (once, at the moment of the tap) when this toggle completes the last open task.
 * A failure rolls back only that task, and only if no later tap has changed it since, so it can't undo another row's
 * in-flight change; `onFailed` lets the screen tell the student.
 */
export function useToggleTask(day: string, { onAllDone, onFailed }: { onAllDone: () => void; onFailed: (task: StudyTask) => void }) {
  const qc = useQueryClient();
  const key = todayTasksKey(day);
  return useMutation<StudyTask, ApiError, ToggleVars, ToggleContext>({
    mutationKey: TOGGLE_KEY,
    mutationFn: ({ task, status }) => api<StudyTask>(`/planner/tasks/${task.id}`, { method: "PATCH", body: { status } }),
    onMutate: async ({ task, status }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<StudyTask[]>(key);
      const current = prev?.find((t) => t.id === task.id);
      if (!prev || !current) return {};
      const next = prev.map((t) => (t.id === task.id ? { ...t, status, done_at: status === "done" ? new Date().toISOString() : null } : t));
      qc.setQueryData(key, next);
      if (status === "done" && allDone(next) && !allDone(prev)) onAllDone();
      return { before: { status: current.status, done_at: current.done_at } };
    },
    onError: (_e, { task, status }, ctx) => {
      const before = ctx?.before;
      if (before) {
        qc.setQueryData<StudyTask[]>(key, (old) =>
          old?.map((t) => (t.id === task.id && t.status === status ? { ...t, status: before.status, done_at: before.done_at } : t)),
        );
      }
      onFailed(task);
    },
    onSettled: () => {
      // Rapid taps on several rows: refetch once, after the last one lands.
      if (qc.isMutating({ mutationKey: TOGGLE_KEY }) === 1) qc.invalidateQueries({ queryKey: PLANNER_KEY });
    },
  });
}

export function usePlanSuggestion(day: string) {
  const qc = useQueryClient();
  return useMutation<StudyTask, ApiError, TaskSuggestion>({
    mutationFn: (s) =>
      api<StudyTask>("/planner/tasks", { method: "POST", body: { title: s.title, due_on: day, planned_minutes: Math.min(480, Math.max(5, s.duration_min)), lesson_id: s.lesson_id } }),
    onSuccess: (task) => {
      qc.setQueryData<StudyTask[]>(todayTasksKey(day), (old) => (old ? [...old, task] : [task]));
      qc.invalidateQueries({ queryKey: PLANNER_KEY });
    },
  });
}
