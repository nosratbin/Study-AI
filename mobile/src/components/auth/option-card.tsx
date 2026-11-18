/** A large single-choice option (education level, language): soft card, check mark when chosen, radio semantics. */
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useColors } from "@/theme/colors";
import { PressableScale } from "@/components/motion";
import { Text, View } from "@/tw";

export function OptionCard({
  title,
  eyebrow,
  body,
  selected,
  onPress,
  trailing,
}: {
  title: string;
  eyebrow?: string;
  body?: string;
  selected: boolean;
  onPress: () => void;
  trailing?: ReactNode;
}) {
  const c = useColors();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={[title, eyebrow, body].filter(Boolean).join(". ")}
      className={cn("min-h-16 flex-row items-center gap-4 rounded-2xl border-2 px-5 py-4", selected ? "border-brand-500 bg-brand-50" : "border-transparent bg-card")}
    >
      <View className="flex-1 gap-1">
        {eyebrow ? <Text className="text-[13px] leading-[18px] text-muted">{eyebrow}</Text> : null}
        <Text className="text-[17px] leading-[24px] font-semibold text-ink">{title}</Text>
        {body ? <Text className="text-[15px] leading-[22px] text-muted">{body}</Text> : null}
      </View>
      {trailing}
      {/* Always laid out, so choosing doesn't shift the text; the icon (not only colour) marks the choice. */}
      <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={24} color={selected ? c.brand500 : c.line} />
    </PressableScale>
  );
}
