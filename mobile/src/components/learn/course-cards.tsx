/**
 * Course presentation for the Learn tab: a wide rail card, a list row, the level chips and their skeletons.
 * Type scale (DESIGN.md): 17/24 title, 15/22 body, 13/18 caption. Orange marks progress and the active chip only.
 */
import { memo } from "react";
import { FlatList, useWindowDimensions } from "react-native";
import { cn } from "@/lib/cn";
import { levelLabel, LEVELS, type CourseCard, type EducationLevel } from "@/lib/types";
import { DemoBadge, Icon, ProgressBar, type IconName } from "@/components/ui";
import { PressableScale, Skeleton } from "@/components/motion";
import { useColors } from "@/theme/colors";
import { Pressable, ScrollView, Text, View } from "@/tw";
import type { LevelFilter } from "./progress";

const LEVEL_ICON: Record<EducationLevel, IconName> = { school: "bulb-outline", college: "code-slash-outline", university: "school-outline" };

function hours(h: number) {
  return `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
}

function courseA11y(c: CourseCard) {
  const progress = c.percent >= 100 ? "completed" : c.completed_lessons > 0 ? `${c.completed_lessons} of ${c.lesson_count} lessons done` : "not started";
  return `${c.title}. ${levelLabel(c.level)}, ${c.lesson_count} lessons, ${hours(c.estimated_hours)}. ${progress}${c.is_demo ? ". Demo course" : ""}`;
}

export const RAIL_CARD_WIDTH = 272;
const RAIL_GAP = 12;

/**
 * Card for horizontal rails ("In progress", "Recommended", Home's "For you"). Title and description reserve two
 * lines each, so every card in a rail is the same height and the footers line up.
 */
export const RailCard = memo(function RailCard({ course, onPress, width = RAIL_CARD_WIDTH }: { course: CourseCard; onPress: (c: CourseCard) => void; width?: number }) {
  const c = useColors();
  const started = course.completed_lessons > 0;
  const done = course.percent >= 100;
  return (
    <PressableScale onPress={() => onPress(course)} accessibilityLabel={courseA11y(course)} accessibilityHint="Opens the course" style={{ width }} className="gap-4 rounded-2xl bg-card p-4">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <View className={cn("h-9 w-9 items-center justify-center rounded-lg", done ? "bg-success-50" : "bg-brand-50")}>
            <Icon name={done ? "checkmark-circle" : LEVEL_ICON[course.level]} size={18} color={done ? c.success : c.brand500} />
          </View>
          <Text className="type-label text-muted">{levelLabel(course.level)}</Text>
        </View>
        {/* Wrapped: Badge is self-start, which would pin it to the top of this row. */}
        <View>
          <DemoBadge show={course.is_demo} />
        </View>
      </View>
      <View className="gap-1">
        <Text className="type-heading text-ink" numberOfLines={2} style={{ minHeight: 44 }}>
          {course.title}
        </Text>
        <Text className="type-callout text-muted" numberOfLines={2} style={{ minHeight: 40 }}>
          {course.description}
        </Text>
      </View>
      {started && !done ? (
        <View className="gap-2">
          <ProgressBar value={course.percent} />
          <Text className="type-caption text-muted">
            {course.completed_lessons} of {course.lesson_count} lessons · {course.percent}%
          </Text>
        </View>
      ) : (
        <View className="flex-row items-center justify-between border-t border-line pt-3">
          <Text className="type-caption text-muted">
            {done ? "Completed" : `${course.lesson_count} lessons`} · {hours(course.estimated_hours)}
          </Text>
          <Icon name="arrow-forward" size={16} color={c.ink} />
        </View>
      )}
    </PressableScale>
  );
});

/**
 * "In progress" card: progress is the point, so no description and no reserved title lines. Big percentage on the
 * right, the bar and the lesson count underneath, and a resume affordance.
 */
export const ProgressCard = memo(function ProgressCard({ course, onPress, width }: { course: CourseCard; onPress: (c: CourseCard) => void; width: number }) {
  const c = useColors();
  const next = Math.min(course.completed_lessons + 1, course.lesson_count);
  return (
    <PressableScale onPress={() => onPress(course)} accessibilityLabel={courseA11y(course)} accessibilityHint="Opens the course" style={{ width }} className="gap-4 rounded-2xl bg-card p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
          <Icon name={LEVEL_ICON[course.level]} size={20} color={c.brand500} />
        </View>
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-2">
            <Text className="type-caption text-muted">{levelLabel(course.level)}</Text>
            <DemoBadge show={course.is_demo} />
          </View>
          <Text className="type-heading text-ink" numberOfLines={1}>
            {course.title}
          </Text>
        </View>
        <Text className="type-heading text-ink">{course.percent}%</Text>
      </View>
      <View className="gap-2">
        <ProgressBar value={course.percent} />
        <View className="flex-row items-center justify-between">
          <Text className="type-caption text-muted">
            {course.completed_lessons} of {course.lesson_count} lessons done
          </Text>
          <View className="flex-row items-center gap-1">
            <Text className="type-label font-semibold text-brand-700">Resume lesson {next}</Text>
            <Icon name="arrow-forward" size={14} color={c.brand700} />
          </View>
        </View>
      </View>
    </PressableScale>
  );
});

/**
 * Horizontal rail of courses; snaps card by card. A single course spans the full width instead of leaving a gap.
 * `variant="progress"` uses the compact in-progress card.
 */
export function CourseRail({ title, courses, onPress, variant = "browse" }: { title: string; courses: CourseCard[]; onPress: (c: CourseCard) => void; variant?: "browse" | "progress" }) {
  const { width: screen } = useWindowDimensions();
  if (!courses.length) return null;
  const single = courses.length === 1;
  const width = single ? screen - 32 : variant === "progress" ? Math.min(320, screen - 56) : RAIL_CARD_WIDTH;
  const render = (item: CourseCard) =>
    variant === "progress" ? <ProgressCard course={item} onPress={onPress} width={width} /> : <RailCard course={item} onPress={onPress} width={width} />;
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="px-4 type-heading text-ink">
        {title}
      </Text>
      {single ? (
        <View className="px-4">{render(courses[0])}</View>
      ) : (
        <FlatList
          horizontal
          data={courses}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => render(item)}
          showsHorizontalScrollIndicator={false}
          snapToInterval={width + RAIL_GAP}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: 16, gap: RAIL_GAP }}
        />
      )}
    </View>
  );
}

/** One course in the vertical "All courses" list or in search results. */
export const CourseRow = memo(function CourseRow({ course, onPress, showLevel = true }: { course: CourseCard; onPress: (c: CourseCard) => void; showLevel?: boolean }) {
  const c = useColors();
  const started = course.completed_lessons > 0;
  const done = course.percent >= 100;
  return (
    <PressableScale onPress={() => onPress(course)} accessibilityLabel={courseA11y(course)} accessibilityHint="Opens the course" className="mx-4 flex-row gap-4 rounded-2xl bg-card p-4">
      <View className={cn("h-12 w-12 items-center justify-center rounded-xl", done ? "bg-success-50" : "bg-muted-bg")}>
        <Icon name={done ? "checkmark-circle" : LEVEL_ICON[course.level]} size={22} color={done ? c.success : c.ink} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="type-body font-semibold text-ink">{course.title}</Text>
        <Text className="text-[13px] leading-[18px] text-muted">
          {[showLevel ? levelLabel(course.level) : null, `${course.lesson_count} lessons`, hours(course.estimated_hours)].filter(Boolean).join(" · ")}
        </Text>
        {started && !done ? (
          <View className="mt-1.5 flex-row items-center gap-3">
            <View className="flex-1">
              <ProgressBar value={course.percent} />
            </View>
            <Text className="text-[13px] font-semibold leading-[18px] text-ink">{course.percent}%</Text>
          </View>
        ) : null}
        {course.is_demo ? (
          <View className="mt-1">
            <DemoBadge show />
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
});

const FILTERS: { value: LevelFilter; label: string }[] = [{ value: "all", label: "All levels" }, ...LEVELS.map((l) => ({ value: l.value, label: l.label }))];

/** Level filter chips in a horizontal scroll. `own` marks the student's level. */
export function LevelChips({ value, onChange, own }: { value: LevelFilter; onChange: (v: LevelFilter) => void; own?: EducationLevel | null }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4" accessibilityRole="tablist" accessibilityLabel="Filter courses by level">
      {FILTERS.map((f) => {
        const selected = f.value === value;
        const mine = f.value === own;
        return (
          <Pressable
            key={f.value}
            onPress={() => onChange(f.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={mine ? `${f.label}, your level` : f.label}
            hitSlop={{ top: 4, bottom: 4 }}
            className={cn("h-9 flex-row items-center justify-center gap-1.5 rounded-full px-4", selected ? "bg-ink" : "bg-card active:bg-muted-bg")}
          >
            <Text className={cn("type-label", selected ? "text-surface" : "text-ink")}>{f.label}</Text>
            {mine ? <View className={cn("h-1.5 w-1.5 rounded-full", selected ? "bg-brand-500" : "bg-brand-500")} accessible={false} /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function CourseRowSkeleton() {
  return (
    <View className="mx-4 flex-row gap-4 rounded-2xl bg-card p-4">
      <Skeleton className="h-12 w-12 rounded-2xl" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-5 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-lg" />
      </View>
    </View>
  );
}

/** Matches the Learn tab while the catalogue loads: chips, one rail and a few rows. */
export function LearnSkeleton() {
  return (
    <View className="gap-6 pt-2" accessibilityLabel="Loading courses" accessible>
      <View className="flex-row gap-2 px-4">
        {[88, 72, 80, 96].map((w, i) => (
          <View key={i} style={{ width: w }}>
            <Skeleton className="h-9 rounded-full" />
          </View>
        ))}
      </View>
      <View className="gap-3">
        <View className="px-4">
          <Skeleton className="h-6 w-32 rounded-lg" />
        </View>
        <View className="flex-row gap-3 overflow-hidden px-4">
          {[0, 1].map((i) => (
            <View key={i} style={{ width: RAIL_CARD_WIDTH }} className="gap-3 rounded-2xl bg-card p-4">
              <Skeleton className="h-4 w-16 rounded-lg" />
              <Skeleton className="h-6 w-5/6 rounded-lg" />
              <Skeleton className="h-2 w-full rounded-full" />
            </View>
          ))}
        </View>
      </View>
      <View className="gap-3">
        <View className="px-4">
          <Skeleton className="h-6 w-28 rounded-lg" />
        </View>
        {[0, 1, 2].map((i) => (
          <CourseRowSkeleton key={i} />
        ))}
      </View>
    </View>
  );
}
