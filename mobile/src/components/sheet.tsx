/**
 * In-screen bottom sheet for filters and quick choices (Track status, language, level).
 *
 * Why not a `presentation: "formSheet"` route: on Android that is Material BottomSheetBehavior and works in SDK 58, but
 * the presentation has to be declared in the parent `_layout.tsx` before the screen mounts, and these sheets also
 * need to hand a choice straight back to the screen that opened them.
 *
 * Behaviour: slides up over a dimmed scrim; closes on the scrim, the close button, Android back, or by dragging the
 * handle down (a flick is enough). All motion runs on the UI thread and collapses to instant under reduce-motion.
 */
import { useCallback, useEffect, type ReactNode } from "react";
import { Modal, useWindowDimensions } from "react-native";
import { GestureDetector, GestureHandlerRootView, usePanGesture } from "react-native-gesture-handler";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { Icon } from "@/components/ui";
import { Pressable, ScrollView, Text, View } from "@/tw";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const OPEN = { duration: 280, easing: EASE_OUT, reduceMotion: ReduceMotion.System };
const CLOSE = { duration: 200, easing: EASE_OUT, reduceMotion: ReduceMotion.System };
const SNAP_BACK = { duration: 300, dampingRatio: 0.8, reduceMotion: ReduceMotion.System };
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Content, or a function that receives `close` to animate the sheet away after a choice. */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Pinned under the content, above the navigation bar (e.g. Reset / Apply). */
  footer?: ReactNode | ((close: () => void) => ReactNode);
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const y = useSharedValue(height);
  const scrim = useSharedValue(0);
  // Latest window height for the off-screen position, without re-running the open animation when it changes
  // (split screen, display size) while the sheet is up.
  const offscreen = useSharedValue(height);
  useEffect(() => {
    offscreen.set(height);
  }, [height, offscreen]);

  useEffect(() => {
    if (!visible) return;
    y.set(offscreen.get());
    y.set(withTiming(0, OPEN));
    scrim.set(withTiming(1, OPEN));
  }, [visible, y, scrim, offscreen]);

  const close = useCallback(() => {
    scrim.set(withTiming(0, CLOSE));
    y.set(
      withTiming(offscreen.get(), CLOSE, (finished) => {
        if (finished) scheduleOnRN(onClose);
      }),
    );
  }, [onClose, scrim, y, offscreen]);

  const pan = usePanGesture({
    activeOffsetY: [-8, 8],
    onUpdate: (e) => {
      "worklet";
      // Down follows the finger; up resists.
      y.set(e.translationY >= 0 ? e.translationY : e.translationY / 4);
    },
    onDeactivate: (e) => {
      "worklet";
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        scrim.set(withTiming(0, CLOSE));
        y.set(
          withTiming(offscreen.get(), CLOSE, (finished) => {
            if (finished) scheduleOnRN(onClose);
          }),
        );
      } else {
        y.set(withSpring(0, { ...SNAP_BACK, velocity: e.velocityY }));
      }
    },
  });

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.get() * 0.5 }));

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "#000" }, scrimStyle]} />
        {/* Tap-outside to dismiss; hidden from TalkBack, which uses Back or the labelled close button instead. */}
        <Pressable className="flex-1" onPress={close} accessible={false} importantForAccessibility="no" />
        <Animated.View style={[{ maxHeight: height * 0.88 }, panelStyle]} accessibilityViewIsModal>
          <View className="shrink rounded-t-2xl bg-card" style={{ paddingBottom: insets.bottom + 12 }}>
            <GestureDetector gesture={pan}>
              <View className="flex-row items-center pb-1 pl-5 pr-2 pt-2">
                <View className="absolute left-0 right-0 top-2 items-center" style={{ pointerEvents: "none" }}>
                  <View className="h-1 w-10 rounded-full bg-line" />
                </View>
                <Text className="flex-1 pt-3 type-heading text-ink" accessibilityRole="header">
                  {title}
                </Text>
                <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" className="mt-2 h-12 w-12 items-center justify-center rounded-full active:bg-muted-bg">
                  <Icon name="close" size={22} />
                </Pressable>
              </View>
            </GestureDetector>
            <ScrollView className="shrink grow-0" contentContainerClassName="gap-5 px-5 pb-3 pt-2" keyboardShouldPersistTaps="handled">
              {typeof children === "function" ? children(close) : children}
            </ScrollView>
            {footer ? <View className="flex-row gap-3 px-5 pt-3">{typeof footer === "function" ? footer(close) : footer}</View> : null}
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** One row in a sheet: label, optional hint, a check when selected. 56dp tall. Use role "button" for plain actions. */
export function ChoiceRow({
  label,
  hint,
  selected,
  onPress,
  tone = "default",
  role = "radio",
}: {
  label: string;
  hint?: string;
  selected?: boolean;
  onPress: () => void;
  tone?: "default" | "danger";
  role?: "radio" | "button";
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={role === "radio" ? { selected: !!selected, checked: !!selected } : undefined}
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      className={`min-h-14 flex-row items-center gap-3 rounded-2xl px-4 py-2.5 active:bg-muted-bg ${selected ? "bg-brand-50" : ""}`}
    >
      <View className="flex-1 gap-0.5">
        <Text className={`text-[15px] font-semibold leading-[22px] ${tone === "danger" ? "text-danger" : selected ? "text-brand-700" : "text-ink"}`}>{label}</Text>
        {hint ? <Text className="text-[13px] leading-[18px] text-muted">{hint}</Text> : null}
      </View>
      {selected ? <Icon name="checkmark-circle" size={22} color="#F97316" /> : null}
    </Pressable>
  );
}
