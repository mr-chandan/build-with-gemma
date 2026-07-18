/**
 * Gemma client + emulated function calling.
 *
 * Gemma (via the Gemini API) has no native tool API and no system-instruction slot, so:
 *  1. Tool declarations are rendered into a leading *user* turn (buildToolInstruction).
 *  2. The model replies either with prose or a single JSON object describing a tool call;
 *     parseToolCall extracts `{name, parameters}` from a ```json block or a trailing JSON
 *     substring — the same shape ADK's Gemma wrapper relies on.
 *
 * This mirrors what `google-adk`'s Gemma class does in Python, reimplemented for the
 * @google/genai JS SDK so the whole agent can run in a Next.js Node route.
 */

import { GoogleGenAI } from "@google/genai";
import { zodToJsonSchema } from "zod-to-json-schema";

import type { AnyTool, ChatMessage } from "./types";

const MODEL = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";

let client: GoogleGenAI | null = null;
function genai(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMMA_API_KEY;
    if (!apiKey) throw new Error("GEMMA_API_KEY is not set");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

type GenaiContent = { role: "user" | "model"; parts: { text: string }[] };

/** Render the tool catalogue + calling protocol into a single instruction string. */
export function buildToolInstruction(systemPrompt: string, tools: AnyTool[]): string {
  if (tools.length === 0) return systemPrompt;
  const specs = tools
    .map((t) => {
      const schema = zodToJsonSchema(t.schema, { target: "openApi3" });
      return `- ${t.name}: ${t.description}\n  parameters (JSON schema): ${JSON.stringify(schema)}`;
    })
    .join("\n");
  return [
    systemPrompt,
    "",
    "You can call tools. The available tools are:",
    specs,
    "",
    "To call a tool, respond with ONLY a single JSON object on its own, no prose around it:",
    '{"name": "<tool_name>", "parameters": { <arguments> }}',
    "Call one tool at a time and wait for its result before continuing.",
    "When you have the final answer for the user, respond in plain natural language (no JSON).",
    "Never invent tool results — only state what a tool actually returned.",
  ].join("\n");
}

/** Convert our message history into Gemma-compatible contents (no tool/system roles). */
function toContents(instruction: string, messages: ChatMessage[]): GenaiContent[] {
  const contents: GenaiContent[] = [{ role: "user", parts: [{ text: instruction }] }];
  for (const m of messages) {
    if (m.role === "user") {
      contents.push({ role: "user", parts: [{ text: m.content }] });
    } else if (m.role === "assistant") {
      const text =
        m.toolCalls && m.toolCalls.length
          ? JSON.stringify({ name: m.toolCalls[0].name, parameters: m.toolCalls[0].args })
          : m.content;
      if (text) contents.push({ role: "model", parts: [{ text }] });
    } else {
      // Tool results are fed back as a user turn (Gemma has no tool role).
      contents.push({
        role: "user",
        parts: [{ text: `Tool "${m.name}" returned:\n${JSON.stringify(m.content)}` }],
      });
    }
  }
  return contents;
}

/** One Gemma turn. Returns the full raw text (reasoning stripped). */
export async function gemmaTurn(instruction: string, messages: ChatMessage[]): Promise<string> {
  const res = await genai().models.generateContent({
    model: MODEL,
    contents: toContents(instruction, messages),
  });
  return (res.text ?? "").trim();
}

/** Streaming Gemma turn — yields text deltas. */
export async function* gemmaStream(
  instruction: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const stream = await genai().models.generateContentStream({
    model: MODEL,
    contents: toContents(instruction, messages),
  });
  for await (const chunk of stream) {
    const t = chunk.text;
    if (t) yield t;
  }
}

/** Extract a tool call from a Gemma response, or null if it's a plain answer. */
export function parseToolCall(
  text: string
): { name: string; args: Record<string, unknown> } | null {
  let candidate: string | null = null;

  const block = text.match(/```(?:json|tool_code)?\s*([\s\S]*?)\s*```/);
  if (block) {
    candidate = block[1].trim();
  } else {
    candidate = lastJsonObject(text);
  }
  if (!candidate) return null;

  try {
    const obj = JSON.parse(candidate) as Record<string, unknown>;
    const name = (obj.name ?? obj.function) as string | undefined;
    const args = (obj.parameters ?? obj.args ?? {}) as Record<string, unknown>;
    if (name && typeof name === "string") return { name, args: args ?? {} };
  } catch {
    return null;
  }
  return null;
}

/** Find the last balanced `{...}` JSON object in a string. */
function lastJsonObject(text: string): string | null {
  const end = text.lastIndexOf("}");
  if (end === -1) return null;
  let depth = 0;
  for (let i = end; i >= 0; i--) {
    if (text[i] === "}") depth++;
    else if (text[i] === "{") {
      depth--;
      if (depth === 0) return text.slice(i, end + 1);
    }
  }
  return null;
}
