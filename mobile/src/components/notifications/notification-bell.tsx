import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { go } from "@/components/home/navigation";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/motion";
import { useColors } from "@/theme/colors";
import { Text, View } from "@/tw";
import { useUnreadCount } from "./use-notifications";

/** Bell with an unread badge; opens the notifications screen. The count shares its cache with that screen. */
export function NotificationBell() {
  const c = useColors();
  const { data, refetch } = useUnreadCount();
  const unread = data?.unread ?? 0;

  // Tabs stay mounted, so check for new notifications whenever Home regains focus (skip the first focus: the query just mounted).
  const seen = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (seen.current) refetch();
      seen.current = true;
    }, [refetch]),
  );

  const label = unread ? `Notifications, ${unread} unread` : "Notifications";
  return (
    <PressableScale
      onPress={() => go("/notifications")}
      accessibilityLabel={label}
      hitSlop={4}
      className="h-11 w-11 items-center justify-center rounded-full bg-card"
    >
      <Ionicons name="notifications-outline" size={22} color={c.ink} />
      {unread ? (
        <View
          className="absolute items-center justify-center rounded-full bg-brand-solid"
          style={{ top: 4, right: 2, minWidth: 18, height: 18, paddingHorizontal: 4, borderWidth: 2, borderColor: c.card }}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <Text className="text-[10px] font-bold leading-[12px] text-white" allowFontScaling={false}>
            {unread > 9 ? "9+" : unread}
          </Text>
        </View>
      ) : null}
    </PressableScale>
  );
}
