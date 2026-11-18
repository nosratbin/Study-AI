/**
 * AI Tutor: a full-screen chat. Replies come back whole from POST /api/ai/chat (no streaming), so the student's
 * message is appended optimistically and a typing indicator shows until the reply lands. Optional route params
 * `lessonId` and `lessonTitle` (from the lesson reader's "Ask tutor") send the lesson as context.
 */
import { useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import { AccessibilityInfo, FlatList, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ErrorState, Icon, type IconName } from "@/components/ui";
import { PressableScale, Skeleton } from "@/components/motion";
import { chatReducer, initialChatState, localMessageId, newestFirst, type LocalMessage } from "@/components/tutor/chat-state";
import { Composer } from "@/components/tutor/composer";
import { LanguageSwitch } from "@/components/tutor/language-switch";
import { plainText } from "@/components/tutor/markdown";
import { MessageBubble } from "@/components/tutor/message-bubble";
import { suggestedPrompts } from "@/components/tutor/prompts";
import { aiKeys, HISTORY_ROUTE, onTutorEvent, quizRoute, type TutorEvent } from "@/components/tutor/session";
import { TypingIndicator } from "@/components/tutor/typing-indicator";
import { api, ApiError, toApiError } from "@/lib/api";
import { useApiQuery } from "@/lib/query";
import type { AIStatus, ChatLanguage, ChatMessage, ChatResponse, Conversation, StudentProfile } from "@/lib/types";
import { useColors } from "@/theme/colors";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from "@/tw";

function HeaderButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-11 w-11 items-center justify-center rounded-full active:bg-muted-bg"
    >
      <Icon name={icon} size={22} color={c.ink} />
    </Pressable>
  );
}

function LoadingThread() {
  return (
    <View className="flex-1 justify-end gap-4 px-4 pb-4" accessibilityLabel="Loading conversation">
      <Skeleton className="h-12 w-2/3 self-end rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-10 w-1/2 self-end rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
    </View>
  );
}

function Unavailable() {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-8" accessibilityRole="summary">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-muted-bg">
        <Icon name="moon-outline" size={26} />
      </View>
      <Text className="text-center type-heading text-ink">The AI Tutor is resting</Text>
      <Text className="text-center text-[15px] leading-[24px] text-muted">
        It hasn&apos;t been switched on for this server yet. Your lessons and assessments still work as usual.
      </Text>
    </View>
  );
}

function EmptyChat({
  prompts,
  lessonTitle,
  onPick,
  onQuiz,
}: {
  prompts: string[];
  lessonTitle: string | null;
  onPick: (p: string) => void;
  onQuiz: () => void;
}) {
  const c = useColors();
  return (
    <ScrollView className="flex-1" contentContainerClassName="flex-grow justify-end gap-3 px-4 pb-4 pt-6" keyboardShouldPersistTaps="handled">
      <View className="mb-3 gap-2">
        <View className="mb-1 h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
          <Icon name="sparkles" size={22} color={c.brand500} />
        </View>
        <Text className="type-title text-ink" accessibilityRole="header">
          {lessonTitle ? "Questions about this lesson?" : "What do you want to learn today?"}
        </Text>
        <Text className="type-body text-muted">Ask in Bangla or English. I&apos;ll explain step by step, at your level.</Text>
      </View>
      {prompts.map((p) => (
        <PressableScale key={p} onPress={() => onPick(p)} accessibilityLabel={`Ask: ${p}`} className="min-h-12 flex-row items-center gap-3 rounded-xl bg-card px-4 py-3">
          <Text className="type-callout flex-1 text-ink">{p}</Text>
          <Icon name="arrow-up-outline" size={16} color={c.subtle} />
        </PressableScale>
      ))}
      <PressableScale onPress={onQuiz} accessibilityLabel="Start a practice quiz" className="min-h-12 flex-row items-center gap-2 rounded-2xl px-4 py-3">
        <Icon name="help-buoy-outline" size={20} color={c.brand700} />
        <Text className="type-callout flex-1 font-semibold text-brand-700">Or test yourself with a practice quiz</Text>
      </PressableScale>
      <Text className="text-[13px] leading-[20px] text-muted">AI can make mistakes. Check important facts with your lesson or teacher.</Text>
    </ScrollView>
  );
}

export default function TutorScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ lessonId?: string; lessonTitle?: string }>();
  const lesson = params.lessonId ? { id: params.lessonId, title: params.lessonTitle || "This lesson" } : null;

  const status = useApiQuery<AIStatus>(aiKeys.status, "/ai/status");
  // Only used to pick level-appropriate starter prompts; non-students (404) simply get the general ones.
  const profile = useApiQuery<StudentProfile>(["profile"], "/students/profile", { staleTime: 5 * 60_000 });

  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<ChatLanguage>("auto");

  const navigation = useNavigation();
  // The local id of the one request in flight. Set synchronously before the POST, so two taps in one frame
  // (a prompt chip plus the send button) can't both send; render-time `state.pending` would still read false.
  const inFlight = useRef<string | null>(null);

  const configured = status.data?.configured ?? true;
  const remaining = status.data ? Math.max(0, status.data.daily_limit - status.data.used_today) : null;

  /** Drop the lesson context. Uses this screen's navigation, so it works while the history screen is on top. */
  function clearLesson() {
    if (params.lessonId || params.lessonTitle) navigation.setParams({ lessonId: undefined, lessonTitle: undefined } as never);
  }

  /** Leaving the current conversation ends the lesson context, and a pending reply is dropped (the epoch guard). */
  function newChat() {
    inFlight.current = null;
    clearLesson();
    dispatch({ type: "new_chat" });
  }

  async function openConversation(id: string) {
    inFlight.current = null;
    clearLesson();
    dispatch({ type: "open", conversationId: id });
    try {
      const messages = await qc.fetchQuery({
        queryKey: aiKeys.messages(id),
        queryFn: ({ signal }) => api<ChatMessage[]>(`/ai/conversations/${encodeURIComponent(id)}/messages`, { signal }),
      });
      dispatch({ type: "loaded", conversationId: id, messages });
    } catch (e) {
      dispatch({ type: "load_failed", conversationId: id, error: toApiError(e).message });
    }
  }

  // Events from the conversation list (a pushed screen over this tab).
  const onEvent = useEffectEvent((e: TutorEvent) => {
    if (e.type === "open") {
      if (e.conversationId) openConversation(e.conversationId);
      else newChat();
    } else if (e.conversationId === state.conversationId) {
      newChat();
    }
  });
  useEffect(() => onTutorEvent((e) => onEvent(e)), []);

  async function deliver(localId: string, content: string) {
    const epoch = state.epoch;
    try {
      const res = await api<ChatResponse>("/ai/chat", {
        method: "POST",
        body: { message: content, conversation_id: state.conversationId, language, lesson_id: lesson?.id ?? null },
      });
      const current = inFlight.current === localId;
      if (current) inFlight.current = null;
      dispatch({ type: "success", epoch, localId, response: res });
      qc.setQueryData<Conversation[]>(aiKeys.conversations, (list) => (list ? [res.conversation, ...list.filter((x) => x.id !== res.conversation.id)] : list));
      qc.setQueryData<AIStatus>(aiKeys.status, (s) => (s ? { ...s, used_today: s.used_today + 1 } : s));
      qc.removeQueries({ queryKey: aiKeys.messages(res.conversation.id) });
      // One announcement per new reply, on both platforms (TalkBack may skip a live region that only just mounted).
      // Skipped when the student has already moved to another conversation.
      if (current) AccessibilityInfo.announceForAccessibility(`Tutor replied. ${plainText(res.assistant_message.content).slice(0, 120)}`);
    } catch (e) {
      if (inFlight.current === localId) inFlight.current = null;
      const err = toApiError(e);
      dispatch({ type: "failure", epoch, localId, error: err.message });
      if (err instanceof ApiError && err.code === "ai_daily_limit") qc.invalidateQueries({ queryKey: aiKeys.status });
    }
  }

  function send(text: string) {
    const content = text.trim();
    if (!content || inFlight.current || state.pending || state.loading || state.loadError || !configured) return;
    const localId = localMessageId();
    inFlight.current = localId;
    dispatch({ type: "send", localId, content, createdAt: new Date().toISOString() });
    setInput("");
    deliver(localId, content);
  }

  function retry(id: string) {
    const failed = state.messages.find((m) => m.id === id && m.status === "failed");
    if (!failed || inFlight.current || state.pending || !configured) return;
    inFlight.current = id;
    dispatch({ type: "retry", localId: id, createdAt: new Date().toISOString() });
    deliver(id, failed.content);
  }

  function startQuiz() {
    router.push(quizRoute(lesson?.title ?? "", language));
  }

  const prompts = suggestedPrompts(profile.data?.education_level, lesson?.title);
  const isEmpty = state.messages.length === 0 && !state.pending;

  let body: React.ReactNode;
  if (status.data && !configured) body = <Unavailable />;
  else if (state.loading) body = <LoadingThread />;
  else if (state.loadError && state.conversationId) {
    const id = state.conversationId;
    body = (
      <View className="flex-1 justify-center px-4">
        <ErrorState error={new Error(state.loadError)} onRetry={() => openConversation(id)} />
      </View>
    );
  } else if (isEmpty) body = <EmptyChat prompts={prompts} lessonTitle={lesson?.title ?? null} onPick={send} onQuiz={startQuiz} />;
  else
    body = (
      <FlatList<LocalMessage>
        inverted
        data={newestFirst(state.messages)}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} onRetry={retry} onDiscard={(id) => dispatch({ type: "discard", localId: id })} />
        )}
        // Inverted: the header sits at the bottom, under the newest message.
        ListHeaderComponent={state.pending ? <TypingIndicator /> : undefined}
        ListFooterComponent={
          <Text className="type-caption px-6 pb-4 text-center text-muted">AI can make mistakes. Check important facts with your lesson or teacher.</Text>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        style={{ flex: 1 }}
      />
    );

  return (
    // Android is edge-to-edge, so the window no longer resizes for the keyboard: "padding" keeps the composer above it.
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-surface">
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.surface }}>
        <View className="gap-3 px-2 pb-3 pt-2">
          <View className="flex-row items-center">
            <View className="flex-1 gap-0.5 pl-2">
              <Text className="type-title text-ink" accessibilityRole="header">
                AI Tutor
              </Text>
              {remaining !== null && configured ? (
                <Text className="type-caption text-muted">
                  {remaining === 0 ? "No messages left today" : `${remaining} message${remaining === 1 ? "" : "s"} left today`}
                </Text>
              ) : null}
            </View>
            <HeaderButton icon="help-buoy-outline" label="Practice quiz" onPress={startQuiz} />
            <HeaderButton icon="create-outline" label="New chat" onPress={newChat} />
            <HeaderButton icon="time-outline" label="Conversation history" onPress={() => router.push(HISTORY_ROUTE)} />
          </View>
          <View className="px-2">
            <LanguageSwitch value={language} onChange={setLanguage} />
          </View>
          {lesson ? (
            <View className="mx-2 min-h-10 flex-row items-center gap-2 self-start rounded-full bg-brand-50 pl-3">
              <Icon name="book-outline" size={16} color={c.brand700} />
              <Text className="max-w-[260px] text-[13px] text-brand-700" numberOfLines={1}>
                About: <Text className="font-semibold text-brand-700">{lesson.title}</Text>
              </Text>
              <Pressable
                onPress={clearLesson}
                accessibilityRole="button"
                accessibilityLabel={`Stop asking about ${lesson.title}`}
                className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
              >
                <Icon name="close" size={18} color={c.brand700} />
              </Pressable>
            </View>
          ) : null}
        </View>

        {body}

        <Composer
          value={input}
          onChangeText={setInput}
          onSend={() => send(input)}
          pending={state.pending}
          disabled={!configured || state.loading || !!state.loadError}
          placeholder={configured ? (lesson ? "Ask about this lesson…" : "Ask about AI, coding or a lesson…") : "The AI Tutor isn't available yet"}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
