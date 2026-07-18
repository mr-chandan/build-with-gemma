import { z } from "zod";

import { createServiceClient } from "@/utils/supabase/service";
import type { Tool } from "../types";

type SupabaseClient = ReturnType<typeof createServiceClient>;

/** Highest invoice number this user has used, so the next one never collides even
 *  after deletions. Returns 0 when the user has no invoices. */
async function maxInvoiceSeq(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("user_id", userId);
  let max = 0;
  for (const row of data ?? []) {
    const m = /(\d+)$/.exec(row.invoice_number ?? "");
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}

const fmtInvoiceNumber = (n: number) => `INV-${String(n).padStart(4, "0")}`;

const itemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive().default(1),
  unit_price: z.number().nonnegative(),
});

export const listInvoicesTool: Tool = {
  name: "list_invoices",
  description:
    "List invoices with their client, status (draft/sent/paid/overdue/cancelled), total, amount paid, and due date. Optionally filter by status or client.",
  schema: z.object({
    status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
    client_id: z.string().uuid().optional(),
    limit: z.number().int().positive().max(100).default(25),
  }),
  handler: async (input, ctx) => {
    const { status, client_id, limit } = input as {
      status?: string;
      client_id?: string;
      limit: number;
    };
    const supabase = createServiceClient();
    let query = supabase
      .from("invoices")
      .select(
        "id, invoice_number, invoice_type, status, issue_date, due_date, currency, total, amount_paid, clients(name, company)"
      )
      .eq("user_id", ctx.userId)
      .order("issue_date", { ascending: false })
      .limit(limit);
    if (status) query = query.eq("status", status);
    if (client_id) query = query.eq("client_id", client_id);
    const { data, error } = await query;
    if (error) return { error: error.message };
    return { invoices: data ?? [], count: data?.length ?? 0 };
  },
};

export const createInvoiceTool: Tool = {
  name: "create_invoice",
  description:
    "Create an invoice for a client with one or more line items. B2B vs B2C is decided automatically from whether the client has a GSTIN — do NOT ask the user. tax_rate is a GST percentage (default 18). The invoice is marked 'sent'.",
  requiresConfirmation: true,
  schema: z.object({
    client_id: z.string().uuid().describe("The client's id (from list_clients/create_client)."),
    items: z.array(itemSchema).min(1).describe("Line items."),
    tax_rate: z.number().min(0).max(28).default(18).describe("GST percent."),
    due_date: z.string().describe("ISO date (YYYY-MM-DD) the payment is due."),
    notes: z.string().optional(),
  }),
  handler: async (input, ctx) => {
    const args = input as {
      client_id: string;
      items: { description: string; quantity: number; unit_price: number }[];
      tax_rate: number;
      due_date: string;
      notes?: string;
    };
    const supabase = createServiceClient();

    // B2B vs B2C is derived from the client's GSTIN, not asked.
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("id, gstin")
      .eq("id", args.client_id)
      .eq("user_id", ctx.userId)
      .single();
    if (clientErr || !client) return { error: "Client not found." };
    const invoice_type = client.gstin ? "b2b" : "b2c";

    const items = args.items.map((it, i) => ({
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      amount: Number((it.quantity * it.unit_price).toFixed(2)),
      sort_order: i,
    }));
    const subtotal = Number(items.reduce((s, it) => s + it.amount, 0).toFixed(2));
    const tax_amount = Number((subtotal * (args.tax_rate / 100)).toFixed(2));
    const total = Number((subtotal + tax_amount).toFixed(2));

    // Allocate a per-user number, retrying on the (rare) unique-constraint race.
    let seq = (await maxInvoiceSeq(supabase, ctx.userId)) + 1;
    let invoice: { id: string; invoice_number: string; total: number; due_date: string; status: string } | null =
      null;
    for (let attempt = 0; attempt < 5 && !invoice; attempt++) {
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          invoice_number: fmtInvoiceNumber(seq),
          client_id: args.client_id,
          user_id: ctx.userId,
          invoice_type,
          status: "sent",
          due_date: args.due_date,
          subtotal,
          tax_rate: args.tax_rate,
          tax_amount,
          total,
          notes: args.notes ?? null,
        })
        .select("id, invoice_number, total, due_date, status")
        .single();
      if (!error) {
        invoice = data;
      } else if (error.code === "23505") {
        seq += 1; // number taken — bump and retry
      } else {
        return { error: error.message };
      }
    }
    if (!invoice) return { error: "Could not allocate an invoice number, please try again." };

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(items.map((it) => ({ ...it, invoice_id: invoice.id })));
    if (itemsError) return { error: `Invoice created but items failed: ${itemsError.message}` };

    return { invoice: { ...invoice, invoice_type, subtotal, tax_amount } };
  },
};

export const recordPaymentTool: Tool = {
  name: "record_payment",
  description:
    "Record a payment received against an invoice (full or partial). Updates the invoice's paid amount and status, and adds a matching cash-flow inflow entry.",
  requiresConfirmation: true,
  schema: z.object({
    invoice_id: z.string().uuid(),
    amount: z.number().positive().describe("Amount received in ₹."),
    method: z.string().optional().describe("e.g. UPI, bank transfer, cash."),
    reference: z.string().optional().describe("UTR / transaction reference."),
    paid_on: z.string().optional().describe("ISO date; defaults to today."),
  }),
  handler: async (input, ctx) => {
    const args = input as {
      invoice_id: string;
      amount: number;
      method?: string;
      reference?: string;
      paid_on?: string;
    };
    const supabase = createServiceClient();

    const { data: inv, error: invErr } = await supabase
      .from("invoices")
      .select("id, invoice_number, total, amount_paid, client_id")
      .eq("id", args.invoice_id)
      .eq("user_id", ctx.userId)
      .single();
    if (invErr || !inv) return { error: invErr?.message ?? "Invoice not found" };

    const paid_on = args.paid_on ?? new Date().toISOString().slice(0, 10);

    const { error: payErr } = await supabase.from("invoice_payments").insert({
      invoice_id: args.invoice_id,
      user_id: ctx.userId,
      amount: args.amount,
      method: args.method ?? null,
      reference: args.reference ?? null,
      paid_on,
    });
    if (payErr) return { error: payErr.message };

    const newPaid = Number((Number(inv.amount_paid) + args.amount).toFixed(2));
    const fullyPaid = newPaid >= Number(inv.total);
    const { error: updErr } = await supabase
      .from("invoices")
      .update({
        amount_paid: newPaid,
        status: fullyPaid ? "paid" : "sent",
        paid_at: fullyPaid ? new Date().toISOString() : null,
      })
      .eq("id", args.invoice_id);
    if (updErr) return { error: updErr.message };

    await supabase.from("cash_flow_entries").insert({
      entry_date: paid_on,
      type: "inflow",
      category: "invoice_payment",
      description: `Payment for ${inv.invoice_number}`,
      amount: args.amount,
      source: "invoice",
      invoice_id: args.invoice_id,
      user_id: ctx.userId,
    });

    return {
      invoice_number: inv.invoice_number,
      amount_paid: newPaid,
      total: Number(inv.total),
      status: fullyPaid ? "paid" : "partially paid",
      balance: Number((Number(inv.total) - newPaid).toFixed(2)),
    };
  },
};

export const listOverdueInvoicesTool: Tool = {
  name: "list_overdue_invoices",
  description:
    "List invoices that are past their due date and not fully paid — the ones to chase for payment.",
  schema: z.object({}),
  handler: async (_input, ctx) => {
    const supabase = createServiceClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("invoices")
      .select(
        "id, invoice_number, due_date, total, amount_paid, clients(name, email, company)"
      )
      .eq("user_id", ctx.userId)
      .in("status", ["sent", "overdue"])
      .lt("due_date", today)
      .order("due_date", { ascending: true });
    if (error) return { error: error.message };
    const overdue = (data ?? []).filter((i) => Number(i.amount_paid) < Number(i.total));
    return { overdue, count: overdue.length };
  },
};
