import { Stack } from "expo-router";
import { useColors } from "@/theme/colors";

/**
 * Signed-out stack. When the root guard turns a signed-out user away from "/" (the Home tab), Expo Router redirects to
 * this group's own URL, "/(auth)", which only resolves to a screen through `index`. So Welcome is `index.tsx`, and the
 * anchor keeps it under any deep-linked screen (e.g. /login), so Android back from Login returns to Welcome.
 * See src/components/auth/__tests__/auth-routing.test.tsx.
 */
export const unstable_settings = { anchor: "index" };

export default function AuthLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        title: "",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.ink,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: c.surface },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
