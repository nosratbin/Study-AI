/**
 * Learn search: the field at the top of the tab and what shows under it while it is focused. The empty state is never
 * blank: recent searches, topics that match real courses, and courses to jump back into.
 */
import type { RefObject } from "react";
import type { TextInputInstance } from "react-native";
import { cn } from "@/lib/cn";
import type { CourseCard } from "@/lib/types";
import { Icon } from "@/components/ui";
import { useColors } from "@/theme/colors";
import { Pressable, Text, TextInput, View } from "@/tw";
import { CourseRow } from "./course-cards";
import { forgetSearch } from "./recent-searches";

export function SearchField({
  value,
  onChangeText,
  focused,
  onFocus,
  onBlur,
  onSubmit,
  onCancel,
  inputRef,
}: {
  value: string;
  onChangeText: (q: string) => void;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  inputRef: RefObject<TextInputInstance | null>;
}) {
  const c = useColors();
  return (
    <View className="flex-row items-center gap-2 px-4">
      <View className={cn("min-h-12 flex-1 flex-row items-center gap-2 rounded-xl border bg-card pl-4", focused ? "border-brand-500" : "border-transparent")}>
        <Icon name="search" size={20} color={c.muted} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          onSubmitEditing={onSubmit}
          placeholder="Search courses and topics"
          placeholderTextColor={c.muted}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel="Search courses"
          className="flex-1 py-3 text-[15px] text-ink"
        />
        {value ? (
          <Pressable onPress={() => onChangeText("")} accessibilityRole="button" accessibilityLabel="Clear search" className="h-12 w-12 items-center justify-center">
            <Icon name="close-circle" size={20} color={c.muted} />
          </Pressable>
        ) : null}
      </View>
      {focused || value ? (
        <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancel search" className="min-h-12 justify-center px-1">
          <Text className="type-body font-semibold text-brand-700">Cancel</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function SuggestionChip({ label, icon, onPress, onRemove }: { label: string; icon: "time-outline" | "sparkles-outline"; onPress: () => void; onRemove?: () => void }) {
  const c = useColors();
  return (
    <View className="flex-row items-center rounded-full bg-card">
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Search for ${label}`} className="min-h-10 flex-row items-center gap-2 pl-4 pr-3">
        <Icon name={icon} size={16} color={c.muted} />
        <Text className="type-callout text-ink">{label}</Text>
      </Pressable>
      {onRemove ? (
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${label} from recent searches`} className="h-10 w-10 items-center justify-center pr-1">
          <Icon name="close" size={16} color={c.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="px-4 text-[13px] font-semibold leading-[18px] text-muted">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Shown under the focused, empty search field. */
export function SearchSuggestions({
  recents,
  topics,
  jumpBackIn,
  onSearch,
  onOpen,
}: {
  recents: string[];
  topics: string[];
  jumpBackIn: CourseCard[];
  onSearch: (q: string) => void;
  onOpen: (c: CourseCard) => void;
}) {
  return (
    <View className="gap-6 pb-4 pt-2">
      {recents.length ? (
        <Section title="Recent searches">
          <View className="flex-row flex-wrap gap-2 px-4">
            {recents.map((q) => (
              <SuggestionChip key={q} label={q} icon="time-outline" onPress={() => onSearch(q)} onRemove={() => forgetSearch(q)} />
            ))}
          </View>
        </Section>
      ) : null}
      {topics.length ? (
        <Section title="Popular topics">
          <View className="flex-row flex-wrap gap-2 px-4">
            {topics.map((t) => (
              <SuggestionChip key={t} label={t} icon="sparkles-outline" onPress={() => onSearch(t)} />
            ))}
          </View>
        </Section>
      ) : null}
      {jumpBackIn.length ? (
        <Section title="Jump back in">
          <View className="gap-3">
            {jumpBackIn.map((course) => (
              <CourseRow key={course.id} course={course} onPress={onOpen} />
            ))}
          </View>
        </Section>
      ) : null}
    </View>
  );
}
