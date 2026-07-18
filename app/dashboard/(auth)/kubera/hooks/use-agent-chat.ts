"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** UI-side chat model. Also carries enough to rebuild the backend message history. */
export type ChatItem =
  | { kind: "user"; id: string; text: string }
  | { kind: "assistant"; id: string; text: string }
  | { kind: "tool"; id: string; toolCallId: string; name: string; result: unknown }
  | { kind: "confirm"; id: string; toolCallId: string; name: string; args: Record<string, unknown> };

export type Conversation = { id: string; title: string; updated_at: string };

type BackendMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: { id: string; name: string; args: Record<string, unknown> }[] }
  | { role: "tool"; toolCallId: string; name: string; content: unknown };

let counter = 0;
const uid = () => `c${Date.now()}_${counter++}`;

function toBackend(items: ChatItem[]): BackendMessage[] {
  const out: BackendMessage[] = [];
  for (const it of items) {
    if (it.kind === "user") out.push({ role: "user", content: it.text });
    else if (it.kind === "assistant") {
      if (it.text) out.push({ role: "assistant", content: it.text });
    } else if (it.kind === "tool") {
      out.push({ role: "assistant", content: "", toolCalls: [{ id: it.toolCallId, name: it.name, args: {} }] });
      out.push({ role: "tool", toolCallId: it.toolCallId, name: it.name, content: it.result });
    }
  }
  return out;
}

export function useAgentChat() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Synchronous mirror of `items` so persistence after an async run reads fresh data.
  const working = useRef<ChatItem[]>([]);
  const convIdRef = useRef<string | null>(null);
  convIdRef.current = conversationId;

  const apply = useCallback((updater: (prev: ChatItem[]) => ChatItem[]) => {
    const next = updater(working.current);
    working.current = next;
    setItems(next);
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const json = await res.json();
      setConversations(json.conversations ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  const persist = useCallback(async () => {
    const id = convIdRef.current;
    if (!id) return;
    const saved = working.current.filter((it) => it.kind !== "confirm");
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: saved }),
      });
      await refreshConversations();
    } catch {
      /* ignore */
    }
  }, [refreshConversations]);

  const ensureConversation = useCallback(async (firstText: string): Promise<string | null> => {
    if (convIdRef.current) return convIdRef.current;
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: firstText.slice(0, 60) }),
      });
      const json = await res.json();
      if (json.id) {
        convIdRef.current = json.id;
        setConversationId(json.id);
        return json.id;
      }
    } catch {
      /* ignore */
    }
    return null;
  }, []);

  const runStream = useCallback(
    async (
      messages: BackendMessage[],
      approvedToolCall: { id: string; name: string; args: Record<string, unknown> } | null
    ) => {
      setIsStreaming(true);
      let assistantId: string | null = null;
      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, approvedToolCall }),
        });
        if (!res.ok || !res.body) throw new Error(`Agent error (${res.status})`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";
          for (const chunk of chunks) {
            const line = chunk.trim();
            if (!line.startsWith("data:")) continue;
            const event = JSON.parse(line.slice(5).trim());
            switch (event.type) {
              case "text": {
                const id: string = assistantId ?? uid();
                if (!assistantId) {
                  assistantId = id;
                  apply((prev) => [...prev, { kind: "assistant", id, text: event.delta }]);
                } else {
                  apply((prev) =>
                    prev.map((it) =>
                      it.id === id && it.kind === "assistant" ? { ...it, text: it.text + event.delta } : it
                    )
                  );
                }
                break;
              }
              case "tool_result":
                assistantId = null;
                apply((prev) => [
                  ...prev,
                  { kind: "tool", id: uid(), toolCallId: event.id, name: event.name, result: event.result },
                ]);
                break;
              case "confirm":
                apply((prev) => [
                  ...prev,
                  { kind: "confirm", id: uid(), toolCallId: event.id, name: event.name, args: event.args },
                ]);
                break;
              case "error":
                apply((prev) => [...prev, { kind: "assistant", id: uid(), text: `⚠️ ${event.message}` }]);
                break;
            }
          }
        }
      } catch (err) {
        apply((prev) => [
          ...prev,
          { kind: "assistant", id: uid(), text: `⚠️ ${err instanceof Error ? err.message : "Failed"}` },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [apply]
  );

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;
      apply((prev) => [...prev, { kind: "user", id: uid(), text: text.trim() }]);
      await ensureConversation(text.trim());
      await runStream(toBackend(working.current), null);
      await persist();
    },
    [apply, ensureConversation, isStreaming, persist, runStream]
  );

  const approve = useCallback(
    async (confirmId: string, overrideArgs?: Record<string, unknown>) => {
      const confirmItem = working.current.find((it) => it.id === confirmId);
      if (!confirmItem || confirmItem.kind !== "confirm") return;
      apply((prev) => prev.filter((it) => it.id !== confirmId));
      await runStream(toBackend(working.current), {
        id: confirmItem.toolCallId,
        name: confirmItem.name,
        args: overrideArgs ?? confirmItem.args,
      });
      await persist();
    },
    [apply, persist, runStream]
  );

  const reject = useCallback(
    (confirmId: string) => {
      apply((prev) => [
        ...prev.filter((it) => it.id !== confirmId),
        { kind: "assistant", id: uid(), text: "Okay, I've cancelled that action." },
      ]);
      void persist();
    },
    [apply, persist]
  );

  const newChat = useCallback(() => {
    working.current = [];
    setItems([]);
    convIdRef.current = null;
    setConversationId(null);
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const json = await res.json();
      working.current = json.items ?? [];
      setItems(json.items ?? []);
      convIdRef.current = id;
      setConversationId(id);
    } catch {
      /* ignore */
    }
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      } catch {
        /* ignore */
      }
      if (convIdRef.current === id) newChat();
      await refreshConversations();
    },
    [newChat, refreshConversations]
  );

  return {
    items,
    isStreaming,
    conversations,
    conversationId,
    send,
    approve,
    reject,
    newChat,
    loadConversation,
    deleteConversation,
  };
}
