/** Thin onboarding progress bar. The fill is absolutely positioned and childless, so animating its width is cheap. */
import { useEffect } from "react";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { View } from "@/tw";
import { useColors } from "@/theme/colors";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export function StepProgress({ step, total }: { step: number; total: number }) {
  const c = useColors();
  const pct = Math.round(((step + 1) / total) * 100);
  const width = useSharedValue(pct);
  useEffect(() => {
    width.set(withTiming(pct, { duration: 250, easing: EASE_OUT, reduceMotion: ReduceMotion.System }));
  }, [pct, width]);
  const fill = useAnimatedStyle(() => ({ width: `${width.get()}%` }));

  return (
    <View
      className="h-1.5 overflow-hidden rounded-full bg-brand-100"
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step + 1} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: step + 1 }}
    >
      <Animated.View style={[{ position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 999, backgroundColor: c.brand500 }, fill]} />
    </View>
  );
}
