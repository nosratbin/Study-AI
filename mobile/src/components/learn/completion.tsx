/**
 * The lesson-complete peak moment: the kite lifts in on a short spring, one line of encouragement, the course progress,
 * and "Next lesson". It replaces the reader's bottom bar, so the next step stays under the thumb.
 */
import { useEffect } from "react";
import Animated, { Easing, FadeInDown, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { Image } from "expo-image";
import { Button } from "@/components/ui";
import { AnimatedView, Text, View } from "@/tw";
import type { CompletionCopy } from "./progress";

const KITE = require("../../../assets/images/splash-icon.png");
const PANEL_ENTER = FadeInDown.duration(280).easing(Easing.bezier(0.23, 1, 0.32, 1)).reduceMotion(ReduceMotion.System);
const LIFT = { duration: 550, dampingRatio: 0.55, reduceMotion: ReduceMotion.System };

function Kite() {
  const reduce = useReducedMotion();
  const progress = useSharedValue(reduce ? 1 : 0);
  const opacity = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    opacity.set(withTiming(1, { duration: 180 }));
    progress.set(withSpring(1, LIFT));
  }, [opacity, progress]);
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: opacity.get(),
      transform: [{ translateY: (1 - p) * 18 }, { rotate: `${(1 - p) * -14}deg` }, { scale: 0.9 + p * 0.1 }],
    };
  });
  return (
    <Animated.View style={style} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Image source={KITE} style={{ width: 64, height: 64 }} contentFit="contain" />
    </Animated.View>
  );
}

export function CompletionPanel({
  copy,
  certificateCode,
  percent,
  bottomInset,
  onAction,
  onDismiss,
}: {
  copy: CompletionCopy;
  certificateCode?: string | null;
  percent: number;
  bottomInset: number;
  onAction: () => void;
  onDismiss: () => void;
}) {
  return (
    <AnimatedView entering={PANEL_ENTER} className="absolute inset-x-0 bottom-0">
      <View className="gap-4 rounded-t-2xl bg-card px-5 pt-5" style={{ paddingBottom: bottomInset + 12 }}>
        <View className="flex-row items-center gap-4">
          <Kite />
          <View className="flex-1 gap-1">
            <Text accessibilityRole="header" className="type-heading text-ink">
              {copy.title}
            </Text>
            <Text className="text-[15px] leading-[22px] text-muted">{copy.body}</Text>
          </View>
        </View>
        <View
          className="h-2 overflow-hidden rounded-full bg-brand-100"
          accessibilityRole="progressbar"
          accessibilityLabel="Course progress"
          accessibilityValue={{ min: 0, max: 100, now: percent }}
        >
          <View className="h-full rounded-full bg-brand-500" style={{ width: `${percent}%` }} />
        </View>
        {certificateCode ? (
          <View className="flex-row items-center justify-between rounded-2xl bg-brand-50 px-4 py-3">
            <Text className="text-[13px] font-semibold leading-[18px] text-brand-700">Certificate earned</Text>
            <Text selectable className="text-[13px] leading-[18px] text-brand-700">
              {certificateCode}
            </Text>
          </View>
        ) : null}
        <View className="flex-row gap-3">
          <Button variant="secondary" onPress={onDismiss} className="flex-1" accessibilityLabel="Keep reading this lesson">
            Keep reading
          </Button>
          <Button onPress={onAction} icon={copy.action === "next" ? "arrow-forward" : "list"} className="flex-[1.4]">
            {copy.actionLabel}
          </Button>
        </View>
      </View>
    </AnimatedView>
  );
}
