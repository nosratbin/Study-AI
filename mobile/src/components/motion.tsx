/**
 * Shared motion and placeholder primitives. All animation runs on the UI thread (Reanimated) and respects reduce-motion.
 */
import { useEffect, useState, type ReactNode } from "react";
import { useColorScheme, type PressableProps as RNPressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import NetInfo from "@react-native-community/netinfo";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { cn } from "@/lib/cn";
import { Pressable, Text, View } from "@/tw";

const PRESS_SPRING = { damping: 20, stiffness: 400, mass: 0.6, reduceMotion: ReduceMotion.System };

/**
 * Pressable that scales to 0.97 on press with a spring and gives a selection haptic. Use it for tappable cards and rows.
 * Put layout classes on `className`; the scale wraps the content.
 */
export function PressableScale({
  children,
  className,
  style,
  haptic = true,
  onPress,
  ...props
}: Omit<RNPressableProps, "children" | "style"> & { children: ReactNode; className?: string; style?: StyleProp<ViewStyle>; haptic?: boolean }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Pressable
      {...props}
      accessibilityRole={props.accessibilityRole ?? "button"}
      onPressIn={(e) => {
        scale.set(withSpring(0.97, PRESS_SPRING));
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, PRESS_SPRING));
        props.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) Haptics.selectionAsync().catch(() => undefined);
        onPress?.(e);
      }}
    >
      <Animated.View style={[animated, style]}>
        <View className={className}>{children}</View>
      </Animated.View>
    </Pressable>
  );
}

/** Pulsing placeholder block. Compose several to match the real layout: <Skeleton className="h-5 w-2/3 rounded-lg" />. */
export function Skeleton({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (!reduce) opacity.set(withRepeat(withTiming(0.45, { duration: 800 }), -1, true));
  }, [reduce, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View style={style} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View className={cn("rounded-xl bg-muted-bg", className)} />
    </Animated.View>
  );
}

/** True while the device has no usable connection (NetInfo). */
export function useIsOffline(): boolean {
  const [offline, setOffline] = useState(false);
  useEffect(
    () =>
      NetInfo.addEventListener((s) => {
        setOffline(s.isConnected === false || s.isInternetReachable === false);
      }),
    [],
  );
  return offline;
}

/**
 * Slim offline bar, rendered in layout flow above the navigator (see (app)/_layout.tsx), so it pushes screens down
 * instead of covering headers. It owns the status-bar inset; the layout zeroes the top inset for everything below it.
 */
export function OfflineBanner({ topInset }: { topInset: number }) {
  // The bar is ink-coloured (dark in light mode, light in dark mode): flip the status-bar icons to stay readable.
  const scheme = useColorScheme();
  return (
    <View
      className="flex-row items-center justify-center bg-ink px-4 pb-2"
      style={{ paddingTop: topInset + 6 }}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <StatusBar style={scheme === "dark" ? "dark" : "light"} />
      <Text className="text-[13px] font-semibold leading-[18px] text-surface">You&apos;re offline. Showing saved content.</Text>
    </View>
  );
}

/** Success haptic for peak moments (lesson complete, certificate, application tracked). */
export function celebrate() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
