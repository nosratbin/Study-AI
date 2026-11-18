/**
 * Lesson reader. Distraction-free: a reading-progress bar under the header, 16/26 body text, and a sticky bottom bar
 * with "Ask tutor" and "Mark complete". Completing is a short celebration, then "Next lesson".
 * Moving between lessons (swipe, Previous/Next, Next lesson) swaps the `id` param in place, so Back still returns to
 * wherever the reader was opened from. Route param: `id` (GET /lessons/{id}).
 */
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import Animated, { Easing, FadeIn, FadeInLeft, FadeInRight, ReduceMotion, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth";
import { Button, ErrorState, FormError } from "@/components/ui";
import { celebrate } from "@/components/motion";
import { CompletionPanel } from "@/components/learn/completion";
import { Markdown, PageSwipeContext } from "@/components/learn/markdown-view";
import { clampPercent, completionCopy, swipeDirection, type ProgressOut } from "@/components/learn/progress";
import { prefetchLesson, useLesson, useLessonProgress } from "@/components/learn/queries";
import { ColabLink, LessonMeta, LessonPager, LessonSkeleton, ReadingProgress } from "@/components/learn/reader";
import { View } from "@/tw";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const ENTER_NEXT = FadeInRight.duration(220).easing(EASE_OUT).reduceMotion(ReduceMotion.System);
const ENTER_PREV = FadeInLeft.duration(220).easing(EASE_OUT).reduceMotion(ReduceMotion.System);
const ENTER_FIRST = FadeIn.duration(180).reduceMotion(ReduceMotion.System);
const SETTLE = { duration: 300, dampingRatio: 1, reduceMotion: ReduceMotion.System };
const BAR_HEIGHT = 80;

export default function LessonScreen() {
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = useLesson(id);
  const { mutate: markOpened } = useLessonProgress();
  const complete = useLessonProgress();

  const [celebration, setCelebration] = useState<{ lessonId: string; result: ProgressOut } | null>(null);
  const [direction, setDirection] = useState<-1 | 0 | 1>(0);
  const opened = useRef(new Set<string>());

  const data = lesson.data && lesson.data.id === id ? lesson.data : undefined;
  const nextId = data?.next_lesson_id ?? null;
  const prevId = data?.prev_lesson_id ?? null;

  // Opening a lesson marks it in progress (best-effort; the backend never downgrades a completed lesson).
  useEffect(() => {
    if (!data || !isStudent || data.status !== "not_started" || opened.current.has(data.id)) return;
    opened.current.add(data.id);
    markOpened({ lessonId: data.id, status: "in_progress" });
  }, [data, isStudent, markOpened]);

  // Neighbours load in the background so swiping feels instant.
  useEffect(() => {
    prefetchLesson(client, nextId);
    prefetchLesson(client, prevId);
  }, [client, nextId, prevId]);

  const readProgress = useSharedValue(0);
  useEffect(() => {
    readProgress.set(0);
  }, [id, readProgress]);
  const onScroll = useAnimatedScrollHandler((e) => {
    const max = e.contentSize.height - e.layoutMeasurement.height;
    readProgress.set(max > 0 ? Math.min(1, Math.max(0, e.contentOffset.y / max)) : 1);
  });

  const go = (target: string | null, dir: -1 | 1) => {
    if (!target) return;
    setDirection(dir);
    setCelebration(null);
    complete.reset();
    router.setParams({ id: target });
  };

  const onSwipe = (dir: -1 | 0 | 1) => {
    if (dir === 0) return;
    Haptics.selectionAsync().catch(() => undefined);
    go(dir === 1 ? nextId : prevId, dir);
  };

  // Horizontal swipe between lessons. Vertical movement fails the pan first, so reading scroll is untouched, and code
  // blocks and tables block it (PageSwipeContext), so sideways scrolling inside them never changes the lesson.
  const shift = useSharedValue(0);
  const hasNext = !!nextId;
  const hasPrev = !!prevId;
  const pan = usePanGesture({
    activeOffsetX: [-24, 24],
    failOffsetY: [-14, 14],
    onUpdate: (e) => {
      "worklet";
      const blocked = (e.translationX < 0 && !hasNext) || (e.translationX > 0 && !hasPrev);
      shift.set(e.translationX * (blocked ? 0.08 : 0.3));
    },
    onDeactivate: (e) => {
      "worklet";
      const raw = swipeDirection(e.translationX, e.velocityX);
      const dir = (raw === 1 && !hasNext) || (raw === -1 && !hasPrev) ? 0 : raw;
      shift.set(withSpring(0, SETTLE));
      if (dir !== 0) scheduleOnRN(onSwipe, dir);
    },
  });
  const shiftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shift.get() }] }));

  const finish = () => {
    if (!data) return;
    const lessonId = data.id;
    complete.mutate(
      { lessonId, status: "completed" },
      {
        onSuccess: (result) => {
          celebrate();
          setCelebration({ lessonId, result });
          const copy = completionCopy(result, data.lesson_number, data.lesson_count, data.course_title);
          AccessibilityInfo.announceForAccessibility(`${copy.title} ${copy.body}`);
        },
      },
    );
  };

  const toCourse = () => {
    if (!data) return;
    router.dismissTo(`/course/${encodeURIComponent(data.course_slug)}`);
  };

  const askTutor = () => {
    if (!data) return;
    // navigate (not push): switch to the existing Tutor tab instead of stacking a second tab navigator.
    router.navigate({ pathname: "/tutor", params: { lessonId: data.id, lessonTitle: data.title } });
  };

  const title = data ? `Lesson ${data.lesson_number} of ${data.lesson_count}` : "";
  const header = <Stack.Screen options={{ title, headerBackButtonDisplayMode: "minimal" }} />;

  if (!data) {
    return (
      <View className="flex-1 bg-surface">
        {header}
        {lesson.error ? (
          <View className="px-4 pt-4">
            <ErrorState
              error={lesson.error.status === 404 ? new Error("This lesson doesn't exist or isn't published yet.") : lesson.error}
              onRetry={lesson.error.status === 404 ? undefined : () => lesson.refetch()}
            />
          </View>
        ) : (
          <LessonSkeleton />
        )}
      </View>
    );
  }

  const done = data.status === "completed";
  const shown = celebration && celebration.lessonId === data.id ? celebration : null;
  const copy = shown ? completionCopy(shown.result, data.lesson_number, data.lesson_count, data.course_title) : null;

  return (
    <View className="flex-1 bg-surface">
      {header}
      <ReadingProgress progress={readProgress} />
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ flex: 1 }, shiftStyle]}>
          <Animated.ScrollView
            key={data.id}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: BAR_HEIGHT + insets.bottom + 32 }}
          >
            <Animated.View entering={direction === 1 ? ENTER_NEXT : direction === -1 ? ENTER_PREV : ENTER_FIRST} style={{ gap: 24, maxWidth: 680, width: "100%", alignSelf: "center" }}>
              <LessonMeta lesson={data} />
              <PageSwipeContext value={pan}>
                <Markdown source={data.content_md} title={data.title} />
              </PageSwipeContext>
              {data.colab_url ? <ColabLink url={data.colab_url} /> : null}
              <LessonPager lesson={data} onPrev={() => go(prevId, -1)} onNext={() => go(nextId, 1)} />
            </Animated.View>
          </Animated.ScrollView>
        </Animated.View>
      </GestureDetector>

      {shown && copy ? (
        <CompletionPanel
          copy={copy}
          certificateCode={shown.result.certificate_code}
          percent={clampPercent(shown.result.course_percent)}
          bottomInset={insets.bottom}
          onDismiss={() => setCelebration(null)}
          onAction={() => (copy.action === "next" ? go(shown.result.next_lesson_id, 1) : toCourse())}
        />
      ) : (
        <View className="absolute inset-x-0 bottom-0 gap-2 border-t border-line bg-surface px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
          {complete.error ? <FormError message={`Couldn't save your progress. ${complete.error.message}`} /> : null}
          <View className="flex-row gap-3">
            <Button variant="secondary" icon="chatbubbles-outline" onPress={askTutor} className="flex-1" accessibilityLabel="Ask the AI tutor about this lesson">
              Ask tutor
            </Button>
            {isStudent && !done ? (
              <Button icon="checkmark-circle" onPress={finish} loading={complete.isPending} className="flex-[1.4]" accessibilityLabel="Mark this lesson complete">
                Mark complete
              </Button>
            ) : nextId ? (
              <Button icon="arrow-forward" onPress={() => go(nextId, 1)} className="flex-[1.4]">
                Next lesson
              </Button>
            ) : (
              <Button variant="secondary" icon="list" onPress={toCourse} className="flex-[1.4]">
                Back to course
              </Button>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
