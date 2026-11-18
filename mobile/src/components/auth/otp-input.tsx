/**
 * The email verification code: six visual boxes driven by one hidden TextInput laid over them. Typing, backspace, a
 * paste and the keyboard's one-time-code autofill are all ordinary edits of that one field, so none of them depends on
 * Android keyboards reporting key presses (they often don't for Backspace in an empty field). When the sixth digit
 * lands, `onComplete` fires so the screen can submit without a tap. The text rules live in ./otp.ts.
 */
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type { TextInputInstance } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { cn } from "@/lib/cn";
import { Text, TextInput, View } from "@/tw";
import { CODE_LENGTH, isComplete, nextCode } from "./otp";

export interface OtpInputHandle {
  focus: () => void;
}

const SHAKE = { duration: 50, reduceMotion: ReduceMotion.System };
const BOXES = Array.from({ length: CODE_LENGTH }, (_, i) => i);

export function OtpInput({
  value,
  onChange,
  onComplete,
  error = false,
  shakeKey = 0,
  disabled = false,
  autoFocus = false,
  describedBy,
  ref,
}: {
  /** The digits typed so far, at most six. */
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  error?: boolean;
  /** Change this number to shake the row (a wrong code). */
  shakeKey?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Read after the field's label, e.g. the email the code was sent to. */
  describedBy?: string;
  ref?: Ref<OtpInputHandle>;
}) {
  const input = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(0);
  const shake = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }));

  // A wrong code nudges the row sideways. Reduced motion skips it: the red boxes and the message carry the meaning.
  useEffect(() => {
    if (!shakeKey || reduceMotion) return;
    offset.set(withSequence(withTiming(-8, SHAKE), withTiming(8, SHAKE), withTiming(-6, SHAKE), withTiming(6, SHAKE), withTiming(0, SHAKE)));
  }, [shakeKey, reduceMotion, offset]);

  // The box the next digit goes into; it stays on the last box once the code is full.
  const active = Math.min(value.length, CODE_LENGTH - 1);

  return (
    <Animated.View style={shake}>
      {/* Boxes are the picture only; TalkBack reads the field below, which announces the typed digits. */}
      <View className="flex-row gap-1" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {BOXES.map((i) => (
          <View
            key={i}
            testID={`otp-box-${i + 1}`}
            className={cn(
              "min-h-14 min-w-12 flex-1 items-center justify-center rounded-2xl border-2 bg-card",
              error ? "border-danger" : focused && i === active ? "border-brand-500" : "border-transparent",
              disabled && "opacity-60",
            )}
          >
            <Text className="text-[28px] leading-[34px] font-semibold text-ink">{value[i] ?? ""}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => {
          const next = nextCode(value, text);
          if (next === value) return;
          onChange(next);
          if (isComplete(next)) onComplete?.(next);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={!disabled}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        inputMode="numeric"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        importantForAutofill="yes"
        autoCorrect={false}
        spellCheck={false}
        caretHidden
        contextMenuHidden={false}
        selectionColor="transparent"
        underlineColorAndroid="transparent"
        accessibilityLabel="Verification code, 6 digits"
        accessibilityHint={describedBy}
        accessibilityState={{ disabled }}
        // Laid over the boxes so a tap anywhere on the row focuses it and a long press offers Paste. Near-zero opacity,
        // not zero, because some Android versions won't focus a fully transparent field.
        className="absolute inset-0 text-transparent"
        style={{ opacity: 0.01, fontSize: 1 }}
      />
    </Animated.View>
  );
}
