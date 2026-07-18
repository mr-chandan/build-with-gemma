import { z } from "zod";

import { createServiceClient } from "@/utils/supabase/service";
import { whitebooksConfigured, registeredEmail, wbCall, extractTxn } from "@/lib/gst/wb";
import { searchTaxpayer, trackReturns } from "@/lib/gst/public";
import { prepareReturn, retPeriod, type PrepInvoice } from "@/lib/gst/prepare";
import type { Tool, ToolContext } from "../types";

const stateCodeOf = (gstin: string) => (/^\d{2}/.test(gstin) ? gstin.slice(0, 2) : "");

/** The user's saved GST identity (their own GSTIN + portal username). */
async function getGstProfile(userId: string): Promise<{ gstin: string | null; gst_username: string | null }> {
  const { data } = await createServiceClient()
    .from("profiles")
    .select("gstin, gst_username")
    .eq("id", userId)
    .single();
  return { gstin: data?.gstin ?? null, gst_username: data?.gst_username ?? null };
}

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

/** Save the user's GST identity and verify it against the real GST system. */
export const setGstProfileTool: Tool = {
  name: "set_gst_profile",
  description:
    "Save the user's own GST identity and verify the GSTIN against the real GST system. The GSTIN alone is enough to prepare GST returns and look up details. The GST portal username is optional — it is only needed to actually FILE a return. Ask the user for their GSTIN (and username only if they want to file).",
  requiresConfirmation: true,
  schema: z.object({
    gstin: z.string().describe("The user's 15-character GSTIN (required)."),
    gst_username: z.string().optional().describe("GST portal login username — only needed for filing."),
  }),
  handler: async (input, ctx) => {
    const args = input as { gstin: string; gst_username?: string };
    const gstin = args.gstin.trim().toUpperCase();
    if (!/^[0-9]{2}[A-Z0-9]{13}$/.test(gstin)) {
      return { error: "That doesn't look like a valid 15-character GSTIN." };
    }
    if (!whitebooksConfigured()) return { error: "GST API is not configured." };

    const lookup = await searchTaxpayer(gstin);
    if (!lookup.ok) return { error: lookup.message };

    const update: Record<string, unknown> = { gstin, gst_legal_name: lookup.details.legalName };
    if (args.gst_username) update.gst_username = args.gst_username;
    await createServiceClient().from("profiles").update(update).eq("id", ctx.userId);

    return { saved: true, details: lookup.details, gst_username: args.gst_username ?? null };
  },
};

/** Look up real taxpayer details for a GSTIN (public API). */
export const getGstDetailsTool: Tool = {
  name: "get_gst_details",
  description:
    "Fetch real taxpayer details for a GSTIN from the public GST system (legal name, trade name, status, registration date, address). Uses the user's saved GSTIN if none is given; otherwise pass one to look up any GSTIN (e.g. to verify a client).",
  schema: z.object({
    gstin: z.string().optional().describe("GSTIN to look up; defaults to the user's saved GSTIN."),
  }),
  handler: async (input, ctx) => {
    let gstin = (input as { gstin?: string }).gstin?.trim().toUpperCase();
    if (!gstin) gstin = (await getGstProfile(ctx.userId)).gstin ?? undefined;
    if (!gstin) return { error: "No GSTIN provided or saved. Ask the user for their GSTIN." };
    if (!whitebooksConfigured()) return { error: "GST API is not configured." };
    const lookup = await searchTaxpayer(gstin);
    if (!lookup.ok) return { error: lookup.message };
    return { details: lookup.details };
  },
};

/** GST return filing history (public API). */
export const getGstReturnStatusTool: Tool = {
  name: "get_gst_return_status",
  description:
    "Show the GST return filing history/status for a GSTIN from the public GST system (which GSTR-1/GSTR-3B returns were filed and when). Uses the user's saved GSTIN if none is given.",
  schema: z.object({
    gstin: z.string().optional(),
    fy: z.string().optional().describe("Financial year YYYY-YY, e.g. 2025-26; defaults to the current FY."),
  }),
  handler: async (input, ctx) => {
    const args = input as { gstin?: string; fy?: string };
    let gstin = args.gstin?.trim().toUpperCase();
    if (!gstin) gstin = (await getGstProfile(ctx.userId)).gstin ?? undefined;
    if (!gstin) return { error: "No GSTIN provided or saved. Ask the user for their GSTIN." };
    // Default FY: Indian FY starts in April.
    const now = new Date();
    const y = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
    const fy = args.fy ?? `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
    if (!whitebooksConfigured()) return { error: "GST API is not configured." };
    const res = await trackReturns(gstin, fy);
    if (!res.ok) return { error: res.message };
    return { gstin, fy, filings: res.filings, count: res.filings.length };
  },
};

/** Prepare (not file) the GSTR-1 + GSTR-3B summary from the user's invoices. */
export const prepareGstReturnTool: Tool = {
  name: "prepare_gst_return",
  description:
    "Prepare this month's (or a chosen month's) GST return from the user's invoices: classify B2B vs B2C, and compute the GSTR-1 sections plus the GSTR-3B tax summary (taxable value, IGST/CGST/SGST, total tax). Read-only — it does not file. Needs the user's GSTIN saved (set_gst_profile) to use as the supplier.",
  schema: z.object({
    month: z.number().int().min(1).max(12).optional(),
    year: z.number().int().optional(),
  }),
  handler: async (input, ctx) => {
    const { month, year } = resolvePeriod((input as { month?: number }).month, (input as { year?: number }).year);
    const profile = await getGstProfile(ctx.userId);
    if (!profile.gstin) {
      return { needsProfile: true, message: "Ask the user for their GSTIN and GST username, then call set_gst_profile first." };
    }
    const invoices = await monthInvoices(ctx, year, month);
    if (invoices.length === 0) {
      return { empty: true, period: retPeriod(year, month), message: "No invoices issued in this period." };
    }
    const { summary } = prepareReturn(invoices, year, month, profile.gstin);
    return { summary, gstin: profile.gstin };
  },
};

/** Stage 1 of filing: request the GST-portal OTP to the taxpayer's registered mobile. */
export const requestGstOtpTool: Tool = {
  name: "request_gst_otp",
  description:
    "Start filing the GST return by requesting the GST portal OTP. Needs the user's GSTIN saved. If the GST portal username isn't saved yet, this returns needsUsername and the app shows a modal for the user to add it — then call this again. The OTP goes to the taxpayer's own registered mobile/email, so only the real account holder can proceed. Call this after prepare_gst_return, before file_gst_return.",
  schema: z.object({}),
  handler: async (_input, ctx) => {
    if (!whitebooksConfigured()) return { error: "GST API is not configured." };
    const profile = await getGstProfile(ctx.userId);
    if (!profile.gstin) return { error: "Save your GSTIN first (set_gst_profile)." };
    if (!profile.gst_username) {
      return { needsUsername: true, message: "Ask the user for their GST portal username, save it with set_gst_profile, then retry." };
    }
    const res = await wbCall({
      path: "/authentication/otprequest",
      query: { email: registeredEmail() },
      gstUsername: profile.gst_username,
      stateCode: stateCodeOf(profile.gstin),
    });
    if (!res.ok) return { error: res.message ?? "OTP request failed." };
    const txn = extractTxn(res.body);
    if (!txn) return { error: "OTP requested but no transaction id was returned." };
    await createServiceClient()
      .from("gst_sessions")
      .upsert({ user_id: ctx.userId, txn, auth_token: null, updated_at: new Date().toISOString() });
    return { otp_sent: true, gstin: profile.gstin, message: "OTP sent to the GST-registered mobile/email." };
  },
};

/** Stage 2 of filing: verify the OTP and save/file the GSTR-1 for the period. */
export const fileGstReturnTool: Tool = {
  name: "file_gst_return",
  description:
    "File the prepared GSTR-1 return using the OTP the user received from request_gst_otp. This submits the return to the GST portal for the user's own GSTIN — a real, irreversible filing. Confirm the details with the user first.",
  requiresConfirmation: true,
  schema: z.object({
    otp: z.string().describe("The GST portal OTP the user received."),
    month: z.number().int().min(1).max(12).optional(),
    year: z.number().int().optional(),
  }),
  handler: async (input, ctx) => {
    if (!whitebooksConfigured()) return { error: "GST API is not configured." };
    const args = input as { otp: string; month?: number; year?: number };
    const { year, month } = resolvePeriod(args.month, args.year);

    const profile = await getGstProfile(ctx.userId);
    if (!profile.gstin || !profile.gst_username) {
      return { error: "Your GSTIN and GST portal username must be saved before filing." };
    }
    const supabase = createServiceClient();
    const { data: session } = await supabase.from("gst_sessions").select("txn").eq("user_id", ctx.userId).single();
    if (!session?.txn) return { error: "No OTP request found. Ask me to request the GST OTP first." };

    const auth = await wbCall({
      path: "/authentication/authtoken",
      query: { email: registeredEmail(), otp: args.otp },
      gstUsername: profile.gst_username,
      stateCode: stateCodeOf(profile.gstin),
      txn: session.txn,
    });
    if (!auth.ok) return { error: auth.message ?? "OTP verification failed." };
    const token = extractTxn(auth.body) ?? session.txn;

    const invoices = await monthInvoices(ctx, year, month);
    if (invoices.length === 0) return { error: "No invoices to file for this period." };
    const { summary, payload } = prepareReturn(invoices, year, month, profile.gstin);
    const ret_period = retPeriod(year, month);

    const save = await wbCall({
      path: "/gstr1/retsave",
      method: "PUT",
      query: { email: registeredEmail() },
      body: payload,
      gstUsername: profile.gst_username,
      stateCode: stateCodeOf(profile.gstin),
      txn: token,
      authToken: token,
      extraHeaders: { gstin: profile.gstin, ret_period },
    });
    await supabase.from("gst_sessions").update({ auth_token: token }).eq("user_id", ctx.userId);
    if (!save.ok) return { error: `Filing failed: ${save.message ?? "unknown error"}` };
    return { filed: true, period: ret_period, gstin: profile.gstin, summary, reference: save.body };
  },
};
