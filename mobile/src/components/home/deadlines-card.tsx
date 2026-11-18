import { Ionicons } from "@expo/vector-icons";
import { cn } from "@/lib/cn";
import type { Dashboard } from "@/lib/types";
import { useColors } from "@/theme/colors";
import { Pressable, Text, View } from "@/tw";
import { deadlineLabel, deadlinesThisWeek } from "./today";
import { go } from "./navigation";

/**
 * A quiet card: saved, verified opportunities (the backend only returns verified ones) whose deadline falls within
 * the next 7 days. Nothing this week collapses to a single "browse" row.
 */
export function DeadlinesCard({ deadlines }: { deadlines: Dashboard["upcoming_deadlines"] }) {
  const c = useColors();
  const soon = deadlinesThisWeek(deadlines).slice(0, 3);

  if (!soon.length) {
    return (
      <Pressable
        onPress={() => go("/opportunities")}
        accessibilityRole="link"
        accessibilityLabel="Browse scholarships and competitions"
        className="mx-4 min-h-14 flex-row items-center gap-3 rounded-2xl bg-card px-4 py-3 active:opacity-70"
      >
        <Ionicons name="trophy-outline" size={20} color={c.muted} />
        <Text className="flex-1 text-[15px] leading-[22px] text-muted">Browse scholarships and competitions</Text>
        <Ionicons name="chevron-forward" size={18} color={c.muted} />
      </Pressable>
    );
  }

  return (
    <View className="mx-4 rounded-2xl bg-card py-2">
      <Text className="px-4 pb-1 pt-2 text-[13px] font-semibold leading-[18px] text-muted" accessibilityRole="header">
        Deadlines this week
      </Text>
      {soon.map((d) => (
        <Pressable
          key={d.opportunity_id}
          onPress={() => go(`/opportunity/${d.opportunity_id}`)}
          accessibilityRole="link"
          accessibilityLabel={`${d.title}. ${deadlineLabel(d.days)}`}
          className="min-h-14 flex-row items-center gap-3 px-4 py-2.5 active:opacity-70"
        >
          <Text className="flex-1 text-[15px] leading-[22px] text-ink" numberOfLines={2}>
            {d.title}
          </Text>
          <Text className={cn("text-[13px] font-semibold leading-[18px]", d.days <= 2 ? "text-brand-700" : "text-muted")}>{deadlineLabel(d.days)}</Text>
        </Pressable>
      ))}
    </View>
  );
}
