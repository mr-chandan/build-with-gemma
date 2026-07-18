/**
 * Save the signed-in user's GST identity (GSTIN and/or portal username) from the UI —
 * used by the "Save GST username" modal so the user doesn't type credentials in chat.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const {
    data: { user },
  } = await createClient(cookieStore).auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { gstin?: string; gst_username?: string };
  const update: Record<string, unknown> = {};
  if (typeof body.gstin === "string" && body.gstin.trim()) update.gstin = body.gstin.trim().toUpperCase();
  if (typeof body.gst_username === "string" && body.gst_username.trim())
    update.gst_username = body.gst_username.trim();
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
  }

  const { error } = await createServiceClient().from("profiles").update(update).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
