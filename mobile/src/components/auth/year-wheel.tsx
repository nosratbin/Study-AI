/**
 * Birth-year picker: a snapping wheel with a tinted band marking the centre row. A tap on any year also picks it, and
 * TalkBack users adjust it with swipe up/down (accessibilityRole="adjustable"), so the scroll gesture is never the
 * only way in. Rows grow with the system font scale.
 *
 * Nothing is chosen until the student scrolls or taps: the year decides whether the guardian-consent step appears, so
 * the wheel only starts near a suggested year and never answers for them. The band appears once a year is picked.
 */
import { useRef } from "react";
import { FlatList, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import * as Haptics from "expo-haptics";
import { cn } from "@/lib/cn";
import { Pressable, Text, View } from "@/tw";

const VISIBLE = 5; // odd, so one row sits in the middle
const PAD = Math.floor(VISIBLE / 2);

export function YearWheel({
  years,
  value,
  initial,
  onChange,
  label = "Birth year",
}: {
  /** Newest first. */
  years: number[];
  value: number | null;
  /** Year the wheel starts on before the student picks one; it is not selected. */
  initial: number;
  onChange: (year: number) => void;
  label?: string;
}) {
  const { fontScale } = useWindowDimensions();
  const rowH = Math.round(Math.max(48, 44 * fontScale));
  const list = useRef<FlatList<number>>(null);
  const lastTick = useRef<number | null>(null);
  const positioned = useRef(false);

  const indexOf = (y: number) => Math.max(0, years.indexOf(y));
  const clamp = (i: number) => Math.min(years.length - 1, Math.max(0, i));
  const indexAt = (e: NativeSyntheticEvent<NativeScrollEvent>) => clamp(Math.round(e.nativeEvent.contentOffset.y / rowH));

  function pick(i: number, animated = true) {
    const idx = clamp(i);
    list.current?.scrollToOffset({ offset: idx * rowH, animated });
    lastTick.current = idx;
    onChange(years[idx]);
  }

  function settle(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = indexAt(e);
    if (years[idx] !== value) onChange(years[idx]);
  }

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: value ? String(value) : "Not chosen yet" }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => {
        const current = indexOf(value ?? initial);
        // Newest first: a later year is one row up.
        pick(e.nativeEvent.actionName === "increment" ? current - 1 : current + 1, false);
      }}
      style={{ height: rowH * VISIBLE }}
      className="overflow-hidden rounded-2xl bg-card"
    >
      {value !== null ? <View pointerEvents="none" className="absolute inset-x-3 rounded-2xl bg-brand-50" style={{ top: rowH * PAD, height: rowH }} /> : null}
      <FlatList
        ref={list}
        data={years}
        keyExtractor={(y) => String(y)}
        getItemLayout={(_, i) => ({ length: rowH, offset: rowH * (PAD + i), index: i })}
        initialNumToRender={years.length}
        ListHeaderComponent={<View style={{ height: rowH * PAD }} />}
        ListFooterComponent={<View style={{ height: rowH * PAD }} />}
        showsVerticalScrollIndicator={false}
        snapToInterval={rowH}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onLayout={() => {
          // Centre the current (or suggested) year once, before the student touches it.
          if (positioned.current) return;
          positioned.current = true;
          list.current?.scrollToOffset({ offset: indexOf(value ?? initial) * rowH, animated: false });
        }}
        onScroll={(e) => {
          // A selection tick each time a new year crosses the band; a ref, not state, so scrolling never re-renders.
          const idx = indexAt(e);
          if (lastTick.current !== null && lastTick.current !== idx) Haptics.selectionAsync().catch(() => undefined);
          lastTick.current = idx;
        }}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={(e) => {
          if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) settle(e);
        }}
        renderItem={({ item, index }) => {
          const on = item === value;
          return (
            <Pressable onPress={() => pick(index)} style={{ height: rowH }} className="items-center justify-center" importantForAccessibility="no">
              <Text className={cn("text-[17px] leading-[24px]", on ? "font-semibold text-ink" : "text-muted")}>{item}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
