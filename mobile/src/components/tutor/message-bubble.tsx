/** One chat row: the student's bubble (with sending/failed states) or the tutor's reply with its lesson sources. */
import { memo } from "react";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Icon } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Source } from "@/lib/types";
import { useColors } from "@/theme/colors";
import { Pressable, Text, View } from "@/tw";
import type { LocalMessage } from "./chat-state";
import { MarkdownText } from "./markdown-text";
import { courseRoute, lessonRoute } from "./session";

function SourceChips({ sources }: { sources: Source[] }) {
  const c = useColors();
  if (!sources.length) return null;
  return (
    <View className="mt-3 gap-2">
      <Text className="type-caption text-muted">From your lessons</Text>
      <View className="flex-row flex-wrap gap-2">
        {sources.map((s, i) => {
          const href = s.lesson_id ? lessonRoute(s.lesson_id) : s.course_slug ? courseRoute(s.course_slug) : null;
          if (!href)
            return (
              <View key={i} className="min-h-9 flex-row items-center gap-1.5 rounded-full bg-muted-bg px-3">
                <Icon name="book-outline" size={14} />
                <Text className="text-[13px] text-ink" numberOfLines={1}>
                  {s.title}
                </Text>
              </View>
            );
          return (
            <Pressable
              key={i}
              onPress={() => {
                Haptics.selectionAsync().catch(() => undefined);
                router.push(href);
              }}
              hitSlop={{ top: 6, bottom: 6 }}
              accessibilityRole="link"
              accessibilityLabel={`${s.lesson_id ? "Open lesson" : "Open course"}: ${s.title}`}
              className="min-h-9 max-w-full flex-row items-center gap-1.5 rounded-full bg-brand-50 px-3 active:opacity-70"
            >
              <Icon name="book-outline" size={14} color={c.brand700} />
              <Text className="shrink text-[13px] font-semibold text-brand-700" numberOfLines={1}>
                {s.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function UserBubble({ message: m, onRetry, onDiscard }: { message: LocalMessage; onRetry: () => void; onDiscard: () => void }) {
  const c = useColors();
  if (m.status === "failed") {
    return (
      <View className="mb-4 items-end gap-1.5">
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={`Not sent: ${m.content}. Double tap to try again.`}
          className="max-w-[85%] rounded-[20px] rounded-br-md bg-danger-50 px-4 py-2.5 active:opacity-80"
        >
          <Text className="type-body text-ink">{m.content}</Text>
        </Pressable>
        <View className="flex-row items-center gap-1">
          <Icon name="alert-circle" size={16} color={c.danger} />
          <Text className="max-w-[70%] text-[13px] text-danger" accessibilityLiveRegion="polite">
            {m.error ?? "Not sent."} Tap to retry.
          </Text>
          <Pressable
            onPress={onDiscard}
            accessibilityRole="button"
            accessibilityLabel="Remove this unsent message"
            className="h-11 w-11 items-center justify-center rounded-full active:bg-muted-bg"
          >
            <Icon name="close" size={18} />
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <View className="mb-4 items-end">
      <View className={cn("max-w-[85%] rounded-[20px] rounded-br-md bg-ink px-4 py-2.5", m.status === "sending" && "opacity-70")}>
        <Text selectable className="type-body text-surface">
          {m.content}
        </Text>
      </View>
      {m.status === "sending" ? <Text className="mt-1 text-[13px] text-muted">Sending…</Text> : null}
    </View>
  );
}

export const MessageBubble = memo(function MessageBubble({
  message,
  onRetry,
  onDiscard,
}: {
  message: LocalMessage;
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
}) {
  if (message.role === "user") return <UserBubble message={message} onRetry={() => onRetry(message.id)} onDiscard={() => onDiscard(message.id)} />;
  return (
    <View className="mb-5 px-1">
      <MarkdownText source={message.content} />
      <SourceChips sources={message.sources} />
    </View>
  );
});
