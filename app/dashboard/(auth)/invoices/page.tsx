import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

import { createServiceClient } from "@/utils/supabase/service";
import { createClient } from "@/utils/supabase/server";
import { inr } from "@/lib/format";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import InvoiceList, { Invoice } from "./invoice-list";

export const metadata: Metadata = { title: "Invoices — Kubera.ai" };
export const dynamic = "force-dynamic";

type ClientRef = { name?: string; company?: string } | null;
function clientName(c: ClientRef): string {
  return c?.company || c?.name || "—";
}

function isOverdue(status: string, due: string, paid: number, total: number): boolean {
  return status !== "paid" && total - paid > 0 && new Date(due) < new Date();
}

/** Percentage change from `prev` to `curr`; null when there's no prior baseline. */
function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

export default async function InvoicesPage() {
  const cookieStore = await cookies();
  const {
    data: { user },
  } = await createClient(cookieStore).auth.getUser();
  const uid = user?.id ?? "";

  const supabase = createServiceClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, invoice_type, status, issue_date, due_date, total, amount_paid, clients(name, company)"
    )
    .eq("user_id", uid)
    .order("issue_date", { ascending: false });

  const raw = invoices ?? [];

  // Flatten rows for the client table, resolving overdue status.
  const rows: Invoice[] = raw.map((r) => {
    const paid = Number(r.amount_paid);
    const total = Number(r.total);
    const overdue = isOverdue(r.status, r.due_date, paid, total);
    return {
      id: r.id,
      invoiceNumber: r.invoice_number,
      client: clientName(r.clients as ClientRef),
      type: r.invoice_type,
      total,
      paid,
      balance: total - paid,
      dueDate: r.due_date,
      status: (overdue ? "overdue" : r.status) as Invoice["status"],
    };
  });

  const totalInvoiced = rows.reduce((s, r) => s + r.total, 0);
  const totalCollected = rows.reduce((s, r) => s + r.paid, 0);
  const outstanding = totalInvoiced - totalCollected;
  const overdueAmount = rows.filter((r) => r.status === "overdue").reduce((s, r) => s + r.balance, 0);

  // Month-over-month deltas based on the invoice issue date.
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const inMonth = (iso: string, monthsAgo: number) => {
    const d = new Date(iso);
    const target = new Date(thisYear, thisMonth - monthsAgo, 1);
    return d.getMonth() === target.getMonth() && d.getFullYear() === target.getFullYear();
  };
  const sumBy = (pred: (r: Invoice) => boolean, pick: (r: Invoice) => number) =>
    rows.filter(pred).reduce((s, r) => s + pick(r), 0);

  const invoicedCur = sumBy((r) => inMonth(r.dueDate, 0), (r) => r.total);
  const invoicedPrev = sumBy((r) => inMonth(r.dueDate, 1), (r) => r.total);
  const collectedCur = sumBy((r) => inMonth(r.dueDate, 0), (r) => r.paid);
  const collectedPrev = sumBy((r) => inMonth(r.dueDate, 1), (r) => r.paid);
  const outstandingCur = sumBy((r) => inMonth(r.dueDate, 0), (r) => r.balance);
  const outstandingPrev = sumBy((r) => inMonth(r.dueDate, 1), (r) => r.balance);
  const overdueCur = sumBy((r) => r.status === "overdue" && inMonth(r.dueDate, 0), (r) => r.balance);
  const overduePrev = sumBy((r) => r.status === "overdue" && inMonth(r.dueDate, 1), (r) => r.balance);

  const metrics = [
    { label: "Total Invoiced", value: totalInvoiced, delta: pctChange(invoicedCur, invoicedPrev) },
    { label: "Total Collected", value: totalCollected, delta: pctChange(collectedCur, collectedPrev) },
    { label: "Outstanding", value: outstanding, delta: pctChange(outstandingCur, outstandingPrev), invert: true },
    { label: "Overdue", value: overdueAmount, delta: pctChange(overdueCur, overduePrev), invert: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground text-sm">B2B and B2C invoices, payments, and status.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      <InvoiceList data={rows} />
    </div>
  );
}

/** Sales-style KPI card: label, big value, and a month-over-month delta line. */
function MetricCard({
  label,
  value,
  delta,
  invert,
}: {
  label: string;
  value: number;
  delta: number | null;
  invert?: boolean;
}) {
  // For "cost" metrics (outstanding/overdue) a rise is bad, so invert the color meaning.
  const good = delta === null ? true : invert ? delta <= 0 : delta >= 0;
  const up = (delta ?? 0) >= 0;
  const Arrow = up ? ArrowUpIcon : ArrowDownIcon;
  const color = good ? "text-green-500" : "text-red-500";

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardDescription>{label}</CardDescription>
        <div className="font-display text-2xl lg:text-3xl">{inr(value)}</div>
        <div className="flex items-center text-xs">
          {delta === null ? (
            <span className="text-muted-foreground">No prior month to compare</span>
          ) : (
            <>
              <Arrow className={`mr-1 size-3 ${color}`} />
              <span className={`font-medium ${color}`}>{Math.abs(delta).toFixed(1)}%</span>
              <span className="text-muted-foreground ml-1">Compare from last month</span>
            </>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
