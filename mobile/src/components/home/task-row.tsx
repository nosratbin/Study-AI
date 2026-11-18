import { memo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale, Skeleton } from "@/components/motion";
import { cn } from "@/lib/cn";
import type { StudyTask } from "@/lib/types";
import { useColors } from "@/theme/colors";
import { Pressable, Text, View } from "@/tw";
import { formatMinutes } from "./today";
import { go } from "./navigation";

/** One checklist row. The row toggles done; a linked lesson opens from the trailing button. */
export const TaskRow = memo(function TaskRow({ task, onToggle }: { task: StudyTask; onToggle: (t: StudyTask) => void }) {
  const c = useColors();
  const done = task.status === "done";
  const meta = [formatMinutes(task.planned_minutes), task.lesson_title && task.lesson_title !== task.title ? task.lesson_title : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <View className="flex-row items-center bg-card pr-2">
      <View className="flex-1">
        <PressableScale
          onPress={() => onToggle(task)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={`${task.title}, ${formatMinutes(task.planned_minutes)}`}
          className="min-h-14 flex-row items-center gap-3 py-3 pl-4"
        >
          <View
            className={cn("h-7 w-7 items-center justify-center rounded-full border-2", done ? "border-brand-solid bg-brand-solid" : "border-input bg-card")}
          >
            {done ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
          </View>
          <View className="flex-1">
            <Text className={cn("text-[15px] leading-[22px]", done ? "text-muted line-through" : "text-ink")} numberOfLines={2}>
              {task.title}
            </Text>
            <Text className="text-[13px] leading-[18px] text-muted" numberOfLines={1}>
              {meta}
            </Text>
          </View>
        </PressableScale>
      </View>
      {task.lesson_id ? (
        <Pressable
          onPress={() => go(`/lesson/${task.lesson_id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Open lesson: ${task.lesson_title ?? task.title}`}
          className="h-12 w-12 items-center justify-center rounded-full active:bg-muted-bg"
        >
          <Ionicons name="arrow-forward-circle-outline" size={24} color={c.muted} />
        </Pressable>
      ) : null}
    </View>
  );
});

export function TaskRowSkeleton() {
  return (
    <View className="min-h-14 flex-row items-center gap-3 bg-card px-4 py-3">
      <Skeleton className="h-7 w-7 rounded-full" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-16 rounded-md" />
      </View>
    </View>
  );
}
