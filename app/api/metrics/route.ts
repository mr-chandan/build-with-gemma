/**
 * Real financial metrics for the signed-in user — powers the chat dashboard cards
 * (cashflow projection, liquidity risk, CFO recommendation, actionable decisions).
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";

export const runtime = "nodejs";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET() {
  const cookieStore = await cookies();
  const {
    data: { user },
  } = await createClient(cookieStore).auth.getUser();
  if (!user) return NextResponse.json({ empty: true });

  const supabase = createServiceClient();
  const [{ data: invoices }, { data: cash }] = await Promise.all([
    supabase
      .from("invoices")
      .select("total, amount_paid, due_date, status")
      .eq("user_id", user.id),
    supabase.from("cash_flow_entries").select("type, amount, entry_date").eq("user_id", user.id),
  ]);

  const inv = invoices ?? [];
  const entries = cash ?? [];
  const today = new Date();

  const invoiced = inv.reduce((s, r) => s + Number(r.total), 0);
  const collected = inv.reduce((s, r) => s + Number(r.amount_paid), 0);
  const outstanding = invoiced - collected;

  const openInvoices = inv.filter((r) => Number(r.amount_paid) < Number(r.total) && r.status !== "cancelled");
  const overdueInvoices = openInvoices.filter((r) => new Date(r.due_date) < today);
  const overdue = overdueInvoices.reduce((s, r) => s + (Number(r.total) - Number(r.amount_paid)), 0);

  const inflow = entries.filter((e) => e.type === "inflow").reduce((s, e) => s + Number(e.amount), 0);
  const outflow = entries.filter((e) => e.type === "outflow").reduce((s, e) => s + Number(e.amount), 0);
  const net = inflow - outflow;

  // Projection: unpaid invoice balances grouped by their due month, next 6 months.
  const projection: { month: string; projected: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const sum = openInvoices
      .filter((r) => {
        const due = new Date(r.due_date);
        return due.getFullYear() === d.getFullYear() && due.getMonth() === d.getMonth();
      })
      .reduce((s, r) => s + (Number(r.total) - Number(r.amount_paid)), 0);
    projection.push({ month: MONTHS[d.getMonth()], projected: Math.round(sum) });
  }

  // Liquidity: of the money owed to you, how much is safe (not yet due) vs at risk (overdue).
  const atRisk = overdue;
  const safeCover = Math.max(0, outstanding - overdue);
  const coverBase = safeCover + atRisk;
  const safePercent = coverBase > 0 ? Math.round((safeCover / coverBase) * 100) : 100;
  const riskPercent = 100 - safePercent;

  // CFO recommendation — the single highest-leverage move.
  let recommendation = "Your receivables are healthy — keep invoicing on time.";
  let rationale = "No overdue invoices and outstanding is under control.";
  if (overdue > 0) {
    recommendation = `Collect ₹${Math.round(overdue).toLocaleString("en-IN")} in overdue invoices`;
    rationale = `${overdueInvoices.length} invoice(s) are past their due date. Clearing them is the fastest way to improve cash on hand.`;
  } else if (net < 0) {
    recommendation = "Rein in outflow — you're cash-flow negative";
    rationale = `Outflow (₹${Math.round(outflow).toLocaleString("en-IN")}) exceeds inflow. Prioritise collecting receivables and deferring non-essential spend.`;
  } else if (outstanding > 0) {
    recommendation = `Follow up ₹${Math.round(outstanding).toLocaleString("en-IN")} in unpaid invoices`;
    rationale = "Bringing these in early strengthens your runway.";
  }

  // Actionable decisions, ranked.
  type Decision = { id: string; title: string; impact: string; urgency: "high" | "medium" | "low"; prompt: string };
  const decisions: Decision[] = [];
  if (overdueInvoices.length > 0) {
    decisions.push({
      id: "overdue",
      title: `Chase ${overdueInvoices.length} overdue invoice(s)`,
      impact: `+₹${Math.round(overdue).toLocaleString("en-IN")}`,
      urgency: "high",
      prompt: "Show my overdue invoices and help me send reminders.",
    });
  }
  const dueSoon = openInvoices.filter((r) => {
    const due = new Date(r.due_date);
    const days = (due.getTime() - today.getTime()) / 86400000;
    return days >= 0 && days <= 7;
  });
  if (dueSoon.length > 0) {
    decisions.push({
      id: "due-soon",
      title: `${dueSoon.length} invoice(s) due this week`,
      impact: `+₹${Math.round(dueSoon.reduce((s, r) => s + (Number(r.total) - Number(r.amount_paid)), 0)).toLocaleString("en-IN")}`,
      urgency: "medium",
      prompt: "Which invoices are due in the next 7 days?",
    });
  }
  decisions.push({
    id: "gst",
    title: "File GSTR-3B for this period",
    impact: "Deadline 20th",
    urgency: "medium",
    prompt: "What GST deadlines are coming up?",
  });
  if (net < 0) {
    decisions.push({
      id: "burn",
      title: "Outflow exceeds inflow",
      impact: `−₹${Math.round(outflow - inflow).toLocaleString("en-IN")}`,
      urgency: "high",
      prompt: "How can I improve my cash flow this month?",
    });
  }

  return NextResponse.json({
    empty: inv.length === 0 && entries.length === 0,
    summary: { invoiced, collected, outstanding, overdue },
    cash: { inflow, outflow, net },
    projection,
    liquidity: { cashPosition: net, safeCover, atRisk, safePercent, riskPercent },
    recommendation: { text: recommendation, rationale },
    decisions,
  });
}
