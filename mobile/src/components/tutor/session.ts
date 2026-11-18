/**
 * Tutor wiring shared by the chat tab, the conversation list and the practice quiz.
 * The conversation list is a pushed screen over the tutor tab: picking a row emits here and pops back,
 * and the (still mounted) tutor tab loads that conversation.
 */
import type { Href } from "expo-router";
import type { ChatLanguage } from "@/lib/types";

export type TutorEvent =
  /** Show this conversation (`null` = start a new chat). */
  | { type: "open"; conversationId: string | null }
  /** A conversation was deleted from the list; the tab resets if it was showing it. */
  | { type: "deleted"; conversationId: string };

type Listener = (event: TutorEvent) => void;
const listeners = new Set<Listener>();

export function emitTutorEvent(event: TutorEvent) {
  listeners.forEach((fn) => fn(event));
}

export function onTutorEvent(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Query keys. Start with "ai" so one invalidation refreshes the tutor. */
export const aiKeys = {
  status: ["ai", "status"] as const,
  conversations: ["ai", "conversations"] as const,
  messages: (id: string) => ["ai", "messages", id] as const,
};

export const HISTORY_ROUTE = "/tutor-history" as Href;

export function quizRoute(topic: string, language: ChatLanguage): Href {
  return { pathname: "/practice-quiz", params: { topic, language } } as Href;
}

/** The lesson reader owned by the Learn screens. Sources are lessons, so they open in-app. */
export function lessonRoute(lessonId: string): Href {
  return { pathname: "/lesson/[id]", params: { id: lessonId } } as Href;
}

/** Course detail, for a source that names a course but no lesson. */
export function courseRoute(slug: string): Href {
  return { pathname: "/course/[slug]", params: { slug } } as Href;
}
