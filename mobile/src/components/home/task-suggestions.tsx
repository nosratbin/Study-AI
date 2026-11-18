import { ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { toApiError } from "@/lib/api";
import type { TaskSuggestion } from "@/lib/types";
import { useColors } from "@/theme/colors";
import { Pressable, Text, View } from "@/tw";
import { formatMinutes } from "./today";
import { usePlanSuggestion, useTaskSuggestions } from "./use-today-tasks";

/** Empty "Today" checklist: a line of copy plus the planner's next-lesson suggestions as one-tap "plan for today". */
export function NoTasksToday({ day, enabled }: { day: string; enabled: boolean }) {
  const c = useColors();
  const suggestions = useTaskSuggestions(enabled);
  const plan = usePlanSuggestion(day);
  const items = (suggestions.data ?? []).slice(0, 2);

  return (
    <View className="gap-1 rounded-2xl bg-card py-2">
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Ionicons name="sunny-outline" size={20} color={c.muted} />
        <Text className="flex-1 text-[15px] leading-[22px] text-muted">Nothing planned for today.{items.length ? " Add a lesson:" : ""}</Text>
      </View>
      {items.map((s: TaskSuggestion) => {
        const busy = plan.isPending && plan.variables?.lesson_id === s.lesson_id;
        return (
          <Pressable
            key={s.lesson_id}
            onPress={() => !plan.isPending && plan.mutate(s)}
            accessibilityRole="button"
            accessibilityLabel={`Plan for today: ${s.title}, ${formatMinutes(s.duration_min)}`}
            accessibilityState={{ busy, disabled: plan.isPending }}
            className="min-h-14 flex-row items-center gap-3 px-4 py-2.5 active:opacity-70"
          >
            <View className="h-7 w-7 items-center justify-center rounded-full bg-brand-50">
              {busy ? <ActivityIndicator size="small" color={c.brand500} /> : <Ionicons name="add" size={18} color={c.brand600} />}
            </View>
            <View className="flex-1">
              <Text className="text-[15px] leading-[22px] text-ink" numberOfLines={2}>
                {s.title}
              </Text>
              <Text className="text-[13px] leading-[18px] text-muted" numberOfLines={1}>
                {s.course_title} · {formatMinutes(s.duration_min)}
              </Text>
            </View>
          </Pressable>
        );
      })}
      {plan.isError ? (
        <Text className="px-4 pb-2 text-[13px] leading-[18px] text-danger" accessibilityLiveRegion="polite">
          {toApiError(plan.error).message}
        </Text>
      ) : null}
    </View>
  );
}
