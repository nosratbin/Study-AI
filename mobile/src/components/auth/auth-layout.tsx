/**
 * Layout pieces for the signed-out and setup screens: a keyboard-aware form whose primary action stays pinned above the
 * keyboard, the screen title, and an inline text link. Type sizes follow DESIGN.md (28/34, 17/24, 15/22, 13/18).
 */
import type { ReactNode } from "react";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { cn } from "@/lib/cn";
import { useColors } from "@/theme/colors";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from "@/tw";

/**
 * Scrolling content with a pinned footer (the primary action). `keyboardOffset` is the height of anything above this
 * view that the KeyboardAvoidingView can't see, i.e. the native header (useHeaderHeight()).
 */
export function KeyboardForm({
  children,
  footer,
  keyboardOffset = 0,
  edges = ["bottom"],
  scroll = true,
}: {
  children: ReactNode;
  footer: ReactNode;
  keyboardOffset?: number;
  edges?: Edge[];
  /** Set false when the body owns its own list (FlatList), so lists aren't nested in a ScrollView. */
  scroll?: boolean;
}) {
  const c = useColors();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.surface }}>
      {/* Android is edge-to-edge, so the window no longer resizes for the keyboard: pad on both platforms. */}
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={keyboardOffset} className="flex-1">
        {scroll ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName="grow gap-6 px-6 pt-4 pb-6"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {children}
          </ScrollView>
        ) : (
          <View className="flex-1 gap-6 px-6 pt-4">{children}</View>
        )}
        <View className="gap-3 bg-surface px-6 pt-3 pb-4">{footer}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Large title (28/34 bold) with an optional 15/22 subtitle. */
export function ScreenTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="type-display text-ink" accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text className="type-body text-muted">{subtitle}</Text> : null}
      {children}
    </View>
  );
}

/** "New here? Create an account" style row; the link part has a 48dp target. */
export function TextLink({ prompt, label, onPress, className }: { prompt?: string; label: string; onPress: () => void; className?: string }) {
  return (
    <View className={cn("flex-row flex-wrap items-center justify-center", className)}>
      {prompt ? <Text className="text-[15px] leading-[22px] text-muted">{prompt} </Text> : null}
      <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8} className="min-h-12 justify-center px-1 active:opacity-60">
        <Text className="text-[15px] leading-[22px] font-semibold text-brand-700">{label}</Text>
      </Pressable>
    </View>
  );
}

/** A quiet, non-error notice (e.g. "A new code is on its way"). */
export function Notice({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View className="rounded-xl bg-muted-bg px-4 py-3" accessibilityRole="text" accessibilityLiveRegion="polite">
      <Text className="text-[13px] leading-[18px] text-ink">{message}</Text>
    </View>
  );
}
