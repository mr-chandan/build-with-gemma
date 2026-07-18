import type { Metadata } from "next";
import { FileTextIcon } from "lucide-react";

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

export const metadata: Metadata = { title: "Invoices — Kubera.ai" };
export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  sent: "secondary",
  draft: "outline",
  overdue: "destructive",
  cancelled: "outline",
};

type ClientRef = { name?: string; company?: string } | null;
function clientName(c: ClientRef): string {
  return c?.company || c?.name || "—";
}

function isOverdue(status: string, due: string, paid: number, total: number): boolean {
  return status !== "paid" && total - paid > 0 && new Date(due) < new Date();
}

export default async function InvoicesPage() {
  const supabase = createServiceClient();

  const [{ data: invoices }, { data: payments }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, invoice_type, status, issue_date, due_date, total, amount_paid, clients(name, company)"
      )
      .order("issue_date", { ascending: false }),
    supabase
      .from("invoice_payments")
      .select("id, amount, paid_on, method, reference, invoices(invoice_number)")
      .order("paid_on", { ascending: false })
      .limit(25),
  ]);

  const rows = invoices ?? [];
  const pays = payments ?? [];

  const totalInvoiced = rows.reduce((s, r) => s + Number(r.total), 0);
  const totalCollected = rows.reduce((s, r) => s + Number(r.amount_paid), 0);
  const outstanding = totalInvoiced - totalCollected;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground text-sm">B2B and B2C invoices, payments, and status.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Total invoiced" value={inr(totalInvoiced)} />
        <StatTile label="Collected" value={inr(totalCollected)} />
        <StatTile label="Outstanding" value={inr(outstanding)} accent />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All invoices ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {rows.length === 0 ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileTextIcon />
                </EmptyMedia>
                <EmptyTitle>No invoices yet</EmptyTitle>
                <EmptyDescription>
                  Ask Kubera: “Create a B2B invoice for Acme: 10 hours consulting at ₹5000, due next month”.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const paid = Number(r.amount_paid);
                  const total = Number(r.total);
                  const overdue = isOverdue(r.status, r.due_date, paid, total);
                  const status = overdue ? "overdue" : r.status;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.invoice_number}</TableCell>
                      <TableCell>{clientName(r.clients as ClientRef)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.invoice_type.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{inr(total)}</TableCell>
                      <TableCell className="text-right tabular-nums">{inr(paid)}</TableCell>
                      <TableCell className="text-right tabular-nums">{inr(total - paid)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(r.due_date)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>{status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent payments ({pays.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {pays.length === 0 ? (
            <p className="text-muted-foreground px-6 py-4 text-sm">
              No payments recorded yet. Ask Kubera to “record a payment of ₹X for INV-0001”.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pays.map((p) => {
                  const invRef = p.invoices as { invoice_number?: string } | null;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-muted-foreground">{formatDate(p.paid_on)}</TableCell>
                      <TableCell className="font-medium">{invRef?.invoice_number ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{p.method || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{p.reference || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{inr(p.amount)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className={`mt-1 text-2xl font-semibold tabular-nums ${accent ? "text-primary" : ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
