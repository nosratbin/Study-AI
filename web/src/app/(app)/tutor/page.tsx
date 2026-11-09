"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import clsx from "clsx";
import { BookOpen, Bot, Info, Languages, ListChecks, MessageSquarePlus, MessagesSquare, Send, Trash2, X } from "lucide-react";
import { Alert, Badge, Button, Card, Spinner } from "@/components/ui";
import { BorderBeam } from "@/components/vengeance/border-beam";
import { Markdown } from "@/components/learning/markdown";
import { PracticeQuiz } from "@/components/learning/practice-quiz";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { AIStatus, ChatLanguage, ChatMessage, ChatResponse, Conversation, Lesson } from "@/lib/types";

const LANGS: { value: ChatLanguage; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "en", label: "English" },
  { value: "bn", label: "বাংলা" },
];

const STARTERS = [
  "What is machine learning? Explain with a simple example.",
  "Python-এ for loop কীভাবে কাজ করে? ধাপে ধাপে বুঝিয়ে দাও।",
  "What's the difference between AI, ML and deep learning?",
  "How do I start learning AI as a beginner?",
];

type Mode = "chat" | "quiz";

export default function TutorPage() {
  const params = useSearchParams();
  const router = useRouter();
  const lessonParam = params.get("lesson");

  const status = useApi<AIStatus>("/ai/status");
  const convs = useApi<Conversation[]>("/ai/conversations");
  const lessonCtx = useApi<Lesson>(lessonParam ? `/lessons/${encodeURIComponent(lessonParam)}` : null);

  const [mode, setMode] = useState<Mode>("chat");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<ChatLanguage>("auto");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingSeq = useRef(0);

  const lesson = lessonParam ? lessonCtx.data : null;
  const configured = status.data?.configured ?? true;
  const remaining = status.data ? Math.max(0, status.data.daily_limit - status.data.used_today) : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const openConversation = useCallback(async (id: string) => {
    setActiveId(id);
    setShowHistory(false);
    setError(null);
    setLoadingMsgs(true);
    try {
      setMessages(await api<ChatMessage[]>(`/ai/conversations/${id}/messages`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load this conversation.");
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setError(null);
    setShowHistory(false);
    setMode("chat");
    inputRef.current?.focus();
  }

  function clearLesson() {
    router.replace("/tutor");
  }

  async function deleteConversation(id: string) {
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;
    try {
      await api(`/ai/conversations/${id}`, { method: "DELETE" });
      convs.setData((list) => (list ?? []).filter((c) => c.id !== id));
      if (id === activeId) newChat();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete the conversation.");
    }
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    setError(null);
    setSending(true);
    setInput("");
    pendingSeq.current += 1;
    const pending: ChatMessage = { id: `pending-${pendingSeq.current}`, role: "user", content: message, sources: [], created_at: "" };
    setMessages((m) => [...m, pending]);
    try {
      const res = await api<ChatResponse>("/ai/chat", {
        method: "POST",
        body: { message, conversation_id: activeId, language, lesson_id: lesson?.id ?? null },
      });
      setMessages((m) => [...m.filter((x) => x.id !== pending.id), res.user_message, res.assistant_message]);
      setActiveId(res.conversation.id);
      convs.setData((list) => [res.conversation, ...(list ?? []).filter((c) => c.id !== res.conversation.id)]);
      status.setData((s) => (s ? { ...s, used_today: s.used_today + 1 } : s));
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== pending.id));
      setInput(message);
      setError(e instanceof ApiError ? e.message : "The tutor could not answer. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  }

  const history = (
    <div className="flex h-full flex-col">
      <Button variant="secondary" size="sm" onClick={newChat} className="w-full">
        <MessageSquarePlus className="size-4" aria-hidden /> New chat
      </Button>
      <p className="mt-4 mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">History</p>
      {convs.error ? (
        <p className="px-1 text-sm text-danger">{convs.error.message}</p>
      ) : !convs.data ? (
        <Spinner label="Loading…" />
      ) : convs.data.length === 0 ? (
        <p className="px-1 text-sm text-muted">Your conversations will appear here.</p>
      ) : (
        <ul className="-mx-1 flex-1 space-y-0.5 overflow-y-auto">
          {convs.data.map((c) => (
            <li key={c.id} className="group flex items-center">
              <button
                onClick={() => openConversation(c.id)}
                className={clsx(
                  "min-w-0 flex-1 truncate rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  c.id === activeId ? "bg-brand-50 font-medium text-brand-700" : "hover:bg-surface",
                )}
                aria-current={c.id === activeId ? "true" : undefined}
                lang={c.language}
              >
                {c.title}
              </button>
              <button
                onClick={() => deleteConversation(c.id)}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-muted opacity-100 hover:bg-danger-50 hover:text-danger lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100"
                aria-label={`Delete conversation: ${c.title}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-12.5rem)] min-h-[480px] flex-col gap-4 lg:h-[calc(100dvh-4.5rem)]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-brand-500 text-white" aria-hidden>
            <Bot className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">AI Tutor</h1>
            <p className="text-xs text-muted">
              Bangla or English · explained for your level
              {remaining !== null && configured && <> · {remaining} messages left today</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="Tutor mode" className="flex rounded-xl bg-surface p-1">
            {([["chat", "Chat", MessagesSquare], ["quiz", "Practice quiz", ListChecks]] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                role="tab"
                aria-selected={mode === value}
                onClick={() => setMode(value)}
                className={clsx("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium", mode === value ? "bg-white text-brand-700 shadow-sm" : "text-muted hover:text-ink")}
              >
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowHistory((v) => !v)} className="grid size-10 place-items-center rounded-xl border border-line bg-white text-muted lg:hidden" aria-label="Conversation history" aria-expanded={showHistory}>
            <MessagesSquare className="size-5" aria-hidden />
          </button>
        </div>
      </header>

      {status.data && !configured && (
        <Alert>The AI Tutor is not configured on this server yet (no Gemini API key). Lessons and assessments still work.</Alert>
      )}

      <div className="relative flex min-h-0 flex-1 gap-4">
        <aside className="hidden w-60 shrink-0 lg:block">{history}</aside>
        {showHistory && (
          <div className="absolute inset-0 z-20 rounded-card border border-line bg-white p-4 shadow-lg lg:hidden">
            <button onClick={() => setShowHistory(false)} className="absolute top-3 right-3 grid size-8 place-items-center rounded-lg text-muted hover:bg-surface" aria-label="Close history">
              <X className="size-4" aria-hidden />
            </button>
            <div className="h-full pt-8">{history}</div>
          </div>
        )}

        {mode === "quiz" ? (
          <Card className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
            <PracticeQuiz disabled={!configured} defaultTopic={lesson?.title ?? ""} />
          </Card>
        ) : (
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {lesson && (
              <div className="flex items-center gap-2 border-b border-line bg-brand-50/60 px-4 py-2 text-sm">
                <BookOpen className="size-4 shrink-0 text-brand-500" aria-hidden />
                <span className="min-w-0 flex-1 truncate">
                  Asking about: <Link href={`/lessons/${lesson.id}`} className="font-medium hover:text-brand-600">{lesson.title}</Link>
                </span>
                <button onClick={clearLesson} className="grid size-7 place-items-center rounded-md text-muted hover:bg-white" aria-label="Stop using this lesson as context">
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
              {loadingMsgs ? (
                <Spinner label="Loading conversation…" />
              ) : messages.length === 0 && !sending ? (
                <div className="relative mx-auto mt-4 max-w-xl overflow-hidden rounded-card border border-line p-6 text-center">
                  <BorderBeam size={120} duration={10} colorFrom="#f97316" colorTo="#fdba74" />
                  <Bot className="mx-auto size-10 text-brand-500" aria-hidden />
                  <h2 className="mt-3 font-semibold">{lesson ? `Questions about “${lesson.title}”?` : "What do you want to learn today?"}</h2>
                  <p className="mt-1 text-sm text-muted">Ask in Bangla or English. I explain step by step, at your level.</p>
                  <div className="mt-5 grid gap-2 text-left sm:grid-cols-2">
                    {(lesson ? [`Explain “${lesson.title}” in simple words.`, "Give me an example from everyday life.", "এই পাঠের মূল বিষয়গুলো বাংলায় বুঝিয়ে দাও।", "Quiz me with 3 quick questions on this."] : STARTERS).map((s) => (
                      <button key={s} onClick={() => send(s)} disabled={!configured} className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm transition-colors hover:border-brand-200 hover:bg-brand-50 disabled:opacity-50">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <ol className="mx-auto max-w-3xl space-y-5">
                  {messages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                  ))}
                  {sending && (
                    <li className="flex gap-3" role="status">
                      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600" aria-hidden>
                        <Bot className="size-4" />
                      </div>
                      <div className="flex items-center gap-1 rounded-2xl bg-surface px-4 py-3">
                        <span className="sr-only">The tutor is thinking…</span>
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </li>
                  )}
                </ol>
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={onSubmit} className="border-t border-line p-3 sm:p-4">
              {error && (
                <div className="mb-3">
                  <Alert>{error}</Alert>
                </div>
              )}
              <div className="flex items-end gap-2">
                <label htmlFor="tutor-input" className="sr-only">
                  Your question
                </label>
                <textarea
                  id="tutor-input"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                  maxLength={4000}
                  disabled={!configured}
                  placeholder={configured ? "Ask anything about AI, coding or your lesson…" : "AI Tutor is not configured yet"}
                  className="max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] placeholder:text-muted/70 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none disabled:bg-surface"
                />
                <Button type="submit" loading={sending} disabled={!configured || !input.trim()} className="h-11 w-11 shrink-0 px-0" aria-label="Send">
                  {!sending && <Send className="size-4" aria-hidden />}
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Reply language">
                  <Languages className="size-4 text-muted" aria-hidden />
                  {LANGS.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      role="radio"
                      aria-checked={language === l.value}
                      onClick={() => setLanguage(l.value)}
                      className={clsx("rounded-full px-2.5 py-0.5 text-xs font-medium", language === l.value ? "bg-brand-500 text-white" : "bg-surface text-muted hover:text-ink")}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
                <p className="inline-flex items-center gap-1 text-xs text-muted">
                  <Info className="size-3.5" aria-hidden /> AI can make mistakes. Check important facts with your teacher or lesson.
                </p>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message: m }: { message: ChatMessage }) {
  if (m.role === "user")
    return (
      <li className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-500 px-4 py-2.5 text-[15px] whitespace-pre-wrap text-white">{m.content}</div>
      </li>
    );
  return (
    <li className="flex gap-3">
      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600" aria-hidden>
        <Bot className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <Markdown>{m.content}</Markdown>
        {m.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted">From your lessons:</span>
            {m.sources.map((s, i) =>
              s.lesson_id ? (
                <Link key={i} href={`/lessons/${s.lesson_id}`}>
                  <Badge tone="brand" className="hover:bg-brand-100">
                    <BookOpen className="size-3" aria-hidden /> {s.title}
                  </Badge>
                </Link>
              ) : (
                <Badge key={i}>{s.title}</Badge>
              ),
            )}
          </div>
        )}
      </div>
    </li>
  );
}
