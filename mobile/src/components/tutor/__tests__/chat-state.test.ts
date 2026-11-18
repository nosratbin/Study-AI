/// <reference types="jest" />
import type { ChatMessage, ChatResponse } from "@/lib/types";
import { chatReducer, initialChatState, localMessageId, newestFirst, type ChatState } from "../chat-state";

const msg = (id: string, role: "user" | "assistant", content = id): ChatMessage => ({ id, role, content, sources: [], created_at: "2026-01-01T00:00:00Z" });

const response = (convId: string, userId: string, botId: string, content: string): ChatResponse => ({
  conversation: { id: convId, title: "T", language: "en", updated_at: "2026-01-01T00:00:00Z" },
  user_message: msg(userId, "user", content),
  assistant_message: msg(botId, "assistant", "reply"),
});

const send = (s: ChatState, localId: string, content = "hi") => chatReducer(s, { type: "send", localId, content, createdAt: "now" });

describe("chatReducer: optimistic send", () => {
  it("appends the user's message immediately as sending and marks a reply pending", () => {
    const s = send(initialChatState, "l1", "  What is AI?  ");
    expect(s.pending).toBe(true);
    expect(s.messages).toEqual([expect.objectContaining({ id: "l1", role: "user", content: "What is AI?", status: "sending" })]);
  });

  it("ignores empty messages and a second send while a reply is pending", () => {
    expect(send(initialChatState, "l0", "   ")).toBe(initialChatState);
    const s = send(initialChatState, "l1");
    expect(send(s, "l2")).toBe(s);
  });

  it("replaces the optimistic message with the server's pair on success", () => {
    const s1 = send(initialChatState, "l1", "hello");
    const s2 = chatReducer(s1, { type: "success", epoch: s1.epoch, localId: "l1", response: response("c1", "u1", "a1", "hello") });
    expect(s2.pending).toBe(false);
    expect(s2.conversationId).toBe("c1");
    expect(s2.messages.map((m) => [m.id, m.status])).toEqual([
      ["u1", "sent"],
      ["a1", "sent"],
    ]);
  });

  it("drops a reply that lands after the student switched conversations", () => {
    const s1 = send(initialChatState, "l1");
    const switched = chatReducer(s1, { type: "new_chat" });
    const s2 = chatReducer(switched, { type: "success", epoch: s1.epoch, localId: "l1", response: response("c1", "u1", "a1", "hi") });
    expect(s2).toBe(switched);
    expect(s2.messages).toEqual([]);
  });
});

describe("chatReducer: failure and retry", () => {
  const failed = () => {
    const s1 = send(initialChatState, "l1", "first");
    return chatReducer(s1, { type: "failure", epoch: s1.epoch, localId: "l1", error: "You appear to be offline." });
  };

  it("marks the message failed with the error and re-enables sending", () => {
    const s = failed();
    expect(s.pending).toBe(false);
    expect(s.messages[0]).toMatchObject({ id: "l1", status: "failed", error: "You appear to be offline." });
  });

  it("retry moves the failed message to the end and sends it again", () => {
    let s = failed();
    s = send(s, "l2", "second");
    s = chatReducer(s, { type: "failure", epoch: s.epoch, localId: "l2", error: "x" });
    s = chatReducer(s, { type: "retry", localId: "l1", createdAt: "later" });
    expect(s.pending).toBe(true);
    expect(s.messages.map((m) => [m.id, m.status])).toEqual([
      ["l2", "failed"],
      ["l1", "sending"],
    ]);
    expect(s.messages[1].error).toBeUndefined();
  });

  it("retry is ignored while another reply is pending or for a message that didn't fail", () => {
    const s = send(failed(), "l2");
    expect(chatReducer(s, { type: "retry", localId: "l1", createdAt: "t" })).toBe(s);
    expect(chatReducer(s, { type: "retry", localId: "l2", createdAt: "t" })).toBe(s);
  });

  it("discard removes only failed messages", () => {
    const s = chatReducer(failed(), { type: "discard", localId: "l1" });
    expect(s.messages).toEqual([]);
    const sending = send(initialChatState, "l9");
    expect(chatReducer(sending, { type: "discard", localId: "l9" }).messages).toHaveLength(1);
  });
});

describe("chatReducer: opening conversations", () => {
  it("loads messages for the conversation being opened", () => {
    const s1 = chatReducer(initialChatState, { type: "open", conversationId: "c1" });
    expect(s1).toMatchObject({ loading: true, conversationId: "c1", messages: [] });
    const s2 = chatReducer(s1, { type: "loaded", conversationId: "c1", messages: [msg("u1", "user"), msg("a1", "assistant")] });
    expect(s2.loading).toBe(false);
    expect(s2.messages.every((m) => m.status === "sent")).toBe(true);
  });

  it("ignores a stale load for a conversation that is no longer open", () => {
    const s1 = chatReducer(chatReducer(initialChatState, { type: "open", conversationId: "c1" }), { type: "open", conversationId: "c2" });
    expect(chatReducer(s1, { type: "loaded", conversationId: "c1", messages: [msg("x", "user")] })).toBe(s1);
    const failed = chatReducer(s1, { type: "load_failed", conversationId: "c2", error: "boom" });
    expect(failed).toMatchObject({ loading: false, loadError: "boom" });
  });

  it("blocks sending while a conversation is loading", () => {
    const s1 = chatReducer(initialChatState, { type: "open", conversationId: "c1" });
    expect(send(s1, "l1")).toBe(s1);
  });
});

describe("helpers", () => {
  it("newestFirst reverses without mutating", () => {
    const s = chatReducer(chatReducer(initialChatState, { type: "open", conversationId: "c" }), {
      type: "loaded",
      conversationId: "c",
      messages: [msg("1", "user"), msg("2", "assistant"), msg("3", "user")],
    });
    expect(newestFirst(s.messages).map((m) => m.id)).toEqual(["3", "2", "1"]);
    expect(s.messages.map((m) => m.id)).toEqual(["1", "2", "3"]);
  });

  it("localMessageId is unique", () => {
    const ids = new Set(Array.from({ length: 50 }, localMessageId));
    expect(ids.size).toBe(50);
  });
});
