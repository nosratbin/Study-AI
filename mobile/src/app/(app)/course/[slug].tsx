/**
 * Course detail: a hero that hands its title to the header as you scroll, the lessons as a vertical path, and a sticky
 * Start / Continue / Review button in the thumb zone. Route param: `slug` (GET /courses/{slug}).
 */
import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import type { LessonSummary } from "@/lib/types";
import { Button, EmptyState, ErrorState } from "@/components/ui";
import { courseCta, currentLessonIndex, lessonState } from "@/components/learn/progress";
import { useCourse } from "@/components/learn/queries";
import { CourseDetailSkeleton, CourseHero, HeaderTitle, TimelineRow } from "@/components/learn/timeline";
import { useColors } from "@/theme/colors";
import { View } from "@/tw";

const BAR_HEIGHT = 80;

export default function CourseScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const course = useCourse(slug);
  const [refreshing, setRefreshing] = useState(false);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });

  const openLesson = useCallback((id: string) => router.push(`/lesson/${encodeURIComponent(id)}`), []);

  const refresh = async () => {
    setRefreshing(true);
    await course.refetch();
    setRefreshing(false);
  };

  const data = course.data;
  const title = data?.title ?? "";
  // `title` names the screen for the back button and screen readers; the visible title fades in on scroll.
  const header = (
    <Stack.Screen options={{ title: title || "Course", headerTitle: () => <HeaderTitle title={title} scrollY={scrollY} />, headerBackButtonDisplayMode: "minimal" }} />
  );

  if (!data) {
    return (
      <View className="flex-1 bg-surface">
        {header}
        {course.error ? (
          <View className="px-4 pt-4">
            <ErrorState
              error={course.error.status === 404 ? new Error("This course doesn't exist or isn't published yet.") : course.error}
              onRetry={course.error.status === 404 ? undefined : () => course.refetch()}
            />
          </View>
        ) : (
          <CourseDetailSkeleton />
        )}
      </View>
    );
  }

  const lessons = data.lessons;
  const current = currentLessonIndex(lessons);
  const cta = courseCta(data);

  return (
    <View className="flex-1 bg-surface">
      {header}
      <Animated.FlatList
        data={lessons}
        keyExtractor={(l: LessonSummary) => l.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={<CourseHero course={data} scrollY={scrollY} />}
        renderItem={({ item, index }: { item: LessonSummary; index: number }) => (
          <TimelineRow
            lesson={item}
            number={index + 1}
            state={lessonState(item, index, current)}
            prevDone={index > 0 && lessons[index - 1].status === "completed"}
            isFirst={index === 0}
            isLast={index === lessons.length - 1}
            onPress={openLesson}
          />
        )}
        ListEmptyComponent={
          <View className="px-4">
            <EmptyState icon="book-outline" title="No lessons yet" body="This course doesn't have any lessons published yet." />
          </View>
        }
        contentContainerStyle={{ paddingBottom: (cta ? BAR_HEIGHT : 16) + insets.bottom + 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.brand500} colors={[c.brand500]} />}
      />
      {cta ? (
        <View className="absolute inset-x-0 bottom-0 border-t border-line bg-surface px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
          <Button onPress={() => openLesson(cta.lessonId)} icon={current === -1 ? "refresh" : "play"} accessibilityLabel={cta.label}>
            {cta.label}
          </Button>
        </View>
      ) : null}
    </View>
  );
}
