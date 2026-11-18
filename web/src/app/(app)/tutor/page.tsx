"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { BookOpen, Bot, Info, Languages, ListChecks, MessageSquare, MessageSquarePlus, MessagesSquare, PanelLeft, Search, Trash2, X } from "lucide-react";
import { Alert, Badge, Spinner } from "@/components/ui";
import { BorderBeam } from "@/components/vengeance/border-beam";
import { Markdown } from "@/components/learning/markdown";
import { PracticeQuiz } from "@/components/learning/practice-quiz";
import { ChatApp } from "@/components/beui/agents/chat-app";
import { Message, MessageAvatar, MessageContent, MessageScroller, MessageTyping } from "@/components/beui/agents/message";
import { MessageBubble, MessageBubbleContent } from "@/components/beui/agents/message-bubble";
import { PromptInput, type PromptModel } from "@/components/beui/agents/prompt-input";
import { StreamingResponse } from "@/components/beui/agents/streaming-response";
import {
  AnimatedSidebar,
  AnimatedSidebarContent,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarTrigger,
} from "@/components/beui/animated-sidebar";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { AIStatus, ChatLanguage, ChatMessage, ChatResponse, Conversation, Lesson } from "@/lib/types";

// The reply language is the composer's "model" picker: same control, our three choices.
const LANGS: PromptModel[] = [
  { value: "auto", label: "Auto language", icon: <Languages /> },
  { value: "en", label: "English", icon: <Languages /> },
  { value: "bn", label: "বাংলা", icon: <Languages /> },
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
  // Only messages sent in this visit pop in; history loads still.
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set());
  const pendingSeq = useRef(0);
  const [query, setQuery] = useState("");
  // Pin to the bottom while loading history and waiting for a reply. When the reply lands, stop following and bring
  // the question to the top instead, so the answer reads from its start rather than its end.
  const [follow, setFollow] = useState(true);
  const anchorRef = useRef<string | null>(null);
  const viewportRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const anchorId = anchorRef.current;
    if (!anchorId) return;
    anchorRef.current = null;
    const viewport = viewportRef.current;
    const el = viewport?.querySelector<HTMLElement>(`[data-msg-id="${anchorId}"]`);
    if (viewport && el) {
      const top = el.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop - 16;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      viewport.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    }
  }, [messages]);

  const lesson = lessonParam ? lessonCtx.data : null;
  const configured = status.data?.configured ?? true;
  const remaining = status.data ? Math.max(0, status.data.daily_limit - status.data.used_today) : null;

  const openConversation = useCallback(async (id: string) => {
    setFollow(true);
    setActiveId(id);
    setMode("chat");
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
    setFollow(true);
    setActiveId(null);
    setMessages([]);
    setError(null);
    setMode("chat");
  }

  async function deleteConversation(c: Conversation) {
    if (!window.confirm(`Delete “${c.title}”? This cannot be undone.`)) return;
    try {
      await api(`/ai/conversations/${c.id}`, { method: "DELETE" });
      convs.setData((list) => (list ?? []).filter((x) => x.id !== c.id));
      if (c.id === activeId) newChat();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete the conversation.");
    }
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    setError(null);
    setSending(true);
    setFollow(true);
    setInput("");
    const pending: ChatMessage = { id: `pending-${++pendingSeq.current}`, role: "user", content: message, sources: [], created_at: "" };
    setMessages((m) => [...m, pending]);
    setFreshIds((s) => new Set(s).add(pending.id));
    try {
      const res = await api<ChatResponse>("/ai/chat", {
        method: "POST",
        body: { message, conversation_id: activeId, language, lesson_id: lesson?.id ?? null },
      });
      // The saved user message replaces the pending one under the same key, so it doesn't pop in twice.
      setMessages((m) => [...m.filter((x) => x.id !== pending.id), { ...res.user_message, id: pending.id }, res.assistant_message]);
      setFreshIds((s) => new Set(s).add(res.assistant_message.id));
      setFollow(false);
      anchorRef.current = pending.id;
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

  const q = query.trim().toLocaleLowerCase();
  const shown = q ? (convs.data ?? []).filter((c) => c.title.toLocaleLowerCase().includes(q)) : (convs.data ?? []);

  const starters = lesson
    ? [`Explain “${lesson.title}” in simple words.`, "Give me an example from everyday life.", "এই পাঠের মূল বিষয়গুলো বাংলায় বুঝিয়ে দাও।", "Quiz me with 3 quick questions on this."]
    : STARTERS;

  return (
    <ChatApp
      sidebarWidth="16rem"
      labels={{ label: "Conversation history", toggle: "Show or hide conversation history", close: "Close conversation history" }}
      className="h-[calc(100dvh-12.5rem)] min-h-[480px] border-line bg-card lg:h-[calc(100dvh-4.5rem)]"
    >
      <AnimatedSidebar collapsible="offcanvas" ariaLabel="Conversation history" className="border-r border-line bg-card md:bg-surface/60">
        <AnimatedSidebarHeader>
          <button
            type="button"
            onClick={newChat}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-line bg-card text-sm font-semibold transition-[background-color,scale] duration-160 ease-(--ease-out) hover:bg-brand-50 active:scale-[0.97] motion-reduce:active:scale-100"
          >
            <MessageSquarePlus className="size-4" aria-hidden /> New chat
          </button>
          <label className="relative block">
            <span className="sr-only">Search conversations</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              className="h-9 w-full rounded-xl border border-line bg-card pr-3 pl-9 text-sm placeholder:text-muted/80 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
            />
          </label>
        </AnimatedSidebarHeader>
        <AnimatedSidebarContent>
          <AnimatedSidebarGroup>
            <AnimatedSidebarGroupLabel>History</AnimatedSidebarGroupLabel>
            {convs.error ? (
              <p className="px-2 text-sm text-danger">{convs.error.message}</p>
            ) : !convs.data ? (
              <div className="px-2">
                <Spinner label="Loading…" />
              </div>
            ) : convs.data.length === 0 ? (
              <p className="px-2 text-sm text-muted">Your conversations will appear here.</p>
            ) : shown.length === 0 ? (
              <p className="px-2 text-sm text-muted">No chats match “{query.trim()}”.</p>
            ) : (
              <AnimatedSidebarMenu>
                {shown.map((c) => (
                  <AnimatedSidebarMenuItem key={c.id} className="group/conv">
                    <AnimatedSidebarMenuButton icon={<MessageSquare />} isActive={c.id === activeId} onSelect={() => openConversation(c.id)} className="pr-9">
                      <span lang={c.language}>{c.title}</span>
                    </AnimatedSidebarMenuButton>
                    <button
                      type="button"
                      onClick={() => deleteConversation(c)}
                      className="absolute top-1/2 right-1 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-danger-50 hover:text-danger focus-visible:opacity-100 lg:opacity-0 lg:group-hover/conv:opacity-100"
                      aria-label={`Delete conversation: ${c.title}`}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </AnimatedSidebarMenuItem>
                ))}
              </AnimatedSidebarMenu>
            )}
          </AnimatedSidebarGroup>
        </AnimatedSidebarContent>
      </AnimatedSidebar>

      <section aria-label="AI Tutor" className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
          <AnimatedSidebarTrigger className="size-9 text-muted hover:bg-surface hover:text-ink">
            <PanelLeft className="size-4" aria-hidden />
          </AnimatedSidebarTrigger>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-base font-bold tracking-tight">
              <Bot className="size-4 text-brand-500" aria-hidden /> AI Tutor
            </h1>
            <p className="truncate text-xs text-muted">
              Bangla or English, explained for your level
              {remaining !== null && configured && <> · {remaining} messages left today</>}
            </p>
          </div>
          <div role="group" aria-label="Tutor mode" className="flex rounded-xl bg-surface p-1">
            {([["chat", "Chat", MessagesSquare], ["quiz", "Practice quiz", ListChecks]] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium",
                  mode === value ? "bg-card text-brand-700 shadow-sm" : "text-muted hover:text-ink",
                )}
              >
                <Icon className="size-4" aria-hidden /> <span className="max-sm:sr-only">{label}</span>
              </button>
            ))}
          </div>
        </header>

        {status.data && !configured && (
          <div className="px-4 pt-3">
            <Alert>The AI Tutor is not configured on this server yet (no Gemini API key). Lessons and assessments still work.</Alert>
          </div>
        )}

        {lesson && (
          <div className="flex items-center gap-2 border-b border-line bg-brand-50/60 px-4 py-2 text-sm">
            <BookOpen className="size-4 shrink-0 text-brand-500" aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              Asking about: <Link href={`/lessons/${lesson.id}`} className="font-medium hover:text-brand-600">{lesson.title}</Link>
            </span>
            <button type="button" onClick={() => router.replace("/tutor")} className="grid size-7 place-items-center rounded-md text-muted hover:bg-card" aria-label="Stop using this lesson as context">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        )}

        {mode === "quiz" ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
            <PracticeQuiz disabled={!configured} defaultTopic={lesson?.title ?? ""} />
          </div>
        ) : (
          <>
            {loadingMsgs ? (
              <div className="grid flex-1 place-items-center">
                <Spinner label="Loading conversation…" />
              </div>
            ) : messages.length === 0 && !sending ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
                <div className="relative mx-auto max-w-xl overflow-hidden rounded-card border border-line p-6 text-center">
                  <BorderBeam size={120} duration={10} colorFrom="#f97316" colorTo="#fdba74" />
                  <Bot className="mx-auto size-10 text-brand-500" aria-hidden />
                  <h2 className="mt-3 font-semibold">{lesson ? `Questions about “${lesson.title}”?` : "What do you want to learn today?"}</h2>
                  <p className="mt-1 text-sm text-muted">Ask in Bangla or English. I explain step by step, at your level.</p>
                  <div className="mt-5 grid gap-2 text-left sm:grid-cols-2">
                    {starters.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        disabled={!configured}
                        className="rounded-xl border border-line bg-card px-3 py-2.5 text-sm transition-colors hover:border-brand-200 hover:bg-brand-50 disabled:opacity-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <MessageScroller
                label="Conversation with the AI Tutor"
                busy={sending}
                followOutput={follow}
                viewportRef={viewportRef}
                className="min-h-0 flex-1"
                contentClassName="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 sm:px-6"
              >
                {messages.map((m) => (
                  <ChatRow key={m.id} message={m} fresh={freshIds.has(m.id)} />
                ))}
                {sending && (
                  <Message from="assistant" animateIn>
                    <MessageAvatar className="bg-brand-50 text-brand-600">
                      <Bot />
                    </MessageAvatar>
                    <MessageContent>
                      <MessageTyping label="The tutor is thinking…" className="h-7 text-muted" />
                    </MessageContent>
                  </Message>
                )}
              </MessageScroller>
            )}

            <div className="border-t border-line p-3 sm:p-4">
              {error && (
                <div className="mb-3">
                  <Alert>{error}</Alert>
                </div>
              )}
              <PromptInput
                value={input}
                onValueChange={setInput}
                onSubmit={(text) => send(text)}
                models={LANGS}
                model={language}
                onModelChange={(v) => setLanguage(v as ChatLanguage)}
                loading={sending}
                disabled={!configured}
                maxLength={4000}
                minRows={1}
                placeholder={configured ? "Ask anything about AI, coding or your lesson…" : "AI Tutor is not configured yet"}
                labels={{ label: "Your question", chooseModel: "Reply language", send: "Send", stop: "Waiting for the tutor" }}
                className="border-line bg-card focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/30"
              />
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
                <Info className="size-3.5 shrink-0" aria-hidden /> AI can make mistakes. Check important facts with your teacher or lesson.
              </p>
            </div>
          </>
        )}
      </section>
    </ChatApp>
  );
}

function ChatRow({ message: m, fresh }: { message: ChatMessage; fresh: boolean }) {
  if (m.role === "user")
    return (
      <Message from="user" animateIn={fresh} data-msg-id={m.id}>
        <MessageContent>
          <MessageBubble animateIn={fresh} className="max-w-[85%]">
            <MessageBubbleContent className="text-[15px] whitespace-pre-wrap">{m.content}</MessageBubbleContent>
          </MessageBubble>
        </MessageContent>
      </Message>
    );
  return (
    <Message from="assistant" animateIn={fresh}>
      <MessageAvatar className="bg-brand-50 text-brand-600">
        <Bot />
      </MessageAvatar>
      <MessageContent>
        <StreamingResponse status="complete" copyText={m.content} announce={fresh} contentClassName="text-[15px] text-ink">
          <Markdown>{m.content}</Markdown>
        </StreamingResponse>
        {m.sources.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
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
      </MessageContent>
    </Message>
  );
}
