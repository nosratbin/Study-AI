/**
 * className-enabled React Native primitives (NativeWind v5 / react-native-css).
 * Import UI primitives from "@/tw", not "react-native". For router links use expo-router's
 * `<Link href asChild><Pressable className="...">` so the Pressable carries the styles.
 */
import { useCssElement, useNativeVariable as useFunctionalVariable } from "react-native-css";
import Animated from "react-native-reanimated";
import React from "react";
import {
  View as RNView,
  Text as RNText,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  TextInput as RNTextInput,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
} from "react-native";

/**
 * Wrap a component so `className` (and other `*ClassName` props) become styles. The component is typed loosely on purpose:
 * inferring StyledConfiguration over React Native's full prop unions overflows the compiler (TS2590). Public props stay typed.
 */
function styled<P>(component: React.ElementType, mapping: Record<string, string>, name: string, baseClass?: string) {
  const C = component as React.ComponentType<Record<string, unknown>>;
  const Styled = (props: P) => {
    const p = props as Record<string, unknown>;
    // Base classes come first so the caller's classes win (e.g. font-mono over the default Figtree).
    const merged = baseClass ? { ...p, className: p.className ? `${baseClass} ${p.className as string}` : baseClass } : p;
    return useCssElement(C, merged, mapping as { className: "style" });
  };
  Styled.displayName = `CSS(${name})`;
  return Styled;
}

export const useCSSVariable =
  process.env.EXPO_OS !== "web" ? useFunctionalVariable : (variable: string) => `var(${variable})`;

type WithClass<C extends React.ElementType, Extra = object> = React.ComponentProps<C> & { className?: string } & Extra;

export type ViewProps = WithClass<typeof RNView>;
export const View = styled<ViewProps>(RNView, { className: "style" }, "View");

export type TextProps = WithClass<typeof RNText>;
export const Text = styled<TextProps>(RNText, { className: "style" }, "Text", "font-sans");

export type ScrollViewProps = WithClass<typeof RNScrollView, { contentContainerClassName?: string }>;
export const ScrollView = styled<ScrollViewProps>(
  RNScrollView,
  { className: "style", contentContainerClassName: "contentContainerStyle" },
  "ScrollView",
);

export type PressableProps = WithClass<typeof RNPressable>;
export const Pressable = styled<PressableProps>(RNPressable, { className: "style" }, "Pressable");

export type TextInputProps = WithClass<typeof RNTextInput>;
export const TextInput = styled<TextInputProps>(RNTextInput, { className: "style" }, "TextInput", "font-sans");

export type KeyboardAvoidingViewProps = WithClass<typeof RNKeyboardAvoidingView>;
export const KeyboardAvoidingView = styled<KeyboardAvoidingViewProps>(RNKeyboardAvoidingView, { className: "style" }, "KeyboardAvoidingView");

/** Reanimated View with className; accepts `entering`, `exiting`, `layout` and animated `style`. */
export type AnimatedViewProps = WithClass<typeof Animated.View>;
export const AnimatedView = styled<AnimatedViewProps>(Animated.View, { className: "style" }, "AnimatedView");
