/**
 * Pure chat state for the AI Tutor screen: optimistic send, failure with retry, and conversation switching.
 * `epoch` changes whenever the visible conversation changes, so a reply that lands after the student switched
 * conversations (or started a new chat) is ignored instead of being appended to the wrong thread.
 */
import type { ChatMessage, ChatResponse } from "@/lib/types";

export type DeliveryStatus = "sent" | "sending" | "failed";

export interface LocalMessage extends ChatMessage {
  status: DeliveryStatus;
  /** Why a failed message failed, shown under the bubble. */
  error?: string;
}

export interface ChatState {
  conversationId: string | null;
  /** Chronological, oldest first. The inverted list reads it through `newestFirst`. */
  messages: LocalMessage[];
  /** A reply is on its way; send stays disabled. */
  pending: boolean;
  /** Loading an existing conversation's messages. */
  loading: boolean;
  loadError: string | null;
  epoch: number;
}

export type ChatAction =
  | { type: "new_chat" }
  | { type: "open"; conversationId: string }
  | { type: "loaded"; conversationId: string; messages: ChatMessage[] }
  | { type: "load_failed"; conversationId: string; error: string }
  | { type: "send"; localId: string; content: string; createdAt: string }
  | { type: "success"; epoch: number; localId: string; response: ChatResponse }
  | { type: "failure"; epoch: number; localId: string; error: string }
  | { type: "retry"; localId: string; createdAt: string }
  | { type: "discard"; localId: string };

export const initialChatState: ChatState = {
  conversationId: null,
  messages: [],
  pending: false,
  loading: false,
  loadError: null,
  epoch: 0,
};

const sent = (m: ChatMessage): LocalMessage => ({ ...m, status: "sent" });

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "new_chat":
      return { ...initialChatState, epoch: state.epoch + 1 };

    case "open":
      return { ...initialChatState, conversationId: action.conversationId, loading: true, epoch: state.epoch + 1 };

    case "loaded":
      if (!state.loading || action.conversationId !== state.conversationId) return state;
      return { ...state, loading: false, loadError: null, messages: action.messages.map(sent) };

    case "load_failed":
      if (!state.loading || action.conversationId !== state.conversationId) return state;
      return { ...state, loading: false, loadError: action.error };

    case "send": {
      const content = action.content.trim();
      if (!content || state.pending || state.loading) return state;
      const msg: LocalMessage = { id: action.localId, role: "user", content, sources: [], created_at: action.createdAt, status: "sending" };
      return { ...state, pending: true, messages: [...state.messages, msg] };
    }

    case "success": {
      if (action.epoch !== state.epoch) return state;
      const { response } = action;
      const others = state.messages.filter((m) => m.id !== action.localId);
      return {
        ...state,
        pending: false,
        conversationId: response.conversation.id,
        messages: [...others, sent(response.user_message), sent(response.assistant_message)],
      };
    }

    case "failure":
      if (action.epoch !== state.epoch) return state;
      return {
        ...state,
        pending: false,
        messages: state.messages.map((m) => (m.id === action.localId ? { ...m, status: "failed", error: action.error } : m)),
      };

    case "retry": {
      const failed = state.messages.find((m) => m.id === action.localId && m.status === "failed");
      if (!failed || state.pending) return state;
      // Move it to the end so the thread order matches what the server will store.
      const again: LocalMessage = { ...failed, status: "sending", error: undefined, created_at: action.createdAt };
      return { ...state, pending: true, messages: [...state.messages.filter((m) => m.id !== action.localId), again] };
    }

    case "discard":
      return { ...state, messages: state.messages.filter((m) => !(m.id === action.localId && m.status === "failed")) };
  }
}

/** Newest first, for an inverted FlatList. */
export function newestFirst(messages: LocalMessage[]): LocalMessage[] {
  return [...messages].reverse();
}

let seq = 0;
/** Local id for an optimistic message; never sent to the server. */
export function localMessageId(): string {
  seq += 1;
  return `local-${Date.now().toString(36)}-${seq}`;
}
