import { Ionicons } from "@expo/vector-icons";
import { Button, DemoBadge } from "@/components/ui";
import { PressableScale, Skeleton } from "@/components/motion";
import type { CourseCard, Dashboard } from "@/lib/types";
import { useColors } from "@/theme/colors";
import { Text, View } from "@/tw";
import { ProgressRing } from "./progress-ring";
import { go } from "./navigation";

/**
 * The hero: the next lesson to study and one big Continue button. The course card in the dashboard (when it is among
 * the recommended ones) supplies the slug for the course link and the progress ring.
 */
export function ContinueCard({ next, course }: { next: NonNullable<Dashboard["continue_learning"]>; course?: CourseCard }) {
  const c = useColors();
  const openLesson = () => go(`/lesson/${next.lesson_id}`);
  const percent = course?.percent ?? null;
  const lessonOf = course ? `Lesson ${Math.min(course.completed_lessons + 1, course.lesson_count)} of ${course.lesson_count}` : null;

  return (
    <View className="gap-4 rounded-2xl bg-card p-4">
      <PressableScale
        onPress={() => (course ? go(`/course/${course.slug}`) : openLesson())}
        accessibilityLabel={`${next.course_title}${percent !== null ? `, ${percent}% complete` : ""}. Open course`}
        className="flex-row items-center gap-4"
      >
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text className="type-label text-brand-700">Continue learning</Text>
            {course?.is_demo ? <DemoBadge show /> : null}
          </View>
          <Text className="type-heading text-ink" numberOfLines={2}>
            {next.course_title}
          </Text>
        </View>
        {percent !== null ? (
          <ProgressRing percent={percent} size={52} stroke={5} color={c.brand500} track={c.mutedBg}>
            <Text className="type-caption font-semibold text-ink" allowFontScaling={false}>
              {percent}%
            </Text>
          </ProgressRing>
        ) : (
          <View className="h-13 w-13 items-center justify-center rounded-full bg-brand-50">
            <Ionicons name="book" size={22} color={c.brand500} />
          </View>
        )}
      </PressableScale>

      <View className="flex-row items-center gap-3 rounded-xl bg-surface p-3">
        <View className="h-10 w-10 items-center justify-center rounded-lg bg-card">
          <Ionicons name="play" size={16} color={c.ink} />
        </View>
        <View className="flex-1">
          <Text className="type-callout font-semibold text-ink" numberOfLines={2}>
            {next.lesson_title}
          </Text>
          <Text className="type-caption text-muted">{[lessonOf, `${next.duration_min} min`].filter(Boolean).join(" · ")}</Text>
        </View>
      </View>

      <Button onPress={openLesson} accessibilityLabel={`Continue: ${next.lesson_title}`}>
        Continue lesson
      </Button>
    </View>
  );
}

/** Shown when there is nothing in progress (new student or every course finished). */
export function StartLearningCard() {
  const c = useColors();
  return (
    <View className="gap-4 rounded-2xl bg-card p-4">
      <View className="flex-row items-center gap-4">
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
          <Ionicons name="sparkles" size={22} color={c.brand500} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="type-heading text-ink">Pick your next course</Text>
          <Text className="type-callout text-muted">Short lessons you can finish on the bus.</Text>
        </View>
      </View>
      <Button onPress={() => go("/learn")} icon="book-outline">
        Browse courses
      </Button>
    </View>
  );
}

export function ContinueCardSkeleton() {
  return (
    <View className="gap-4 rounded-2xl bg-card p-4">
      <View className="flex-row items-center gap-4">
        <View className="flex-1 gap-2">
          <Skeleton className="h-3.5 w-28 rounded-md" />
          <Skeleton className="h-5 w-4/5 rounded-md" />
        </View>
        <Skeleton className="h-13 w-13 rounded-full" />
      </View>
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-full" />
    </View>
  );
}
