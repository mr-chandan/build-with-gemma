/**
 * Chat conversations — list the signed-in user's threads and create new ones.
 * GET  /api/conversations         → [{ id, title, updated_at }]
 * POST /api/conversations {title} → { id, title }
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

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ conversations: [] });

  const { data } = await createServiceClient()
    .from("conversations")
    .select("id, title, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ conversations: data ?? [] });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { title?: string };
  const title = (body.title ?? "New chat").slice(0, 80);

  const { data, error } = await createServiceClient()
    .from("conversations")
    .insert({ user_id: userId, title })
    .select("id, title")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
