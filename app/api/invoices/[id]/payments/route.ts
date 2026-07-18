/**
 * Record a payment against an invoice (full or partial).
 * POST /api/invoices/:id/payments { amount, method?, reference?, paid_on? }
 *
 * Mirrors the agent's `record_payment` tool: inserts an invoice_payments row,
 * updates the invoice's amount_paid/status, and adds a cash-flow inflow entry.
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

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    amount?: number;
    method?: string;
    reference?: string;
    paid_on?: string;
  };

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, amount_paid, client_id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (invErr || !inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const paid_on = body.paid_on || new Date().toISOString().slice(0, 10);

  const { error: payErr } = await supabase.from("invoice_payments").insert({
    invoice_id: id,
    user_id: userId,
    amount,
    method: body.method || null,
    reference: body.reference || null,
    paid_on,
  });
  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 });

  const newPaid = Number((Number(inv.amount_paid) + amount).toFixed(2));
  const fullyPaid = newPaid >= Number(inv.total);
  const { error: updErr } = await supabase
    .from("invoices")
    .update({
      amount_paid: newPaid,
      status: fullyPaid ? "paid" : "sent",
      paid_at: fullyPaid ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await supabase.from("cash_flow_entries").insert({
    entry_date: paid_on,
    type: "inflow",
    category: "invoice_payment",
    description: `Payment for ${inv.invoice_number}`,
    amount,
    source: "invoice",
    invoice_id: id,
    user_id: userId,
  });

  return NextResponse.json({
    invoice_number: inv.invoice_number,
    amount_paid: newPaid,
    total: Number(inv.total),
    status: fullyPaid ? "paid" : "partial",
    balance: Number((Number(inv.total) - newPaid).toFixed(2)),
  });
}
