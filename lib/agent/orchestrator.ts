/**
 * Agent orchestration loop.
 *
 * Runs entirely server-side in a Node route. Each run:
 *  - builds the tool instruction, then loops: ask Gemma → if it emits a tool call, execute
 *    it (or pause for confirmation on destructive tools) → feed the result back → repeat,
 *    until Gemma answers in plain text or we hit the step cap.
 *  - emits AgentEvents (text / tool_call / tool_result / confirm / done) for SSE streaming.
 */

import { randomUUID } from "node:crypto";

import { buildToolInstruction, gemmaTurn, parseToolCall } from "./gemma";
import { SYSTEM_PROMPT } from "./prompt";
import { getTool, TOOLS } from "./tools";
import type { AgentEvent, ChatMessage, ToolContext } from "./types";

const MAX_STEPS = 6;

export type RunInput = {
  messages: ChatMessage[];
  ctx: ToolContext;
  /** A tool call the user has approved (from a prior `confirm` event) to execute up front. */
  approvedToolCall?: { id: string; name: string; args: Record<string, unknown> } | null;
};

export async function* runAgent(input: RunInput): AsyncGenerator<AgentEvent> {
  const instruction = buildToolInstruction(SYSTEM_PROMPT, TOOLS);
  const history: ChatMessage[] = [...input.messages];

  // If resuming from an approved confirmation, execute it before the next model turn.
  if (input.approvedToolCall) {
    yield* executeTool(input.approvedToolCall, input.ctx, history);
  }

  for (let step = 0; step < MAX_STEPS; step++) {
    let raw: string;
    try {
      raw = await gemmaTurn(instruction, history);
    } catch (err) {
      yield { type: "error", message: err instanceof Error ? err.message : "Model error" };
      return;
    }

    const call = parseToolCall(raw);
    if (!call) {
      yield { type: "text", delta: raw };
      history.push({ role: "assistant", content: raw });
      yield { type: "done" };
      return;
    }

    const tool = getTool(call.name);
    const id = randomUUID();
    if (!tool) {
      // Unknown tool — tell the model so it can recover.
      history.push({ role: "assistant", content: raw, toolCalls: [{ id, name: call.name, args: call.args }] });
      history.push({
        role: "tool",
        toolCallId: id,
        name: call.name,
        content: { error: `Unknown tool "${call.name}". Available: ${TOOLS.map((t) => t.name).join(", ")}` },
      });
      continue;
    }

    history.push({ role: "assistant", content: "", toolCalls: [{ id, name: call.name, args: call.args }] });

    if (tool.requiresConfirmation) {
      // Pause: the client shows an approve/reject card, then re-runs with approvedToolCall.
      yield { type: "confirm", id, name: call.name, args: call.args };
      return;
    }

    yield* executeTool({ id, name: call.name, args: call.args }, input.ctx, history);
  }

  yield { type: "text", delta: "I've reached my step limit for this turn. Could you rephrase or narrow the request?" };
  yield { type: "done" };
}

async function* executeTool(
  call: { id: string; name: string; args: Record<string, unknown> },
  ctx: ToolContext,
  history: ChatMessage[]
): AsyncGenerator<AgentEvent> {
  const tool = getTool(call.name);
  if (!tool) return;

  yield { type: "tool_call", id: call.id, name: call.name, args: call.args };

  let result: unknown;
  try {
    const parsed = tool.schema.parse(call.args);
    result = await tool.handler(parsed, ctx);
  } catch (err) {
    result = { error: err instanceof Error ? err.message : "Tool failed" };
  }

  yield { type: "tool_result", id: call.id, name: call.name, result };
  history.push({ role: "tool", toolCallId: call.id, name: call.name, content: result });
}
