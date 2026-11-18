import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyState, ErrorState, Screen } from "@/components/ui";
import { celebrate, Skeleton } from "@/components/motion";
import { AllDone } from "@/components/home/all-done";
import { ContinueCard, ContinueCardSkeleton, StartLearningCard } from "@/components/home/continue-card";
import { DeadlinesCard } from "@/components/home/deadlines-card";
import { ForYouRail, ForYouRailSkeleton } from "@/components/home/for-you-rail";
import { HomeHeader } from "@/components/home/home-header";
import { StreakStrip } from "@/components/home/streak-strip";
import { TaskRow, TaskRowSkeleton } from "@/components/home/task-row";
import { NoTasksToday } from "@/components/home/task-suggestions";
import { allDone, dhakaDate } from "@/components/home/today";
import { PLANNER_KEY, usePlannerSummary, useTodayTasks, useToggleTask } from "@/components/home/use-today-tasks";
import { UNREAD_KEY } from "@/components/notifications/use-notifications";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth";
import { useApiQuery } from "@/lib/query";
import type { Dashboard, StudyTask } from "@/lib/types";
import { useColors } from "@/theme/colors";
import { Text, View } from "@/tw";

/**
 * Home: a "Today" screen, not a dashboard. Greeting + bell, the Continue-learning hero, the streak strip, today's
 * planner tasks as a checklist, a "For you" rail and a quiet deadlines card. One FlatList owns the scroll (the tasks
 * are its rows) so pull-to-refresh covers everything. MindCare data is never read here.
 */
export default function HomeScreen() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const c = useColors();
  const qc = useQueryClient();
  // Recomputed on each render, so a refresh after midnight (Bangladesh time) asks for the new day.
  const day = dhakaDate();

  const dashboard = useApiQuery<Dashboard>(["dashboard"], isStudent ? "/students/dashboard" : null);
  const tasks = useTodayTasks(day, isStudent);
  const summary = usePlannerSummary(isStudent);

  const [justFinished, setJustFinished] = useState(false);
  // A failed toggle rolls back that row and shows one short line under the list for a few seconds.
  const [failedTask, setFailedTask] = useState<string | null>(null);
  useEffect(() => {
    if (!failedTask) return;
    const t = setTimeout(() => setFailedTask(null), 5000);
    return () => clearTimeout(t);
  }, [failedTask]);
  const toggle = useToggleTask(day, {
    onAllDone: () => {
      celebrate();
      setJustFinished(true);
    },
    onFailed: (task) => setFailedTask(task.title),
  });
  const { mutate: toggleMutate } = toggle;
  const onToggle = useCallback(
    (t: StudyTask) => {
      setJustFinished(false);
      setFailedTask(null);
      toggleMutate({ task: t, status: t.status === "done" ? "todo" : "done" });
    },
    [toggleMutate],
  );

  const [pulling, setPulling] = useState(false);
  const refresh = useCallback(async () => {
    setPulling(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["dashboard"] }),
      qc.invalidateQueries({ queryKey: PLANNER_KEY }),
      qc.invalidateQueries({ queryKey: UNREAD_KEY }),
    ]).finally(() => setPulling(false));
  }, [qc]);

  const d = dashboard.data;
  const continueCourse = useMemo(
    () => (d?.continue_learning ? d.recommended_courses.find((x) => x.id === d.continue_learning!.course_id) : undefined),
    [d],
  );
  const taskList = tasks.data ?? [];
  const doneCount = taskList.filter((t) => t.status === "done").length;
  const everythingDone = allDone(taskList);

  if (!isStudent) {
    return (
      <Screen>
        <HomeHeader name={user?.full_name.split(" ")[0] ?? null} />
        <View className="px-4">
          <EmptyState icon="desktop-outline" title="Made for students" body="The teacher and admin tools are on the IccheGhuri website." />
        </View>
      </Screen>
    );
  }

  const header = (
    <View className="gap-4 pb-3">
      <HomeHeader name={d?.greeting_name ?? user?.full_name.split(" ")[0] ?? null} />

      <View className="gap-4 px-4">
        {dashboard.isPending ? (
          <ContinueCardSkeleton />
        ) : !d ? (
          <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />
        ) : d.continue_learning ? (
          <ContinueCard next={d.continue_learning} course={continueCourse} />
        ) : (
          <StartLearningCard />
        )}
        {d && dashboard.isError ? (
          <Text className="text-[13px] leading-[18px] text-muted" accessibilityRole="alert">
            Couldn&apos;t refresh. Showing what was saved. Pull down to try again.
          </Text>
        ) : null}

        {summary.data ? <StreakStrip summary={summary.data} /> : null}

        <View className="flex-row items-end justify-between pt-2">
          <Text className="type-heading text-ink" accessibilityRole="header">
            Today
          </Text>
          {taskList.length ? (
            <Text className="text-[13px] leading-[18px] text-muted">
              {doneCount} of {taskList.length} done
            </Text>
          ) : null}
        </View>
        {everythingDone ? <AllDone animate={justFinished} /> : null}
      </View>
    </View>
  );

  const footer = (
    <View className="gap-6 pt-6">
      {failedTask ? (
        <Text className="-mt-3 px-4 text-[13px] leading-[18px] text-danger" accessibilityRole="alert" accessibilityLiveRegion="polite">
          Couldn&apos;t update &quot;{failedTask}&quot;. Check your connection and try again.
        </Text>
      ) : null}
      {dashboard.isPending ? <ForYouRailSkeleton /> : d ? <ForYouRail courses={d.recommended_courses} /> : null}
      {d ? <DeadlinesCard deadlines={d.upcoming_deadlines} /> : dashboard.isPending ? <Skeleton className="mx-4 h-14 rounded-2xl" /> : null}
    </View>
  );

  const empty = tasks.isPending ? (
    <View className="mx-4 overflow-hidden rounded-2xl">
      <TaskRowSkeleton />
      <TaskRowSkeleton />
    </View>
  ) : tasks.isError && !tasks.data ? (
    <View className="px-4">
      <ErrorState error={tasks.error} onRetry={() => tasks.refetch()} />
    </View>
  ) : (
    <View className="px-4">
      <NoTasksToday day={day} enabled={isStudent} />
    </View>
  );

  return (
    <Screen scroll={false}>
      <FlatList
        data={taskList}
        keyExtractor={(t) => t.id}
        renderItem={({ item, index }) => (
          <View className={cn("mx-4 overflow-hidden", index === 0 && "rounded-t-2xl", index === taskList.length - 1 && "rounded-b-2xl")}>
            <TaskRow task={item} onToggle={onToggle} />
          </View>
        )}
        ItemSeparatorComponent={TaskSeparator}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={refresh} tintColor={c.brand500} colors={[c.brand500]} />}
      />
    </Screen>
  );
}

function TaskSeparator() {
  return (
    <View className="mx-4 bg-card">
      <View className="ml-14 h-px bg-line" />
    </View>
  );
}
