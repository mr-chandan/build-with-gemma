import { z } from "zod";

import { createServiceClient } from "@/utils/supabase/service";
import type { Tool } from "../types";

/**
 * Statutory + invoice deadlines — pure compute, no Google Calendar needed (that OAuth
 * integration comes later). Returns upcoming GST filing dates and each open invoice's
 * due date so the user can see what's coming up and what to chase.
 */
export const listDeadlinesTool: Tool = {
  name: "list_deadlines",
  description:
    "List upcoming financial deadlines: GST return filing dates (GSTR-1, GSTR-3B) and the due dates of unpaid invoices. Use when the user asks what's due or coming up.",
  schema: z.object({}),
  handler: async (_input, ctx) => {
    const supabase = createServiceClient();
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth(); // 0-indexed

    const iso = (d: Date) => d.toISOString().slice(0, 10);

    // Next GST deadlines (filed the month AFTER the tax period).
    const gstr1 = new Date(y, m + 1, 11); // 11th of next month
    const gstr3b = new Date(y, m + 1, 20); // 20th of next month
    const statutory = [
      { key: "gstr1", title: "File GSTR-1 (outward supplies)", date: iso(gstr1), category: "GST" },
      { key: "gstr3b", title: "File GSTR-3B (summary + tax)", date: iso(gstr3b), category: "GST" },
    ];

    // Unpaid invoice due dates.
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, due_date, total, amount_paid, clients(name, company)")
      .eq("user_id", ctx.userId)
      .in("status", ["sent", "overdue"])
      .order("due_date", { ascending: true });
    if (error) return { error: error.message };

    const invoiceDeadlines = (invoices ?? [])
      .filter((i) => Number(i.amount_paid) < Number(i.total))
      .map((i) => {
        const c = i.clients as { name?: string; company?: string } | null;
        return {
          key: `inv-${i.id}`,
          title: `Invoice ${i.invoice_number} due — ${c?.company || c?.name || "client"}`,
          date: i.due_date,
          category: "Invoice",
          overdue: new Date(i.due_date) < today,
          amount: Number(i.total) - Number(i.amount_paid),
        };
      });

    return {
      deadlines: [...statutory, ...invoiceDeadlines].sort((a, b) => a.date.localeCompare(b.date)),
    };
  },
};
