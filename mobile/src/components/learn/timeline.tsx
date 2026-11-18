/**
 * Course detail pieces: the lessons as a vertical path (done / up next / in progress / upcoming), the hero that fades
 * as the list scrolls, and the layout-matching skeleton.
 */
import { memo } from "react";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { cn } from "@/lib/cn";
import { levelLabel, type CourseDetail, type LessonSummary } from "@/lib/types";
import { DemoBadge, Icon, ProgressBar } from "@/components/ui";
import { PressableScale, Skeleton } from "@/components/motion";
import { useColors } from "@/theme/colors";
import { Text, View } from "@/tw";
import { lessonA11yLabel, type LessonState } from "./progress";

function categoryLabel(value: string) {
  const s = value.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Distance the hero title travels before the header title takes over. */
export const HERO_FADE = 72;

export function CourseHero({ course, scrollY }: { course: CourseDetail; scrollY: SharedValue<number> }) {
  const fade = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [0, HERO_FADE], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.get(), [0, HERO_FADE], [0, -12], Extrapolation.CLAMP) }],
  }));
  const started = course.completed_lessons > 0;
  return (
    <View className="gap-5 px-4 pb-6 pt-2">
      <Animated.View style={fade}>
        <View className="gap-2">
          <Text className="text-[13px] leading-[18px] text-muted">
            {levelLabel(course.level)} · {categoryLabel(course.category)}
          </Text>
          <Text accessibilityRole="header" className="type-display text-ink">
            {course.title}
          </Text>
          <DemoBadge show={course.is_demo} />
        </View>
      </Animated.View>
      <Text className="text-[15px] leading-[22px] text-muted">{course.description}</Text>
      <View className="gap-2 rounded-2xl bg-card p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-[13px] leading-[18px] text-muted">
            {course.lesson_count} lessons · {course.estimated_hours} h
          </Text>
          <Text className="text-[13px] font-semibold leading-[18px] text-ink">{started ? `${course.percent}% done` : "Not started"}</Text>
        </View>
        <ProgressBar value={course.percent} label={`Course progress, ${course.completed_lessons} of ${course.lesson_count} lessons`} />
      </View>
      <Text accessibilityRole="header" className="pt-1 type-heading text-ink">
        Lessons
      </Text>
    </View>
  );
}

/** Title in the native header, fading in once the hero title has scrolled away. */
export function HeaderTitle({ title, scrollY }: { title: string; scrollY: SharedValue<number> }) {
  const c = useColors();
  const style = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.get(), [HERO_FADE - 24, HERO_FADE + 8], [0, 1], Extrapolation.CLAMP) }));
  return (
    <Animated.Text numberOfLines={1} style={[{ color: c.ink, fontSize: 17, fontWeight: "600", maxWidth: 240 }, style]}>
      {title}
    </Animated.Text>
  );
}

function Node({ state, number }: { state: LessonState; number: number }) {
  const c = useColors();
  if (state === "done") {
    return (
      <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-solid">
        <Icon name="checkmark" size={18} color="#fff" />
      </View>
    );
  }
  if (state === "current" || state === "started") {
    return (
      <View className="h-8 w-8 items-center justify-center rounded-full border-2 border-brand-500 bg-card">
        {state === "current" ? <View className="h-3 w-3 rounded-full bg-brand-500" /> : <Icon name="ellipsis-horizontal" size={14} color={c.brand500} />}
      </View>
    );
  }
  return (
    <View className="h-8 w-8 items-center justify-center rounded-full bg-muted-bg">
      <Text className="text-[13px] font-semibold text-muted">{number}</Text>
    </View>
  );
}

/** One stop on the lesson path. The rail segments above and below the node are orange where lessons are done. */
export const TimelineRow = memo(function TimelineRow({
  lesson,
  number,
  state,
  prevDone,
  isFirst,
  isLast,
  onPress,
}: {
  lesson: LessonSummary;
  number: number;
  state: LessonState;
  prevDone: boolean;
  isFirst: boolean;
  isLast: boolean;
  onPress: (id: string) => void;
}) {
  const c = useColors();
  const current = state === "current";
  return (
    <PressableScale
      onPress={() => onPress(lesson.id)}
      accessibilityLabel={lessonA11yLabel(number, state, lesson.title, lesson.duration_min)}
      accessibilityHint="Opens the lesson"
      className="flex-row px-4"
    >
      <View className="w-8 items-center">
        <View className={cn("h-4 w-0.5", isFirst ? "bg-transparent" : prevDone ? "bg-brand-500" : "bg-line")} />
        <Node state={state} number={number} />
        <View className={cn("w-0.5 flex-1", isLast ? "bg-transparent" : state === "done" ? "bg-brand-500" : "bg-line")} />
      </View>
      <View className="flex-1 pb-3 pl-3">
        <View className={cn("flex-row items-center gap-3 rounded-2xl p-4", current ? "bg-card" : "bg-transparent")}>
          <View className="flex-1 gap-1">
            <Text className={cn("text-[13px] leading-[18px]", current ? "font-semibold text-brand-700" : "text-muted")}>
              {current ? "Up next" : `Lesson ${number}`} · {lesson.duration_min} min
            </Text>
            <Text className={cn("text-[15px] leading-[22px]", state === "done" ? "text-muted" : "font-semibold text-ink")}>{lesson.title}</Text>
          </View>
          <Icon name="chevron-forward" size={18} color={current ? c.brand500 : c.muted} />
        </View>
      </View>
    </PressableScale>
  );
});

export function CourseDetailSkeleton() {
  return (
    <View className="gap-5 px-4 pt-2" accessible accessibilityLabel="Loading course">
      <View className="gap-2">
        <Skeleton className="h-4 w-40 rounded-lg" />
        <Skeleton className="h-8 w-5/6 rounded-lg" />
        <Skeleton className="h-8 w-1/2 rounded-lg" />
      </View>
      <View className="gap-2">
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="h-4 w-4/5 rounded-lg" />
      </View>
      <View className="gap-3 rounded-2xl bg-card p-4">
        <Skeleton className="h-4 w-1/2 rounded-lg" />
        <Skeleton className="h-2 w-full rounded-full" />
      </View>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} className="flex-row items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <View className="flex-1 gap-2 py-4">
            <Skeleton className="h-4 w-24 rounded-lg" />
            <Skeleton className="h-5 w-3/4 rounded-lg" />
          </View>
        </View>
      ))}
    </View>
  );
}
