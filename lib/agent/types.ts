/**
 * Shared agent types — the tool contract and the streamed event shapes.
 *
 * The agent runs entirely in Next.js API routes (Node runtime). Gemma has no native
 * function calling, so tools are described to the model in the system prompt and the
 * model's `{"name","parameters"}` JSON replies are parsed back into ToolCall objects.
 */

import type { z } from "zod";

export type ToolContext = {
  /** Authenticated user id once Supabase auth is wired; "dev-user" until then. */
  userId: string;
};

export type Tool<TInput = unknown, TOutput = unknown> = {
  name: string;
  description: string;
  /** Zod schema for the tool's arguments — also rendered into the prompt as JSON shape. */
  schema: z.ZodType<TInput>;
  /** Destructive tools require an explicit user confirmation before the handler runs. */
  requiresConfirmation?: boolean;
  handler: (input: TInput, ctx: ToolContext) => Promise<TOutput>;
};

/** Registry-friendly tool type: tools have heterogeneous input/output, so the registry
 *  and lookups use this instead of the invariant generic `Tool`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTool = Tool<any, any>;

export type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; name: string; content: unknown };

export type ToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};

/** Server-Sent Events streamed to the browser during a run. */
export type AgentEvent =
  | { type: "text"; delta: string }
  | { type: "tool_call"; id: string; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; id: string; name: string; result: unknown }
  | { type: "confirm"; id: string; name: string; args: Record<string, unknown> }
  | { type: "error"; message: string }
  | { type: "done" };
