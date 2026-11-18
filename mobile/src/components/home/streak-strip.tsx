import { Ionicons } from "@expo/vector-icons";
import { ProgressBar } from "@/components/ui";
import type { PlannerSummary } from "@/lib/types";
import { useColors } from "@/theme/colors";
import { Text, View } from "@/tw";

/** Streak and this week's planner progress in one slim row. Hidden until there is something to show. */
export function StreakStrip({ summary }: { summary: PlannerSummary }) {
  const c = useColors();
  const { streak_days: streak, tasks_done: done, tasks_total: total } = summary;
  if (!streak && !total) return null;

  const streakText = streak ? `${streak}-day streak` : "Start a streak today";
  const weekText = total ? `${done} of ${total} tasks this week` : "No tasks planned this week";

  return (
    <View className="gap-3 rounded-2xl bg-card px-4 py-4" accessible accessibilityLabel={`${streakText}. ${weekText}.`}>
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: streak ? c.brand50 : c.mutedBg }}>
          <Ionicons name={streak ? "flame" : "flame-outline"} size={20} color={streak ? c.brand500 : c.muted} />
        </View>
        <View className="flex-1">
          <Text className="type-body font-semibold text-ink">{streakText}</Text>
          <Text className="text-[13px] leading-[18px] text-muted">{weekText}</Text>
        </View>
      </View>
      {total ? <ProgressBar value={(100 * done) / total} /> : null}
    </View>
  );
}
