import { useMemo } from "react";
import { Stack } from "expo-router";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";
import { OfflineBanner, useIsOffline } from "@/components/motion";
import { View } from "@/tw";
import { useColors } from "@/theme/colors";

/** Tabs plus pushed detail screens (course, lesson, opportunity, notifications). Detail screens set their own title. */
export default function AppLayout() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const offline = useIsOffline();
  // While the offline bar is shown it covers the status bar, so screens and headers below it get no top inset.
  const innerInsets = useMemo(() => (offline ? { ...insets, top: 0 } : insets), [offline, insets]);

  return (
    <View className="flex-1 bg-surface">
      {offline ? <OfflineBanner topInset={insets.top} /> : null}
      <SafeAreaInsetsContext.Provider value={innerInsets}>
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: { backgroundColor: c.surface },
            headerTintColor: c.ink,
            headerTitleStyle: { fontFamily: "Figtree", fontWeight: "600", fontSize: 17 },
            contentStyle: { backgroundColor: c.surface },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="practice-quiz" options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }} />
        </Stack>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}
