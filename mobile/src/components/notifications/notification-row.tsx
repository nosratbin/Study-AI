import { memo, useRef } from "react";
import ReanimatedSwipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Skeleton } from "@/components/motion";
import { cn } from "@/lib/cn";
import { timeAgo, type AppNotification, type NotificationKind } from "@/lib/types";
import { useColors } from "@/theme/colors";
import { Pressable, Text, View } from "@/tw";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const KIND_ICON: Record<NotificationKind, IconName> = {
  info: "information-circle-outline",
  project: "construct-outline",
  achievement: "ribbon-outline",
  certificate: "school-outline",
  deadline: "alarm-outline",
  announcement: "megaphone-outline",
  career: "compass-outline",
};

const ACTION_WIDTH = 96;

/** Revealed under the row while swiping right. The icon fades and grows in as the row uncovers it. */
function MarkReadAction({ translation }: { translation: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const t = interpolate(translation.get(), [0, ACTION_WIDTH], [0, 1], Extrapolation.CLAMP);
    return { opacity: t, transform: [{ scale: 0.8 + 0.2 * t }] };
  });
  return (
    <View className="w-24 items-center justify-center bg-success-solid">
      <Animated.View style={[{ alignItems: "center", gap: 2 }, style]}>
        <Ionicons name="checkmark-done" size={22} color="#fff" />
        <Text className="text-[13px] font-semibold leading-[18px] text-white">Read</Text>
      </Animated.View>
    </View>
  );
}

export const NotificationRow = memo(function NotificationRow({
  item,
  hasLink,
  onOpen,
  onMarkRead,
}: {
  item: AppNotification;
  hasLink: boolean;
  onOpen: (n: AppNotification) => void;
  onMarkRead: (n: AppNotification) => void;
}) {
  const c = useColors();
  const swipe = useRef<SwipeableMethods>(null);
  const unread = !item.read_at;

  const a11yLabel = `${unread ? "Unread. " : ""}${item.title}. ${item.body ? `${item.body}. ` : ""}${timeAgo(item.created_at)}`;

  return (
    <ReanimatedSwipeable
      ref={swipe}
      enabled={unread}
      friction={1.5}
      leftThreshold={ACTION_WIDTH * 0.6}
      overshootLeft={false}
      renderLeftActions={(_p, translation) => <MarkReadAction translation={translation} />}
      onSwipeableWillOpen={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onMarkRead(item);
      }}
      onSwipeableOpen={() => swipe.current?.close()}
    >
      <Pressable
        onPress={() => onOpen(item)}
        accessibilityRole={hasLink ? "link" : "button"}
        accessibilityLabel={a11yLabel}
        accessibilityHint={hasLink ? "Opens the related screen" : unread ? "Marks as read" : undefined}
        accessibilityActions={unread ? [{ name: "markRead", label: "Mark as read" }] : undefined}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === "markRead" && onMarkRead(item)}
        className={cn("min-h-12 flex-row items-start gap-3 px-4 py-3.5 active:opacity-70", unread ? "bg-brand-50" : "bg-surface")}
      >
        <View className={cn("h-10 w-10 items-center justify-center rounded-full", unread ? "bg-brand-100" : "bg-muted-bg")}>
          <Ionicons name={KIND_ICON[item.kind] ?? KIND_ICON.info} size={20} color={unread ? c.brand600 : c.muted} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className={cn("text-[15px] leading-[22px] text-ink", unread && "font-semibold")}>{item.title}</Text>
          {item.body ? (
            <Text className="text-[13px] leading-[18px] text-muted" numberOfLines={3}>
              {item.body}
            </Text>
          ) : null}
          <Text className="mt-0.5 text-[13px] leading-[18px] text-muted">{timeAgo(item.created_at)}</Text>
        </View>
        <View className="w-3 items-center pt-2">
          {unread ? <View className="h-2.5 w-2.5 rounded-full bg-brand-500" /> : hasLink ? <Ionicons name="chevron-forward" size={16} color={c.muted} /> : null}
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
});

/** Placeholder rows matching NotificationRow's layout. */
export function NotificationRowSkeleton() {
  return (
    <View className="flex-row items-start gap-3 px-4 py-3.5">
      <Skeleton className="h-10 w-10 rounded-full" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-3.5 w-full rounded-md" />
        <Skeleton className="h-3 w-20 rounded-md" />
      </View>
    </View>
  );
}
