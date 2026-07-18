import { z } from "zod";

import { createServiceClient } from "@/utils/supabase/service";
import type { Tool } from "../types";

const round = (n: number) => Number(n.toFixed(2));

/**
 * Cash-flow & liquidity summary — the numbers the model needs to reason about runway,
 * burn rate, and affordability decisions ("can I hire someone at ₹X/month?").
 * Aggregates cash_flow_entries into monthly buckets and adds outstanding receivables.
 */
export const getCashFlowSummaryTool: Tool = {
  name: "get_cash_flow_summary",
  description:
    "Summarize the business's cash flow and liquidity: net cash position, this/last month inflow & outflow, average monthly inflow/outflow (burn rate), estimated runway in months, and outstanding receivables from unpaid invoices. Use this for ANY question about cash flow, liquidity, runway, whether the business can afford a new expense or hire, or a short cash-flow forecast.",
  schema: z.object({
    months: z
      .number()
      .int()
      .positive()
      .max(24)
      .default(6)
      .describe("How many recent months to average over for burn rate / forecasting."),
  }),
  handler: async (input, ctx) => {
    const { months } = input as { months: number };
    const supabase = createServiceClient();

    const { data: entries, error } = await supabase
      .from("cash_flow_entries")
      .select("entry_date, type, amount")
      .eq("user_id", ctx.userId)
      .order("entry_date", { ascending: false })
      .limit(1000);
    if (error) return { error: error.message };

    const rows = entries ?? [];

    const monthKey = (iso: string) => String(iso).slice(0, 7); // YYYY-MM
    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

    // Bucket inflow/outflow per month.
    const byMonth = new Map<string, { inflow: number; outflow: number }>();
    let totalInflow = 0;
    let totalOutflow = 0;
    for (const r of rows) {
      const amt = Number(r.amount) || 0;
      const key = monthKey(r.entry_date);
      const bucket = byMonth.get(key) ?? { inflow: 0, outflow: 0 };
      if (r.type === "inflow") {
        bucket.inflow += amt;
        totalInflow += amt;
      } else {
        bucket.outflow += amt;
        totalOutflow += amt;
      }
      byMonth.set(key, bucket);
    }

    const netPosition = totalInflow - totalOutflow;

    // Average over the most recent `months` distinct months that have data.
    const recentKeys = [...byMonth.keys()].sort().reverse().slice(0, months);
    const denom = recentKeys.length || 1;
    const recentInflow = recentKeys.reduce((s, k) => s + (byMonth.get(k)?.inflow ?? 0), 0);
    const recentOutflow = recentKeys.reduce((s, k) => s + (byMonth.get(k)?.outflow ?? 0), 0);
    const avgMonthlyInflow = recentInflow / denom;
    const avgMonthlyOutflow = recentOutflow / denom;
    const avgMonthlyNet = avgMonthlyInflow - avgMonthlyOutflow;

    // Runway: how many months the current net position lasts at the average burn.
    const runwayMonths =
      avgMonthlyOutflow > 0 ? round(netPosition / avgMonthlyOutflow) : null;

    const cur = byMonth.get(curKey) ?? { inflow: 0, outflow: 0 };
    const pv = byMonth.get(prevKey) ?? { inflow: 0, outflow: 0 };

    // Outstanding receivables (expected future inflow) from unpaid invoices.
    const { data: invoices } = await supabase
      .from("invoices")
      .select("total, amount_paid, status")
      .eq("user_id", ctx.userId)
      .in("status", ["sent", "overdue", "partial"]);
    const outstandingReceivables = (invoices ?? []).reduce(
      (s, i) => s + Math.max(0, Number(i.total) - Number(i.amount_paid)),
      0
    );

    return {
      currency: "INR",
      net_position: round(netPosition),
      this_month: { inflow: round(cur.inflow), outflow: round(cur.outflow), net: round(cur.inflow - cur.outflow) },
      last_month: { inflow: round(pv.inflow), outflow: round(pv.outflow), net: round(pv.inflow - pv.outflow) },
      averaged_over_months: recentKeys.length,
      avg_monthly_inflow: round(avgMonthlyInflow),
      avg_monthly_outflow: round(avgMonthlyOutflow),
      avg_monthly_net: round(avgMonthlyNet),
      runway_months: runwayMonths,
      outstanding_receivables: round(outstandingReceivables),
      has_data: rows.length > 0,
    };
  },
};
