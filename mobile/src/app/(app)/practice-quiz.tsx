/**
 * Practice quiz, presented as a modal from the AI Tutor. Product rule: AI-generated questions are practice only.
 * Answers are checked locally for instant feedback; nothing is sent back, stored or shown as a grade.
 */
import { useReducer, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { FadeIn, ReduceMotion } from "react-native-reanimated";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Badge, Button, Chip, FormError, Icon, Input, ProgressBar } from "@/components/ui";
import { celebrate, PressableScale, Skeleton } from "@/components/motion";
import { LanguageSwitch } from "@/components/tutor/language-switch";
import { isCorrect, practiceMessage, quizReducer, startQuiz, tallyPractice } from "@/components/tutor/quiz-state";
import { aiKeys } from "@/components/tutor/session";
import { api, toApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useApiQuery } from "@/lib/query";
import type { AIStatus, ChatLanguage, PracticeQuestion, Quiz } from "@/lib/types";
import { useColors } from "@/theme/colors";
import { AnimatedView, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from "@/tw";

const COUNTS = [3, 5, 10] as const;
const LETTERS = ["A", "B", "C", "D"];
const isLanguage = (v: unknown): v is ChatLanguage => v === "auto" || v === "en" || v === "bn";

function TopBar({ right }: { right?: React.ReactNode }) {
  const c = useColors();
  return (
    <View className="flex-row items-center gap-2 px-2 pb-1">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Close practice quiz"
        className="h-12 w-12 items-center justify-center rounded-full active:bg-muted-bg"
      >
        <Icon name="close" size={24} color={c.ink} />
      </Pressable>
      <View className="flex-1">{right}</View>
      <Badge tone="brand">Practice</Badge>
      <View className="w-2" />
    </View>
  );
}

/* ---------- Setup ---------- */

function Setup({
  initialTopic,
  initialLanguage,
  configured,
  onReady,
}: {
  initialTopic: string;
  initialLanguage: ChatLanguage;
  configured: boolean;
  onReady: (quiz: Quiz) => void;
}) {
  const [topic, setTopic] = useState(initialTopic);
  const [count, setCount] = useState<number>(5);
  const [language, setLanguage] = useState<ChatLanguage>(initialLanguage);
  const make = useMutation({
    mutationFn: () => api<Quiz>("/ai/quiz", { method: "POST", body: { topic: topic.trim(), count, language } }),
    onSuccess: onReady,
  });
  const tooShort = topic.trim().length < 2;

  return (
    <>
      <TopBar />
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-4 pb-6 pt-2" keyboardShouldPersistTaps="handled">
        <View className="gap-2">
          <Text className="type-display text-ink" accessibilityRole="header">
            Practice quiz
          </Text>
          <Text className="text-[15px] leading-[24px] text-muted">
            Quick AI-written questions to test yourself. Your answers stay on this phone: nothing is saved or graded.
          </Text>
        </View>
        <Input
          label="Topic"
          value={topic}
          onChangeText={setTopic}
          placeholder="For example: Python loops"
          maxLength={200}
          autoCapitalize="sentences"
          returnKeyType="done"
          editable={!make.isPending}
        />
        <View className="gap-2">
          <Text className="text-sm font-medium text-ink">How many questions</Text>
          <View className="flex-row gap-2">
            {COUNTS.map((n) => (
              <Chip key={n} label={`${n}`} selected={count === n} onPress={() => setCount(n)} />
            ))}
          </View>
        </View>
        <View className="gap-2">
          <Text className="text-sm font-medium text-ink">Language</Text>
          <LanguageSwitch value={language} onChange={setLanguage} />
        </View>
        {make.isPending ? (
          <View className="gap-3 rounded-2xl bg-card p-5" accessibilityLabel="Writing your practice questions" accessibilityLiveRegion="polite">
            <Text className="text-[13px] text-muted">Writing your questions…</Text>
            <Skeleton className="h-5 w-4/5 rounded-lg" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </View>
        ) : null}
        <FormError message={make.isError ? toApiError(make.error).message : !configured ? "The AI Tutor isn't switched on for this server yet." : null} />
      </ScrollView>
      <View className="px-4 pb-2 pt-2">
        <Button onPress={() => make.mutate()} loading={make.isPending} disabled={tooShort || !configured} icon="sparkles">
          Make my quiz
        </Button>
      </View>
    </>
  );
}

/* ---------- One question ---------- */

function OptionRow({
  index,
  text,
  state,
  onPress,
}: {
  index: number;
  text: string;
  state: "idle" | "correct" | "wrong" | "dim";
  onPress: () => void;
}) {
  const c = useColors();
  const answered = state !== "idle";
  const verdict = state === "correct" ? ", correct answer" : state === "wrong" ? ", your answer, not correct" : "";
  return (
    <PressableScale
      onPress={onPress}
      disabled={answered}
      haptic={false}
      accessibilityLabel={`Option ${LETTERS[index]}: ${text}${verdict}`}
      accessibilityState={{ disabled: answered }}
      className={cn(
        "min-h-14 flex-row items-center gap-3 rounded-2xl px-4 py-3",
        state === "correct" ? "bg-success-50" : state === "wrong" ? "bg-danger-50" : "bg-card",
        state === "dim" && "opacity-60",
      )}
    >
      <View
        className={cn(
          "h-8 w-8 items-center justify-center rounded-full",
          state === "correct" ? "bg-success-solid" : state === "wrong" ? "bg-danger-solid" : "bg-muted-bg",
        )}
      >
        {state === "correct" ? (
          <Icon name="checkmark" size={18} color="#fff" />
        ) : state === "wrong" ? (
          <Icon name="close" size={18} color="#fff" />
        ) : (
          <Text className="text-[13px] font-semibold text-muted">{LETTERS[index]}</Text>
        )}
      </View>
      <Text className="flex-1 text-[15px] leading-[24px] text-ink">{text}</Text>
      {state === "idle" ? <Icon name="chevron-forward" size={16} color={c.line} /> : null}
    </PressableScale>
  );
}

function QuestionView({ q, answer, onAnswer }: { q: PracticeQuestion; answer: number | null; onAnswer: (i: number) => void }) {
  const answered = answer !== null;
  const right = isCorrect(q, answer);
  return (
    <View className="gap-4">
      <Text selectable className="text-[17px] font-semibold leading-[28px] text-ink" accessibilityRole="header">
        {q.prompt}
      </Text>
      <View className="gap-2.5" accessibilityRole="radiogroup">
        {q.options.map((opt, i) => (
          <OptionRow
            key={i}
            index={i}
            text={opt}
            state={!answered ? "idle" : i === q.correct_option ? "correct" : i === answer ? "wrong" : "dim"}
            onPress={() => onAnswer(i)}
          />
        ))}
      </View>
      {answered ? (
        <View className="gap-1.5 rounded-2xl bg-card p-4" accessibilityLiveRegion="polite">
          <Text className={cn("text-[15px] font-semibold", right ? "text-success" : "text-danger")}>
            {right ? "That's right." : `Not quite. The answer is ${LETTERS[q.correct_option]}.`}
          </Text>
          {q.explanation ? (
            <Text selectable className="text-[15px] leading-[24px] text-ink">
              {q.explanation}
            </Text>
          ) : null}
          <Text className="text-[13px] leading-[20px] text-muted">Answers are AI-made and may contain mistakes.</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ---------- Run + summary ---------- */

function QuizRun({ quiz, onAnother }: { quiz: Quiz; onAnother: () => void }) {
  const { questions } = quiz;
  const [progress, dispatch] = useReducer(quizReducer(questions), questions, startQuiz);
  const current = questions[progress.index];
  const answer = progress.answers[progress.index] ?? null;
  const last = progress.index + 1 >= questions.length;

  function onAnswer(i: number) {
    if (answer !== null) return;
    Haptics.notificationAsync(i === current.correct_option ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(
      () => undefined,
    );
    dispatch({ type: "answer", option: i });
  }

  function onNext() {
    if (last) {
      const { right, total } = tallyPractice(questions, progress.answers);
      if (right === total) celebrate();
    }
    dispatch({ type: "next" });
  }

  if (progress.finished) {
    const { right, total, review } = tallyPractice(questions, progress.answers);
    return (
      <>
        <TopBar />
        <ScrollView className="flex-1" contentContainerClassName="gap-6 px-4 pb-6 pt-2">
          <View className="gap-2" accessibilityLiveRegion="polite">
            <Text className="text-[13px] font-semibold text-brand-700">{quiz.topic}</Text>
            <Text className="type-display text-ink" accessibilityRole="header">
              You got {right} of {total}
            </Text>
            <Text className="text-[15px] leading-[24px] text-ink">{practiceMessage(right, total)}</Text>
          </View>
          <View className="flex-row gap-3 rounded-2xl bg-muted-bg p-4">
            <Icon name="information-circle-outline" size={20} />
            <Text className="flex-1 text-[13px] leading-[20px] text-muted">
              This was practice. It isn&apos;t saved, scored or shown to anyone. {quiz.notice}
            </Text>
          </View>
          {review.length ? (
            <View className="gap-3">
              <Text className="text-[17px] font-semibold text-ink" accessibilityRole="header">
                Worth another look
              </Text>
              {review.map((i) => {
                const q = questions[i];
                const yours = progress.answers[i];
                return (
                  <View key={i} className="gap-2 rounded-2xl bg-card p-4">
                    <Text selectable className="text-[15px] font-semibold leading-[24px] text-ink">
                      {q.prompt}
                    </Text>
                    {yours !== null && yours !== undefined ? (
                      <Text className="text-[13px] leading-[20px] text-danger">Your answer: {q.options[yours]}</Text>
                    ) : null}
                    <Text className="text-[13px] leading-[20px] text-success">Answer: {q.options[q.correct_option]}</Text>
                    {q.explanation ? (
                      <Text selectable className="text-[15px] leading-[24px] text-ink">
                        {q.explanation}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}
        </ScrollView>
        <View className="flex-row gap-3 px-4 pb-2 pt-2">
          <Button variant="secondary" onPress={onAnother} className="flex-1">
            New topic
          </Button>
          <Button onPress={() => router.back()} className="flex-1">
            Done
          </Button>
        </View>
      </>
    );
  }

  return (
    <>
      <TopBar
        right={
          <View className="gap-1.5 pr-2">
            <Text className="text-[13px] text-muted">
              Question {progress.index + 1} of {questions.length}
            </Text>
            <ProgressBar value={(progress.index / questions.length) * 100} label="Quiz progress" />
          </View>
        }
      />
      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-6 pt-4">
        <AnimatedView key={progress.index} entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}>
          <QuestionView q={current} answer={answer} onAnswer={onAnswer} />
        </AnimatedView>
      </ScrollView>
      <View className="px-4 pb-2 pt-2">
        <Button onPress={onNext} disabled={answer === null} icon={last ? "flag-outline" : "arrow-forward"}>
          {last ? "See summary" : "Next question"}
        </Button>
      </View>
    </>
  );
}

export default function PracticeQuizScreen() {
  const c = useColors();
  const params = useLocalSearchParams<{ topic?: string; language?: string }>();
  const status = useApiQuery<AIStatus>(aiKeys.status, "/ai/status");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [round, setRound] = useState(0);

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-surface">
      <Stack.Screen options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }} />
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: c.surface }}>
        {quiz ? (
          <QuizRun
            key={round}
            quiz={quiz}
            onAnother={() => {
              setQuiz(null);
              setRound((r) => r + 1);
            }}
          />
        ) : (
          <Setup
            key={round}
            initialTopic={round === 0 ? (params.topic ?? "") : ""}
            initialLanguage={isLanguage(params.language) ? params.language : "auto"}
            configured={status.data?.configured ?? true}
            onReady={setQuiz}
          />
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
