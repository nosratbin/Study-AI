import { StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/theme/colors";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const TABS: { name: string; title: string; icon: IconName; active: IconName }[] = [
  { name: "index", title: "Home", icon: "home-outline", active: "home" },
  { name: "learn", title: "Learn", icon: "book-outline", active: "book" },
  { name: "tutor", title: "AI Tutor", icon: "chatbubbles-outline", active: "chatbubbles" },
  { name: "opportunities", title: "Opportunities", icon: "trophy-outline", active: "trophy" },
  { name: "profile", title: "Profile", icon: "person-circle-outline", active: "person-circle" },
];

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: c.brand700,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line, borderTopWidth: StyleSheet.hairlineWidth, elevation: 0 },
        tabBarLabelStyle: { fontFamily: "Figtree", fontSize: 11, fontWeight: "600", marginTop: 2 },
        tabBarItemStyle: { paddingTop: 4 },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? t.active : t.icon} color={color as string} size={size - 2} />,
          }}
        />
      ))}
    </Tabs>
  );
}
