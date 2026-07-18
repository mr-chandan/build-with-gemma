"use client";

import { useCallback, useRef, useState } from "react";

/** UI-side chat model. Also carries enough to rebuild the backend message history. */
export type ToolCallRec = { id: string; name: string; args: Record<string, unknown> };

export type ChatItem =
  | { kind: "user"; id: string; text: string }
  | { kind: "assistant"; id: string; text: string }
  | { kind: "tool"; id: string; toolCallId: string; name: string; result: unknown }
  | { kind: "confirm"; id: string; toolCallId: string; name: string; args: Record<string, unknown> };

type BackendMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: { id: string; name: string; args: Record<string, unknown> }[] }
  | { role: "tool"; toolCallId: string; name: string; content: unknown };

let counter = 0;
const uid = () => `c${Date.now()}_${counter++}`;

/** Rebuild the backend history from UI items (confirm items are UI-only). */
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
  const itemsRef = useRef<ChatItem[]>([]);
  itemsRef.current = items;

  const push = (item: ChatItem) => setItems((prev) => [...prev, item]);

  const runStream = useCallback(
    async (
      messages: BackendMessage[],
      approvedToolCall: ToolCallRec | null
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
                  push({ kind: "assistant", id, text: event.delta });
                } else {
                  setItems((prev) =>
                    prev.map((it) =>
                      it.id === id && it.kind === "assistant"
                        ? { ...it, text: it.text + event.delta }
                        : it
                    )
                  );
                }
                break;
              }
              case "tool_result":
                assistantId = null;
                push({
                  kind: "tool",
                  id: uid(),
                  toolCallId: event.id,
                  name: event.name,
                  result: event.result,
                });
                break;
              case "confirm":
                push({
                  kind: "confirm",
                  id: uid(),
                  toolCallId: event.id,
                  name: event.name,
                  args: event.args,
                });
                break;
              case "error":
                push({ kind: "assistant", id: uid(), text: `⚠️ ${event.message}` });
                break;
              // tool_call and done need no UI action here.
            }
          }
        }
      } catch (err) {
        push({ kind: "assistant", id: uid(), text: `⚠️ ${err instanceof Error ? err.message : "Failed"}` });
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;
      const userItem: ChatItem = { kind: "user", id: uid(), text: text.trim() };
      const next = [...itemsRef.current, userItem];
      setItems(next);
      await runStream(toBackend(next), null);
    },
    [isStreaming, runStream]
  );

  const approve = useCallback(
    async (confirmId: string) => {
      const confirmItem = itemsRef.current.find((it) => it.id === confirmId);
      if (!confirmItem || confirmItem.kind !== "confirm") return;
      const remaining = itemsRef.current.filter((it) => it.id !== confirmId);
      setItems(remaining);
      await runStream(toBackend(remaining), {
        id: confirmItem.toolCallId,
        name: confirmItem.name,
        args: confirmItem.args,
      });
    },
    [runStream]
  );

  const reject = useCallback((confirmId: string) => {
    setItems((prev) => [
      ...prev.filter((it) => it.id !== confirmId),
      { kind: "assistant", id: uid(), text: "Okay, I've cancelled that action." },
    ]);
  }, []);

  const reset = useCallback(() => setItems([]), []);

  return { items, isStreaming, send, approve, reject, reset };
}
