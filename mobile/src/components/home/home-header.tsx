import { NotificationBell } from "@/components/notifications/notification-bell";
import { Text, View } from "@/tw";
import { dhakaHour, greetingFor } from "./today";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Dhaka" });

/** Greeting row with today's date and the notification bell. */
export function HomeHeader({ name }: { name: string | null }) {
  const now = new Date();
  const greeting = greetingFor(dhakaHour(now)); // Bangladesh time, like the date above it
  return (
    <View className="flex-row items-center gap-3 px-4 pt-3">
      <View className="flex-1 gap-0.5">
        <Text className="type-label text-muted">{DATE_FMT.format(now)}</Text>
        <Text className="type-title text-ink" accessibilityRole="header" numberOfLines={2}>
          {name ? `${greeting}, ${name}` : greeting}
        </Text>
      </View>
      <NotificationBell />
    </View>
  );
}
