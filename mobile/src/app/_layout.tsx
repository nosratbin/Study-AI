import "../global.css";

import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/query";
import { restoreThemePreference } from "@/components/profile/theme";

SplashScreen.preventAutoHideAsync();
// Apply the saved System/Light/Dark choice before the first frame.
restoreThemePreference();

/**
 * Route guards: signed-out users only see (auth); students who haven't onboarded only see (setup);
 * everyone else sees (app). Roles are enforced by the backend, never here.
 */
function RootNavigator() {
  const { user, loading } = useAuth();
  const scheme = useColorScheme();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  const needsOnboarding = !!user && user.role === "student" && !user.onboarding_completed;
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={needsOnboarding}>
          <Stack.Screen name="(setup)" />
        </Stack.Protected>
        <Stack.Protected guard={!!user && !needsOnboarding}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
