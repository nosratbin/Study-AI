/**
 * "Continue with Google" plus an "or" divider. Renders nothing until Google sign-in is configured for this build
 * (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID + EXPO_PUBLIC_FIREBASE_API_KEY), so a build without it never shows a dead button.
 * On success the root guard moves the student on (Google accounts count as verified; new ones go to onboarding).
 */
import { useState } from "react";
import { ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth";
import { toApiError } from "@/lib/api";
import { GoogleCancelled, googleSignInConfigured } from "@/lib/google";
import { FormError } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useColors } from "@/theme/colors";
import { Pressable, Text, View } from "@/tw";

export function GoogleButton({ divider = "after", disabled }: { divider?: "before" | "after" | "none"; disabled?: boolean }) {
  const { loginWithGoogle } = useAuth();
  const c = useColors();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!googleSignInConfigured) return null;

  async function go() {
    if (busy || disabled) return;
    Haptics.selectionAsync().catch(() => undefined);
    setError(null);
    setBusy(true);
    try {
      await loginWithGoogle();
    } catch (e) {
      setBusy(false);
      if (e instanceof GoogleCancelled) return;
      setError(toApiError(e).message);
    }
  }

  const or = (
    <View className="flex-row items-center gap-3" accessible={false} importantForAccessibility="no-hide-descendants">
      <View className="h-px flex-1 bg-line" />
      <Text className="type-caption text-muted">or</Text>
      <View className="h-px flex-1 bg-line" />
    </View>
  );

  return (
    <View className="gap-4">
      {divider === "before" ? or : null}
      <Pressable
        onPress={go}
        disabled={busy || disabled}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityState={{ busy, disabled: !!disabled }}
        className={cn("min-h-12 flex-row items-center justify-center gap-3 rounded-full border border-input bg-card px-5 active:bg-muted-bg", disabled && "opacity-50")}
      >
        {busy ? <ActivityIndicator color={c.ink} /> : <Ionicons name="logo-google" size={18} color={c.ink} />}
        <Text className="text-[15px] font-semibold leading-[20px] text-ink">Continue with Google</Text>
      </Pressable>
      <FormError message={error} />
      {divider === "after" ? or : null}
    </View>
  );
}
