/**
 * Lesson reader pieces: the thin reading-progress bar under the header, the lesson's opening meta, the in-content
 * previous/next links (the non-gesture way to move between lessons) and the layout-matching skeleton.
 */
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import * as WebBrowser from "expo-web-browser";
import { cn } from "@/lib/cn";
import { levelLabel, type Lesson } from "@/lib/types";
import { Badge, DemoBadge, Icon } from "@/components/ui";
import { PressableScale, Skeleton } from "@/components/motion";
import { useColors } from "@/theme/colors";
import { Pressable, Text, View } from "@/tw";
import { isColabUrl } from "./progress";

/** Scroll position through the lesson, 0–1, drawn as a 3dp bar. The fill is absolute and childless, so animating width is cheap. */
export function ReadingProgress({ progress }: { progress: SharedValue<number> }) {
  const fill = useAnimatedStyle(() => ({ width: `${Math.round(progress.get() * 1000) / 10}%` }));
  return (
    <View className="h-[3px] w-full bg-brand-100" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Animated.View style={[{ position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "#F97316", borderRadius: 2 }, fill]} />
    </View>
  );
}

export function LessonMeta({ lesson }: { lesson: Lesson }) {
  const done = lesson.status === "completed";
  return (
    <View className="gap-3">
      <Text className="text-[13px] leading-[18px] text-muted">
        {lesson.course_title} · {levelLabel(lesson.course_level)} · {lesson.duration_min} min read
      </Text>
      <Text accessibilityRole="header" className="type-display text-ink">
        {lesson.title}
      </Text>
      {done || lesson.is_demo ? (
        <View className="flex-row gap-2">
          {done ? <Badge tone="success">Completed</Badge> : null}
          <DemoBadge show={lesson.is_demo} />
        </View>
      ) : null}
    </View>
  );
}

export function ColabLink({ url }: { url: string }) {
  const c = useColors();
  if (!isColabUrl(url)) return null;
  return (
    <PressableScale
      onPress={() => WebBrowser.openBrowserAsync(url).catch(() => undefined)}
      accessibilityRole="link"
      accessibilityLabel="Practise in Google Colab"
      accessibilityHint="Opens the notebook in the browser"
      className="flex-row items-center gap-4 rounded-2xl bg-card p-4"
    >
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-muted-bg">
        <Icon name="code-slash" size={22} color={c.ink} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-[15px] font-semibold leading-[22px] text-ink">Practise in Google Colab</Text>
        <Text className="text-[13px] leading-[18px] text-muted">Run the code from this lesson yourself.</Text>
      </View>
      <Icon name="open-outline" size={18} color={c.muted} />
    </PressableScale>
  );
}

function NavLink({ label, sub, icon, align, onPress }: { label: string; sub: string; icon: "arrow-back" | "arrow-forward"; align: "left" | "right"; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${sub}`}
      className={cn("min-h-12 flex-1 flex-row items-center gap-2 rounded-2xl px-3 py-2 active:bg-muted-bg", align === "right" && "justify-end")}
    >
      {align === "left" ? <Icon name={icon} size={18} color={c.muted} /> : null}
      <View className={cn("shrink", align === "right" && "items-end")}>
        <Text className="text-[13px] leading-[18px] text-muted">{label}</Text>
        <Text className="text-[15px] font-semibold leading-[22px] text-ink">{sub}</Text>
      </View>
      {align === "right" ? <Icon name={icon} size={18} color={c.muted} /> : null}
    </Pressable>
  );
}

/** Previous/next at the end of the text: the button alternative to swiping. */
export function LessonPager({ lesson, onPrev, onNext }: { lesson: Lesson; onPrev: () => void; onNext: () => void }) {
  if (!lesson.prev_lesson_id && !lesson.next_lesson_id) return null;
  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        {lesson.prev_lesson_id ? <NavLink label="Previous" sub={`Lesson ${lesson.lesson_number - 1}`} icon="arrow-back" align="left" onPress={onPrev} /> : <View className="flex-1" />}
        {lesson.next_lesson_id ? <NavLink label="Next" sub={`Lesson ${lesson.lesson_number + 1}`} icon="arrow-forward" align="right" onPress={onNext} /> : <View className="flex-1" />}
      </View>
      <Text className="text-center text-[13px] leading-[18px] text-muted">Tip: swipe left or right to change lessons.</Text>
    </View>
  );
}

export function LessonSkeleton() {
  return (
    <View className="gap-4 px-5 pt-6" accessible accessibilityLabel="Loading lesson">
      <Skeleton className="h-4 w-48 rounded-lg" />
      <Skeleton className="h-8 w-4/5 rounded-lg" />
      <View className="gap-3 pt-4">
        {["w-full", "w-full", "w-11/12", "w-full", "w-3/4", "w-full", "w-5/6"].map((w, i) => (
          <Skeleton key={i} className={cn("h-4 rounded-lg", w)} />
        ))}
      </View>
      <Skeleton className="mt-2 h-28 w-full rounded-2xl" />
    </View>
  );
}
