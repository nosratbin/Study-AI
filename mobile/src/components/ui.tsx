/**
 * Shared UI kit. Foundations follow Astryx (neutral flat surfaces, hierarchy from weight and colour, 4 px grid, radii
 * 8 / 12 / 16, Figtree); interactive pieces follow BeUI Native's patterns (pill buttons with a spring press, a segmented
 * control with a sliding indicator). Rules: one primary (orange) action per region; secondary actions are neutral
 * fills; cards are flat `bg-card` on `bg-surface` with no borders or shadows; every touch target is >= 44 dp.
 * Line heights are always px (`leading-[22px]`): spacing-based `leading-N` breaks on native.
 */
import { useEffect, useState, type ReactNode, type Ref } from "react";
import { ActivityIndicator, RefreshControl, type LayoutChangeEvent, type TextInputInstance, type TextInputProps as RNTextInputProps } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { cn } from "@/lib/cn";
import { useColors } from "@/theme/colors";
import { AnimatedView, Pressable, ScrollView, Text, TextInput, View } from "@/tw";
import type { ApiError } from "@/lib/api";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];

/** BeUI press spring: quick, no wobble. */
export const PRESS_SPRING = { damping: 22, stiffness: 420, mass: 0.6, reduceMotion: ReduceMotion.System } as const;
/** Settles without overshoot (Astryx standard easing feel) for indicators. */
export const SETTLE_SPRING = { damping: 30, stiffness: 320, mass: 1, overshootClamping: true, reduceMotion: ReduceMotion.System } as const;

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const c = useColors();
  return <Ionicons name={name} size={size} color={color ?? c.muted} accessible={false} importantForAccessibility="no" />;
}

/* ---------- Layout ---------- */

/**
 * A full screen: safe area + surface background. Scrolls by default; pass `onRefresh` for pull-to-refresh.
 * Use `scroll={false}` for screens that own their own list (FlatList) or a chat layout.
 */
export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  edges = ["top"],
  className,
  contentClassName,
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  className?: string;
  contentClassName?: string;
}) {
  const c = useColors();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.surface }}>
      {scroll ? (
        <ScrollView
          className={cn("flex-1", className)}
          contentContainerClassName={cn("px-4 pt-2 pb-12 gap-6", contentClassName)}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand500} colors={[c.brand500]} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View className={cn("flex-1", className)}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/** Screen title block (large title, optional eyebrow, subtitle and trailing actions). */
export function Heading({ title, subtitle, eyebrow, right }: { title: string; subtitle?: string; eyebrow?: string; right?: ReactNode }) {
  return (
    <View className="flex-row items-end gap-3 pt-2">
      <View className="flex-1 gap-1">
        {eyebrow ? <Text className="type-label text-muted">{eyebrow}</Text> : null}
        <Text className="type-display text-ink" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text className="type-body text-muted">{subtitle}</Text> : null}
      </View>
      {right ? <View className="flex-row items-center gap-1">{right}</View> : null}
    </View>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View className="min-h-8 flex-row items-center justify-between">
      <Text className="type-heading text-ink" accessibilityRole="header">
        {children}
      </Text>
      {action}
    </View>
  );
}

/** Small text action for section headers ("See all"). */
export function TextAction({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      className="min-h-8 justify-center rounded-md px-1 active:opacity-60"
    >
      <Text className="type-label font-semibold text-brand-700">{label}</Text>
    </Pressable>
  );
}

export function Card({ children, className, onPress, accessibilityLabel }: { children: ReactNode; className?: string; onPress?: () => void; accessibilityLabel?: string }) {
  // Flat container: grouping comes from bg-card on bg-surface and spacing, never borders or shadows.
  const base = cn("rounded-2xl bg-card p-4", className);
  if (!onPress) return <View className={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} className={cn(base, "active:opacity-80")}>
      {children}
    </Pressable>
  );
}

/** 44 dp round icon button (header actions). */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  tone = "plain",
  size = 22,
  disabled,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  tone?: "plain" | "filled";
  size?: number;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      className={cn("h-11 w-11 items-center justify-center rounded-full active:bg-muted-bg", tone === "filled" && "bg-card", disabled && "opacity-40")}
    >
      <Ionicons name={icon} size={size} color={c.ink} />
    </Pressable>
  );
}

/* ---------- Buttons ---------- */

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase: Record<ButtonVariant, string> = {
  primary: "bg-brand-solid",
  secondary: "bg-muted-bg",
  outline: "border border-input bg-transparent",
  ghost: "bg-transparent",
  danger: "bg-danger-solid",
};
const buttonText: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-ink",
  outline: "text-ink",
  ghost: "text-brand-700",
  danger: "text-white",
};
const buttonSize: Record<ButtonSize, { box: string; text: string; icon: number }> = {
  sm: { box: "min-h-9 px-4 gap-1.5", text: "text-[14px] leading-[20px]", icon: 16 },
  md: { box: "min-h-12 px-5 gap-2", text: "text-[15px] leading-[20px]", icon: 18 },
  lg: { box: "min-h-14 px-6 gap-2", text: "text-[16px] leading-[22px]", icon: 20 },
};

/** BeUI-style pill button: spring scale on press, selection haptic, loading and disabled states. */
export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  className,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  className?: string;
  accessibilityLabel?: string;
}) {
  const c = useColors();
  const inactive = disabled || loading;
  const fg = variant === "primary" || variant === "danger" ? "#FFFFFF" : variant === "ghost" ? c.brand700 : c.ink;
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const s = buttonSize[size];
  return (
    // Scale lives on the wrapper (caller layout classes such as flex-1 go there too); the Pressable fills it.
    <AnimatedView style={animated} className={className}>
    <Pressable
      onPress={() => {
        if (inactive) return;
        Haptics.selectionAsync().catch(() => undefined);
        onPress?.();
      }}
      onPressIn={() => {
        if (!inactive) scale.set(withSpring(0.96, PRESS_SPRING));
      }}
      onPressOut={() => scale.set(withSpring(1, PRESS_SPRING))}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof children === "string" ? children : undefined)}
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={cn("grow flex-row items-center justify-center rounded-full", s.box, buttonBase[variant], inactive && "opacity-50")}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : icon ? (
        <Ionicons name={icon} size={s.icon} color={fg} accessible={false} importantForAccessibility="no" />
      ) : null}
      <Text className={cn("font-semibold", s.text, buttonText[variant])} numberOfLines={1}>
        {children}
      </Text>
    </Pressable>
    </AnimatedView>
  );
}

/* ---------- Forms ---------- */

/** Labelled text field. React 19: pass `ref` as a normal prop. */
export function Input({
  label,
  error,
  hint,
  secure,
  onFocus,
  onBlur,
  ...props
}: RNTextInputProps & { label: string; error?: string; hint?: string; secure?: boolean; ref?: Ref<TextInputInstance> }) {
  const c = useColors();
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  return (
    <View className="gap-2">
      <Text className="type-label text-ink">{label}</Text>
      <View
        className={cn(
          "min-h-12 flex-row items-center rounded-xl border bg-card pl-4",
          secure ? "pr-1" : "pr-4",
          error ? "border-danger" : focused ? "border-brand-500" : "border-input",
        )}
      >
        <TextInput
          placeholderTextColor={c.subtle}
          secureTextEntry={secure && hidden}
          accessibilityLabel={label}
          className="flex-1 py-3 text-[15px] text-ink"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-muted-bg"
          >
            <Icon name={hidden ? "eye-outline" : "eye-off-outline"} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="type-label font-normal text-danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text className="type-label font-normal text-muted">{hint}</Text>
      ) : null}
    </View>
  );
}

/** One filter chip; use several in a row. Selected = inverted neutral (Astryx), not brand, so orange stays for actions. */
export function Chip({ label, selected, onPress, count }: { label: string; selected?: boolean; onPress?: () => void; count?: number }) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress?.();
      }}
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      className={cn("min-h-9 flex-row items-center justify-center gap-1.5 rounded-full px-4", selected ? "bg-ink" : "bg-muted-bg active:opacity-70")}
    >
      <Text className={cn("type-label", selected ? "text-surface" : "text-ink")}>{label}</Text>
      {count !== undefined ? <Text className={cn("type-caption", selected ? "text-surface" : "text-muted")}>{count}</Text> : null}
    </Pressable>
  );
}

/** Bengali glyphs are taller than Figtree's; a 13/18 line box clips them and shifts them up. */
const BANGLA = /[ঀ-৿]/;
const BANGLA_LINE = { lineHeight: 22, includeFontPadding: true } as const;

/**
 * BeUI-style segmented control: a neutral track with a raised indicator that springs between options.
 * Options share the width equally.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: { value: T; label: string; a11y?: string }[];
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel: string;
}) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const seg = width > 0 ? (width - 8) / options.length : 0;
  const x = useSharedValue(0);
  useEffect(() => {
    x.set(seg ? withSpring(index * seg, SETTLE_SPRING) : 0);
  }, [index, seg, x]);
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      className="flex-row rounded-xl bg-muted-bg p-1"
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {seg ? (
        <Animated.View style={[{ position: "absolute", top: 4, bottom: 4, left: 4, width: seg }, indicator]}>
          <View className="flex-1 rounded-lg bg-raised" />
        </Animated.View>
      ) : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              if (active) return;
              Haptics.selectionAsync().catch(() => undefined);
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityLabel={o.a11y ?? o.label}
            accessibilityState={{ checked: active }}
            className="min-h-10 flex-1 items-center justify-center px-2"
          >
            <Text className={cn("type-label", active ? "font-semibold text-ink" : "text-muted")} numberOfLines={1} style={BANGLA.test(o.label) ? BANGLA_LINE : undefined}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Status ---------- */

type BadgeTone = "brand" | "success" | "danger" | "neutral";
const badgeTone: Record<BadgeTone, [string, string]> = {
  brand: ["bg-brand-50", "text-brand-700"],
  success: ["bg-success-50", "text-success"],
  danger: ["bg-danger-50", "text-danger"],
  neutral: ["bg-muted-bg", "text-muted"],
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  const [bg, fg] = badgeTone[tone];
  return (
    <View className={cn("self-start rounded-md px-2 py-0.5", bg)}>
      <Text className={cn("type-caption font-semibold", fg)}>{children}</Text>
    </View>
  );
}

/** Seeded content must be labelled "Demo" (product rule). */
export function DemoBadge({ show }: { show: boolean }) {
  return show ? <Badge tone="neutral">Demo</Badge> : null;
}

/** Thin progress track; the fill animates to its value. */
export function ProgressBar({ value, label, tone = "brand" }: { value: number; label?: string; tone?: "brand" | "success" }) {
  const c = useColors();
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const w = useSharedValue(0);
  useEffect(() => {
    w.set(withTiming(pct, { duration: 450, reduceMotion: ReduceMotion.System }));
  }, [pct, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.get()}%` }));
  return (
    <View
      className="h-1.5 overflow-hidden rounded-full bg-muted-bg"
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <Animated.View style={[{ height: "100%", borderRadius: 999, backgroundColor: tone === "success" ? c.success : c.brand500 }, fill]} />
    </View>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  const c = useColors();
  return (
    <View className="items-center justify-center py-16" accessibilityLabel={label}>
      <ActivityIndicator color={c.brand500} size="large" />
    </View>
  );
}

export function EmptyState({ icon = "sparkles-outline", title, body, action }: { icon?: IconName; title: string; body?: string; action?: ReactNode }) {
  const c = useColors();
  return (
    <View className="items-center gap-3 px-6 py-12">
      <View className="mb-1 h-14 w-14 items-center justify-center rounded-2xl bg-muted-bg">
        <Icon name={icon} size={26} color={c.ink} />
      </View>
      <Text className="type-heading text-center text-ink">{title}</Text>
      {body ? <Text className="type-callout max-w-[300px] text-center text-muted">{body}</Text> : null}
      {action ? <View className="pt-2">{action}</View> : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError | Error | null; onRetry?: () => void }) {
  const c = useColors();
  return (
    <View className="items-center gap-3 px-6 py-12" accessibilityRole="alert">
      <View className="mb-1 h-14 w-14 items-center justify-center rounded-2xl bg-danger-50">
        <Icon name="cloud-offline-outline" size={26} color={c.danger} />
      </View>
      <Text className="type-heading text-center text-ink">Couldn&apos;t load this</Text>
      <Text className="type-callout max-w-[300px] text-center text-muted">{error?.message ?? "Something went wrong. Please try again."}</Text>
      {onRetry ? (
        <View className="pt-2">
          <Button variant="secondary" size="sm" onPress={onRetry} icon="refresh">
            Try again
          </Button>
        </View>
      ) : null}
    </View>
  );
}

/** Inline form-level error banner. */
export function FormError({ message }: { message?: string | null }) {
  const c = useColors();
  if (!message) return null;
  return (
    <View className="flex-row items-start gap-2 rounded-xl bg-danger-50 px-3 py-3" accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name="alert-circle" size={18} color={c.danger} />
      <Text className="type-callout flex-1 text-danger">{message}</Text>
    </View>
  );
}

/** Hairline divider. */
export function Divider({ inset = 0 }: { inset?: number }) {
  return <View className="h-px bg-line" style={inset ? { marginLeft: inset } : undefined} />;
}
