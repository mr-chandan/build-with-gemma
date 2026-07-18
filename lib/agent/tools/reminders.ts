import { z } from "zod";

import { createServiceClient } from "@/utils/supabase/service";
import { sendEmail } from "@/lib/resend";
import { inr, formatDate } from "@/lib/format";
import type { Tool } from "../types";

function reminderHtml(opts: {
  clientName: string;
  invoiceNumber: string;
  balance: number;
  dueDate: string;
  overdue: boolean;
}): string {
  const { clientName, invoiceNumber, balance, dueDate, overdue } = opts;
  return `
  <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
    <h2 style="margin: 0 0 8px;">Payment reminder</h2>
    <p>Hi ${clientName},</p>
    <p>
      This is a friendly reminder that invoice <strong>${invoiceNumber}</strong> for
      <strong>${inr(balance)}</strong> ${overdue ? "was" : "is"} due on
      <strong>${formatDate(dueDate)}</strong>${overdue ? " and is now overdue" : ""}.
    </p>
    <p>Please arrange payment at your earliest convenience. Thank you!</p>
    <p style="color: #666; font-size: 13px; margin-top: 24px;">Sent via Kubera.ai</p>
  </div>`;
}

export const sendInvoiceReminderTool: Tool = {
  name: "send_invoice_reminder",
  description:
    "Send a payment-reminder email to the client for a specific invoice (via Resend). Use for chasing unpaid or overdue invoices.",
  requiresConfirmation: true,
  schema: z.object({
    invoice_number: z.string().describe("The invoice number, e.g. INV-0001."),
    custom_message: z.string().optional().describe("Optional extra note to include."),
  }),
  handler: async (input, ctx) => {
    const { invoice_number } = input as { invoice_number: string; custom_message?: string };
    const supabase = createServiceClient();

    const { data: inv, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, total, amount_paid, due_date, status, clients(name, company, email)")
      .eq("invoice_number", invoice_number)
      .eq("user_id", ctx.userId)
      .single();
    if (error || !inv) return { error: error?.message ?? `Invoice ${invoice_number} not found` };
    const invoice_id = inv.id;

    const client = inv.clients as { name?: string; company?: string; email?: string } | null;
    if (!client?.email) return { error: "This client has no email on file." };

    const balance = Number(inv.total) - Number(inv.amount_paid);
    const overdue = new Date(inv.due_date) < new Date();
    const subject = `${overdue ? "Overdue" : "Reminder"}: Invoice ${inv.invoice_number} — ${inr(balance)}`;

    const html = reminderHtml({
      clientName: client.company || client.name || "there",
      invoiceNumber: inv.invoice_number,
      balance,
      dueDate: inv.due_date,
      overdue,
    });

    let status: "sent" | "failed" = "sent";
    let resendId: string | null = null;
    try {
      const res = await sendEmail({ to: client.email, subject, html });
      resendId = res.data?.id ?? null;
      if (res.error) status = "failed";
    } catch {
      status = "failed";
    }

    await supabase.from("invoice_reminders").insert({
      invoice_id,
      user_id: ctx.userId,
      sent_to: client.email,
      subject,
      status,
      resend_id: resendId,
      sent_at: new Date().toISOString(),
    });

    if (status === "failed") {
      return { error: `Could not send the reminder email to ${client.email}.` };
    }
    return {
      invoice_number: inv.invoice_number,
      sent_to: client.email,
      amount: balance,
      overdue,
    };
  },
};
