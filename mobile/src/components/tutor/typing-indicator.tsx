/**
 * "Tutor is thinking" bubble. Three dots fade in turn on the UI thread; with reduce-motion on they stay still
 * and the text label carries the state.
 */
import { useEffect } from "react";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Text, View } from "@/tw";

const EASE = Easing.bezier(0.77, 0, 0.175, 1);

function Dot({ delay, reduce }: { delay: number; reduce: boolean }) {
  const opacity = useSharedValue(reduce ? 0.6 : 0.3);
  useEffect(() => {
    if (reduce) return;
    opacity.set(
      withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 360, easing: EASE }), withTiming(0.3, { duration: 360, easing: EASE })), -1)),
    );
    return () => cancelAnimation(opacity);
  }, [delay, reduce, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View style={style}>
      <View className="h-2 w-2 rounded-full bg-muted" />
    </Animated.View>
  );
}

export function TypingIndicator() {
  const reduce = useReducedMotion();
  return (
    <View
      className="mb-4 flex-row items-center gap-3 self-start rounded-2xl rounded-bl-md bg-card px-4 py-3.5"
      accessibilityRole="progressbar"
      accessibilityLabel="The tutor is writing a reply"
      accessibilityLiveRegion="polite"
    >
      <View className="flex-row items-center gap-1.5" importantForAccessibility="no-hide-descendants">
        <Dot delay={0} reduce={reduce} />
        <Dot delay={160} reduce={reduce} />
        <Dot delay={320} reduce={reduce} />
      </View>
      <Text className="text-[13px] text-muted">Thinking…</Text>
    </View>
  );
}
