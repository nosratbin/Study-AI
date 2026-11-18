import { useCallback, useMemo, useState } from "react";
import { RefreshControl, SectionList } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyState, ErrorState } from "@/components/ui";
import * as Haptics from "expo-haptics";
import { Skeleton } from "@/components/motion";
import { go } from "@/components/home/navigation";
import { groupByDay, routeForLink, type NotificationSection } from "@/components/notifications/group";
import { NotificationRow, NotificationRowSkeleton } from "@/components/notifications/notification-row";
import { NOTIFICATIONS_KEY, useMarkAllRead, useMarkRead, useNotificationList } from "@/components/notifications/use-notifications";
import type { AppNotification } from "@/lib/types";
import { useColors } from "@/theme/colors";
import { Pressable, Text, View } from "@/tw";

export default function NotificationsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const list = useNotificationList();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const sections = useMemo<NotificationSection[]>(() => groupByDay(list.data?.items ?? []), [list.data]);
  const unread = list.data?.unread ?? 0;

  const { mutate: markOne } = markRead;
  const onMarkRead = useCallback((n: AppNotification) => !n.read_at && markOne(n), [markOne]);
  const onOpen = useCallback(
    (n: AppNotification) => {
      if (!n.read_at) markOne(n);
      const route = routeForLink(n.link);
      if (route) go(route); // tabs use navigate, details push; double taps are dropped
    },
    [markOne],
  );

  // Own flag so background refetches (after a mutation) don't show the pull-to-refresh spinner.
  const [pulling, setPulling] = useState(false);
  const refresh = useCallback(async () => {
    setPulling(true);
    await qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }).finally(() => setPulling(false));
  }, [qc]);

  const header = (
    <Stack.Screen
      options={{
        title: "Notifications",
        headerRight: () =>
          unread > 0 ? (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => undefined);
                markAll.mutate();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Mark all ${unread} as read`}
              hitSlop={8}
              className="min-h-12 justify-center px-2 active:opacity-60"
            >
              <Text className="text-[15px] font-semibold text-brand-700">Mark all read</Text>
            </Pressable>
          ) : null,
      }}
    />
  );

  if (list.isPending) {
    return (
      <View className="flex-1 bg-surface" accessibilityLabel="Loading notifications">
        {header}
        <View className="px-4 pb-2 pt-4">
          <Skeleton className="h-[18px] w-16 rounded-md" />
        </View>
        {[0, 1, 2, 3, 4].map((i) => (
          <NotificationRowSkeleton key={i} />
        ))}
      </View>
    );
  }

  if (list.isError && !list.data) {
    return (
      <View className="flex-1 bg-surface p-4">
        {header}
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      {header}
      <SectionList
        sections={sections}
        keyExtractor={(n) => n.id}
        stickySectionHeadersEnabled={false}
        renderItem={({ item }) => <NotificationRow item={item} hasLink={!!routeForLink(item.link)} onOpen={onOpen} onMarkRead={onMarkRead} />}
        renderSectionHeader={({ section }) => (
          <Text className="px-4 pb-2 pt-6 text-[13px] font-semibold leading-[18px] text-muted" accessibilityRole="header">
            {section.title}
          </Text>
        )}
        ListHeaderComponent={
          list.isError ? (
            <View className="mx-4 mt-3 rounded-2xl bg-danger-50 px-4 py-3" accessibilityRole="alert">
              <Text className="text-[13px] leading-[18px] text-danger">Couldn&apos;t refresh. Showing saved notifications. Pull down to try again.</Text>
            </View>
          ) : unread > 0 ? (
            <Text className="px-4 pt-3 text-[13px] leading-[18px] text-muted">Swipe right or tap to mark one as read.</Text>
          ) : undefined
        }
        ListEmptyComponent={
          <View className="px-4 pt-6">
            <EmptyState
              icon="notifications-off-outline"
              title="You're all caught up"
              body="You'll hear here when a teacher reviews your project, you earn a certificate or a saved deadline is close."
            />
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={refresh} tintColor={c.brand500} colors={[c.brand500]} />}
      />
    </View>
  );
}
