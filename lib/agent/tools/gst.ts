import { z } from "zod";

import { createServiceClient } from "@/utils/supabase/service";
import { wbCall, extractTxn, whitebooksConfigured, registeredEmail, GST_ACCOUNT } from "@/lib/gst/wb";
import { prepareReturn, retPeriod, type PrepInvoice } from "@/lib/gst/prepare";
import type { Tool, ToolContext } from "../types";

/** Load a user's invoices issued in a given month, with the client's GSTIN. */
async function monthInvoices(ctx: ToolContext, year: number, month1to12: number): Promise<PrepInvoice[]> {
  const supabase = createServiceClient();
  const start = `${year}-${String(month1to12).padStart(2, "0")}-01`;
  const endMonth = month1to12 === 12 ? 1 : month1to12 + 1;
  const endYear = month1to12 === 12 ? year + 1 : year;
  const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const { data } = await supabase
    .from("invoices")
    .select("invoice_number, issue_date, total, subtotal, tax_amount, tax_rate, clients(name, company, gstin)")
    .eq("user_id", ctx.userId)
    .gte("issue_date", start)
    .lt("issue_date", end)
    .neq("status", "cancelled");

  return (data ?? []).map((r) => {
    const c = r.clients as { name?: string; company?: string; gstin?: string } | null;
    return {
      invoice_number: r.invoice_number,
      issue_date: r.issue_date,
      total: Number(r.total),
      subtotal: Number(r.subtotal),
      tax_amount: Number(r.tax_amount),
      tax_rate: Number(r.tax_rate),
      client_gstin: c?.gstin ?? null,
      client_name: c?.company || c?.name || "—",
    };
  });
}

function resolvePeriod(month?: number, year?: number): { year: number; month: number } {
  const now = new Date();
  return { year: year ?? now.getFullYear(), month: month ?? now.getMonth() + 1 };
}

export const prepareGstReturnTool: Tool = {
  name: "prepare_gst_return",
  description:
    "Prepare this month's (or a chosen month's) GST return from the user's invoices: classify B2B vs B2C, compute the GSTR-1 sections and the GSTR-3B tax summary (taxable value, IGST/CGST/SGST, total tax). Use when the user asks to file or prepare GST. Read-only — does not file anything.",
  schema: z.object({
    month: z.number().int().min(1).max(12).optional().describe("1-12; defaults to current month."),
    year: z.number().int().optional().describe("defaults to current year."),
  }),
  handler: async (input, ctx) => {
    const { month, year } = resolvePeriod((input as { month?: number }).month, (input as { year?: number }).year);
    const invoices = await monthInvoices(ctx, year, month);
    if (invoices.length === 0) {
      return { empty: true, period: retPeriod(year, month), message: "No invoices issued in this period." };
    }
    const { summary } = prepareReturn(invoices, year, month);
    return { summary, sandbox: whitebooksConfigured(), gstin: GST_ACCOUNT.gstin };
  },
};

export const requestGstOtpTool: Tool = {
  name: "request_gst_otp",
  description:
    "Start GST e-filing on the WhiteBooks sandbox by requesting an OTP for the test GST account. Call this before file_gst_return. The OTP is delivered to the registered sandbox contact.",
  requiresConfirmation: true,
  schema: z.object({}),
  handler: async (_input, ctx) => {
    if (!whitebooksConfigured()) return { error: "GST sandbox is not configured." };
    const res = await wbCall({
      path: "/authentication/otprequest",
      query: { email: registeredEmail() },
      gstUsername: GST_ACCOUNT.username,
      stateCode: GST_ACCOUNT.stateCode,
    });
    if (!res.ok) return { error: res.message ?? "OTP request failed." };
    const txn = extractTxn(res.body);
    if (!txn) return { error: "OTP requested but no transaction id returned." };
    await createServiceClient()
      .from("gst_sessions")
      .upsert({ user_id: ctx.userId, txn, auth_token: null, updated_at: new Date().toISOString() });
    return { otp_sent: true, gstin: GST_ACCOUNT.gstin, message: "OTP sent for the sandbox GST account." };
  },
};

export const fileGstReturnTool: Tool = {
  name: "file_gst_return",
  description:
    "File the GSTR-1 return on the WhiteBooks SANDBOX for a month, using the OTP the user received from request_gst_otp. This saves the return to the sandbox GST portal.",
  requiresConfirmation: true,
  schema: z.object({
    otp: z.string().describe("The OTP the user received after request_gst_otp."),
    month: z.number().int().min(1).max(12).optional(),
    year: z.number().int().optional(),
  }),
  handler: async (input, ctx) => {
    if (!whitebooksConfigured()) return { error: "GST sandbox is not configured." };
    const args = input as { otp: string; month?: number; year?: number };
    const { year, month } = resolvePeriod(args.month, args.year);

    const supabase = createServiceClient();
    const { data: session } = await supabase
      .from("gst_sessions")
      .select("txn")
      .eq("user_id", ctx.userId)
      .single();
    if (!session?.txn) return { error: "No OTP request found. Ask me to request a GST OTP first." };

    // Exchange OTP for an auth token.
    const auth = await wbCall({
      path: "/authentication/authtoken",
      query: { email: registeredEmail(), otp: args.otp },
      gstUsername: GST_ACCOUNT.username,
      stateCode: GST_ACCOUNT.stateCode,
      txn: session.txn,
    });
    if (!auth.ok) return { error: auth.message ?? "OTP verification failed." };
    const token = extractTxn(auth.body) ?? session.txn;

    const invoices = await monthInvoices(ctx, year, month);
    if (invoices.length === 0) return { error: "No invoices to file for this period." };
    const { summary, payload } = prepareReturn(invoices, year, month);
    const ret_period = retPeriod(year, month);

    const save = await wbCall({
      path: "/gstr1/retsave",
      method: "PUT",
      query: { email: registeredEmail() },
      body: payload,
      gstUsername: GST_ACCOUNT.username,
      stateCode: GST_ACCOUNT.stateCode,
      txn: token,
      authToken: token,
      extraHeaders: { gstin: GST_ACCOUNT.gstin, ret_period },
    });

    await supabase.from("gst_sessions").update({ auth_token: token }).eq("user_id", ctx.userId);

    if (!save.ok) return { error: `Sandbox save failed: ${save.message ?? "unknown error"}` };
    return {
      filed: true,
      sandbox: true,
      period: ret_period,
      gstin: GST_ACCOUNT.gstin,
      summary,
      reference: save.body,
    };
  },
};
