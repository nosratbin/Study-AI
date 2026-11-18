/**
 * Learn tab: search at the top (suggestions on focus, live results as you type), level chips, then rails
 * "In progress" and "Recommended", then every course. Search filters the catalogue on the device.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, Keyboard, RefreshControl, type TextInputInstance } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import type { CourseCard } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/ui";
import { CourseRail, CourseRow, LearnSkeleton, LevelChips } from "@/components/learn/course-cards";
import { buildRails, isInProgress, searchCourses, topicSuggestions, type LevelFilter } from "@/components/learn/progress";
import { useCourses, useDashboard } from "@/components/learn/queries";
import { rememberSearch, useRecentSearches } from "@/components/learn/recent-searches";
import { SearchField, SearchSuggestions } from "@/components/learn/search";
import { useColors } from "@/theme/colors";
import { Text, View } from "@/tw";

const Separator = () => <View className="h-3" />;

export default function LearnScreen() {
  const c = useColors();
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const courses = useCourses();
  const dashboard = useDashboard(isStudent);
  const recents = useRecentSearches();

  const [level, setLevel] = useState<LevelFilter>("all");
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const inputRef = useRef<TextInputInstance>(null);

  const all = useMemo(() => courses.data ?? [], [courses.data]);
  const recommendedIds = useMemo(() => (dashboard.data?.recommended_courses ?? []).map((r) => r.id), [dashboard.data]);
  const rails = useMemo(() => buildRails(all, level, recommendedIds), [all, level, recommendedIds]);
  const q = query.trim();
  const searching = focused || q.length > 0;
  // Search respects the level chip, so "College" + "python" narrows as expected.
  const results = useMemo(() => searchCourses(rails.all, q), [rails.all, q]);
  const topics = useMemo(() => topicSuggestions(all), [all]);
  const jumpBackIn = useMemo(() => all.filter(isInProgress).slice(0, 3), [all]);

  const open = useCallback(
    (course: CourseCard) => {
      if (q) rememberSearch(q);
      router.push(`/course/${encodeURIComponent(course.slug)}`);
    },
    [q],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([courses.refetch(), isStudent ? dashboard.refetch() : null]);
    setRefreshing(false);
  }, [courses, dashboard, isStudent]);

  const searchFor = (term: string) => {
    setQuery(term);
    rememberSearch(term);
  };

  const cancel = () => {
    setQuery("");
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.brand500} colors={[c.brand500]} />;

  let body: React.ReactNode;
  if (courses.error && !courses.data) {
    body = (
      <View className="px-4 pt-2">
        <ErrorState error={courses.error} onRetry={() => courses.refetch()} />
      </View>
    );
  } else if (!courses.data) {
    body = <LearnSkeleton />;
  } else if (searching) {
    body = (
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CourseRow course={item} onPress={open} />}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
        refreshControl={refreshControl}
        ListHeaderComponent={
          q ? (
            <View className="gap-3 pb-3">
              <LevelChips value={level} onChange={setLevel} own={dashboard.data?.education_level} />
              <Text className="px-4 text-[13px] leading-[18px] text-muted" accessibilityLiveRegion="polite">
                {results.length === 1 ? "1 course" : `${results.length} courses`}
                {level !== "all" ? " at this level" : ""}
              </Text>
            </View>
          ) : (
            <SearchSuggestions recents={recents} topics={topics} jumpBackIn={jumpBackIn} onSearch={searchFor} onOpen={open} />
          )
        }
        ListEmptyComponent={
          q ? (
            <View className="gap-6">
              <View className="px-4">
                <EmptyState icon="search-outline" title={`No courses match “${q}”`} body="Try a shorter word, or one of these topics." />
              </View>
              <SearchSuggestions recents={[]} topics={topics} jumpBackIn={[]} onSearch={searchFor} onOpen={open} />
            </View>
          ) : undefined
        }
      />
    );
  } else {
    body = (
      <FlatList
        data={rails.all}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CourseRow course={item} onPress={open} showLevel={level === "all"} />}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
        refreshControl={refreshControl}
        ListHeaderComponent={
          <View className="gap-6 pb-3">
            <LevelChips value={level} onChange={setLevel} own={dashboard.data?.education_level} />
            <CourseRail title="In progress" courses={rails.inProgress} onPress={open} variant="progress" />
            <CourseRail title="Recommended for you" courses={rails.recommended} onPress={open} />
            {rails.all.length ? (
              <Text accessibilityRole="header" className="px-4 type-heading text-ink">
                {level === "all" ? "All courses" : "All courses at this level"}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View className="px-4">
            <EmptyState icon="book-outline" title="No courses at this level yet" body="Try another level, or check back soon." />
          </View>
        }
      />
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.surface }}>
      <View className="gap-4 pb-2 pt-4">
        {!searching ? (
          <Text accessibilityRole="header" className="px-4 type-display text-ink">
            Learn
          </Text>
        ) : null}
        <SearchField
          value={query}
          onChangeText={setQuery}
          focused={focused}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmit={() => rememberSearch(query)}
          onCancel={cancel}
          inputRef={inputRef}
        />
      </View>
      <View className="flex-1">{body}</View>
    </SafeAreaView>
  );
}
