/**
 * A single conversation's messages.
 * GET    /api/conversations/:id            → { items: ChatItem[] }
 * POST   /api/conversations/:id { items }  → append messages (persist a completed turn)
 * DELETE /api/conversations/:id            → remove the conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";

export const runtime = "nodejs";

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const {
    data: { user },
  } = await createClient(cookieStore).auth.getUser();
  return user?.id ?? null;
}

async function ownsConversation(id: string, userId: string): Promise<boolean> {
  const { data } = await createServiceClient()
    .from("conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return !!data;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const userId = await getUserId();
  if (!userId || !(await ownsConversation(id, userId))) {
    return NextResponse.json({ items: [] }, { status: userId ? 404 : 401 });
  }

  const { data } = await createServiceClient()
    .from("messages")
    .select("id, kind, content, tool_call_id, tool_name, tool_result")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const items = (data ?? []).map((m) => {
    if (m.kind === "tool") {
      return { kind: "tool", id: m.id, toolCallId: m.tool_call_id, name: m.tool_name, result: m.tool_result };
    }
    return { kind: m.kind, id: m.id, text: m.content ?? "" };
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const userId = await getUserId();
  if (!userId || !(await ownsConversation(id, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: userId ? 404 : 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { items?: unknown[] };
  const items = Array.isArray(body.items) ? body.items : [];

  const rows = items
    .map((raw) => {
      const it = raw as Record<string, unknown>;
      if (it.kind === "user" || it.kind === "assistant") {
        return { conversation_id: id, kind: it.kind, content: String(it.text ?? "") };
      }
      if (it.kind === "tool") {
        return {
          conversation_id: id,
          kind: "tool",
          tool_call_id: it.toolCallId as string,
          tool_name: it.name as string,
          tool_result: it.result ?? null,
        };
      }
      return null;
    })
    .filter(Boolean);

  const supabase = createServiceClient();
  // Replace-all: the client sends the full item list each save, so we mirror it exactly.
  await supabase.from("messages").delete().eq("conversation_id", id);
  if (rows.length) await supabase.from("messages").insert(rows as Record<string, unknown>[]);
  await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const userId = await getUserId();
  if (!userId || !(await ownsConversation(id, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: userId ? 404 : 401 });
  }
  await createServiceClient().from("conversations").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
