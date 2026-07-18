/**
 * FinMate agent endpoint — runs the Gemma tool-calling loop server-side and streams
 * AgentEvents to the browser as Server-Sent Events.
 *
 * Request body: { messages: ChatMessage[], approvedToolCall?: ToolCall | null }
 * Node runtime (the agent uses node:crypto and the Google GenAI SDK).
 */

import { NextRequest } from "next/server";

import { runAgent } from "@/lib/agent/orchestrator";
import type { ChatMessage, ToolCall } from "@/lib/agent/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  messages: ChatMessage[];
  approvedToolCall?: ToolCall | null;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!Array.isArray(body.messages)) {
    return new Response("`messages` must be an array", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      try {
        for await (const event of runAgent({
          messages: body.messages,
          approvedToolCall: body.approvedToolCall ?? null,
          ctx: { userId: "dev-user" },
        })) {
          send(event);
        }
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Agent failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
