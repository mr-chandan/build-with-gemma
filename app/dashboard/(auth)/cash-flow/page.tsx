import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ArrowDownLeftIcon, ArrowUpRightIcon, ReceiptTextIcon, WalletIcon } from "lucide-react";

import { createServiceClient } from "@/utils/supabase/service";
import { createClient } from "@/utils/supabase/server";
import { inr } from "@/lib/format";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import CashFlowList, { CashEntry } from "./cash-flow-list";

export const metadata: Metadata = { title: "Cash Flow — Kubera.ai" };
export const dynamic = "force-dynamic";

/** Percentage change from `prev` to `curr`; null when there's no prior baseline. */
function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

export default async function CashFlowPage() {
  const cookieStore = await cookies();
  const {
    data: { user },
  } = await createClient(cookieStore).auth.getUser();

  const supabase = createServiceClient();
  const { data: entries } = await supabase
    .from("cash_flow_entries")
    .select("id, entry_date, type, category, description, amount, source")
    .eq("user_id", user?.id ?? "")
    .order("entry_date", { ascending: false })
    .limit(100);

  const rows: CashEntry[] = (entries ?? []).map((r) => ({
    id: r.id,
    date: r.entry_date,
    description: r.description || r.category || "—",
    category: r.category || "—",
    source: r.source || "—",
    type: r.type === "inflow" ? "inflow" : "outflow",
    amount: Number(r.amount),
  }));

  const inflow = rows.filter((r) => r.type === "inflow").reduce((s, r) => s + r.amount, 0);
  const outflow = rows.filter((r) => r.type === "outflow").reduce((s, r) => s + r.amount, 0);
  const net = inflow - outflow;

  // Month-over-month deltas based on the entry date.
  const now = new Date();
  const inMonth = (iso: string, monthsAgo: number) => {
    const d = new Date(iso);
    const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    return d.getMonth() === target.getMonth() && d.getFullYear() === target.getFullYear();
  };
  const sumBy = (pred: (r: CashEntry) => boolean, pick: (r: CashEntry) => number) =>
    rows.filter(pred).reduce((s, r) => s + pick(r), 0);
  const countBy = (pred: (r: CashEntry) => boolean) => rows.filter(pred).length;

  const inflowCur = sumBy((r) => r.type === "inflow" && inMonth(r.date, 0), (r) => r.amount);
  const inflowPrev = sumBy((r) => r.type === "inflow" && inMonth(r.date, 1), (r) => r.amount);
  const outflowCur = sumBy((r) => r.type === "outflow" && inMonth(r.date, 0), (r) => r.amount);
  const outflowPrev = sumBy((r) => r.type === "outflow" && inMonth(r.date, 1), (r) => r.amount);
  const netCur = inflowCur - outflowCur;
  const netPrev = inflowPrev - outflowPrev;
  const countCur = countBy((r) => inMonth(r.date, 0));
  const countPrev = countBy((r) => inMonth(r.date, 1));

  const metrics = [
    {
      label: "Total Inflow",
      value: inr(inflow),
      delta: pctChange(inflowCur, inflowPrev),
      icon: <ArrowDownLeftIcon className="text-muted-foreground/50 size-4 lg:size-6" />,
    },
    {
      label: "Total Outflow",
      value: inr(outflow),
      delta: pctChange(outflowCur, outflowPrev),
      icon: <ArrowUpRightIcon className="text-muted-foreground/50 size-4 lg:size-6" />,
    },
    {
      label: "Net Position",
      value: inr(net),
      delta: pctChange(netCur, netPrev),
      icon: <WalletIcon className="text-muted-foreground/50 size-4 lg:size-6" />,
    },
    {
      label: "Entries",
      value: String(rows.length),
      delta: pctChange(countCur, countPrev),
      icon: <ReceiptTextIcon className="text-muted-foreground/50 size-4 lg:size-6" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cash Flow</h1>
        <p className="text-muted-foreground text-sm">Inflows, outflows, and your net position.</p>
      </div>

      <div className="*:data-[slot=card]:from-primary/10 grid gap-4 *:data-[slot=card]:bg-gradient-to-t md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WalletIcon />
            </EmptyMedia>
            <EmptyTitle>No cash-flow entries yet</EmptyTitle>
            <EmptyDescription>
              Recording an invoice payment adds an inflow automatically, or ask Kubera to add one.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <CashFlowList data={rows} />
      )}
    </div>
  );
}

/** Project-management-style KPI card: title, delta line, big value, and a corner icon. */
function MetricCard({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: string;
  delta: number | null;
  icon: React.ReactNode;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardDescription>
          {delta === null ? (
            <span>No prior month to compare</span>
          ) : (
            <>
              <span className={positive ? "text-green-600" : "text-red-600"}>
                {positive ? "+" : "−"}
                {Math.abs(delta).toFixed(1)}%
              </span>{" "}
              from last month
            </>
          )}
        </CardDescription>
        <CardAction>{icon}</CardAction>
      </CardHeader>
      <CardContent>
        <div className="font-display text-2xl lg:text-3xl">{value}</div>
      </CardContent>
    </Card>
  );
}
