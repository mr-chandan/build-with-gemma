import type { Metadata } from "next";
import { ArrowDownLeftIcon, ArrowUpRightIcon, WalletIcon } from "lucide-react";

import { createServiceClient } from "@/utils/supabase/service";
import { inr, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export const metadata: Metadata = { title: "Cash Flow — Kubera.ai" };
export const dynamic = "force-dynamic";

export default async function CashFlowPage() {
  const supabase = createServiceClient();
  const { data: entries } = await supabase
    .from("cash_flow_entries")
    .select("id, entry_date, type, category, description, amount, source")
    .order("entry_date", { ascending: false })
    .limit(100);

  const rows = entries ?? [];
  const inflow = rows.filter((r) => r.type === "inflow").reduce((s, r) => s + Number(r.amount), 0);
  const outflow = rows.filter((r) => r.type === "outflow").reduce((s, r) => s + Number(r.amount), 0);
  const net = inflow - outflow;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cash Flow</h1>
        <p className="text-muted-foreground text-sm">Inflows, outflows, and your net position.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Inflow" value={inr(inflow)} icon={<ArrowDownLeftIcon className="size-4 text-emerald-600" />} />
        <StatTile label="Outflow" value={inr(outflow)} icon={<ArrowUpRightIcon className="size-4 text-rose-600" />} />
        <StatTile label="Net" value={inr(net)} accent />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ledger ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">{formatDate(r.entry_date)}</TableCell>
                    <TableCell className="font-medium">{r.description || r.category}</TableCell>
                    <TableCell className="text-muted-foreground">{r.category}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.source}</Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${r.type === "inflow" ? "text-emerald-600" : "text-rose-600"}`}>
                      {r.type === "inflow" ? "+" : "−"}
                      {inr(r.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          {icon}
          {label}
        </div>
        <p className={`mt-1 text-2xl font-semibold tabular-nums ${accent ? "text-primary" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
