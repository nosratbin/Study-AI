/** Chat composer: grows up to five lines, send stays disabled while a reply is pending. */
import { useState } from "react";
import { ActivityIndicator, useWindowDimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { Icon } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useColors } from "@/theme/colors";
import { Pressable, TextInput, View } from "@/tw";

const LINE = 22;
const MAX_LINES = 5;
const PAD_Y = 12;
export const MAX_MESSAGE_LENGTH = 4000;

export function Composer({
  value,
  onChangeText,
  onSend,
  pending,
  disabled,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  pending: boolean;
  disabled: boolean;
  placeholder: string;
}) {
  const c = useColors();
  const { fontScale } = useWindowDimensions();
  const [focused, setFocused] = useState(false);
  const canSend = !disabled && !pending && value.trim().length > 0;
  // Grow with the text up to five lines (at the user's font scale), then scroll inside the field.
  const maxHeight = Math.ceil(LINE * fontScale * MAX_LINES + PAD_Y * 2);

  return (
    <View className="bg-surface px-3 pb-2 pt-1">
      <View className={cn("min-h-13 flex-row items-end rounded-[24px] border bg-card pl-4 pr-1.5", focused ? "border-input" : "border-line")}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          multiline
          editable={!disabled}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={placeholder}
          placeholderTextColor={c.subtle}
          accessibilityLabel="Your question"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          textAlignVertical="center"
          className="flex-1 text-[15px] text-ink"
          style={{ maxHeight, paddingTop: PAD_Y + 2, paddingBottom: PAD_Y + 2, lineHeight: LINE }}
        />
        <Pressable
          onPress={() => {
            if (!canSend) return;
            Haptics.selectionAsync().catch(() => undefined);
            onSend();
          }}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={pending ? "Sending, waiting for the tutor" : "Send message"}
          accessibilityState={{ disabled: !canSend, busy: pending }}
          className={cn("mb-1.5 ml-2 h-10 w-10 items-center justify-center rounded-full", canSend || pending ? "bg-brand-solid active:bg-brand-solid-pressed" : "bg-muted-bg")}
        >
          {pending ? <ActivityIndicator color="#fff" /> : <Icon name="arrow-up" size={20} color={canSend ? "#fff" : c.subtle} />}
        </Pressable>
      </View>
    </View>
  );
}
