"use client";

import {
  CheckIcon,
  XIcon,
  FileTextIcon,
  UserPlusIcon,
  ReceiptIndianRupeeIcon,
  AlertTriangleIcon,
  MailCheckIcon,
  BellIcon,
  CalendarClockIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function inr(n: number | string | undefined | null): string {
  const v = typeof n === "string" ? Number(n) : (n ?? 0);
  return "₹" + (v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  sent: "secondary",
  draft: "outline",
  overdue: "destructive",
  cancelled: "outline",
};

type Row = Record<string, unknown>;
function clientName(row: Row): string {
  const c = row.clients as { name?: string; company?: string } | undefined;
  return c?.company || c?.name || "—";
}

/** Renders a tool result as a rich card, switching on the tool name.
 *  `onAction` lets a card trigger a follow-up chat message (e.g. "Send reminder"). */
export function ToolResultCard({
  name,
  result,
  onAction,
}: {
  name: string;
  result: unknown;
  onAction?: (prompt: string) => void;
}) {
  const data = (result ?? {}) as Row;

  if (data.error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="text-destructive flex items-center gap-2 p-4 text-sm">
          <AlertTriangleIcon className="size-4" />
          {String(data.error)}
        </CardContent>
      </Card>
    );
  }

  if (name === "create_client") {
    const c = data.client as Row;
    return (
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
          <UserPlusIcon className="text-primary size-4" />
          <CardTitle className="text-sm">Client added</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="font-medium">{String(c?.company || c?.name)}</div>
          <div className="text-muted-foreground">{String(c?.email ?? "")}</div>
          {c?.gstin ? <div className="text-muted-foreground text-xs">GSTIN: {String(c.gstin)}</div> : null}
        </CardContent>
      </Card>
    );
  }

  if (name === "create_invoice") {
    const inv = data.invoice as Row;
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <FileTextIcon className="text-primary size-4" />
            <CardTitle className="text-sm">Invoice {String(inv?.invoice_number)}</CardTitle>
          </div>
          <Badge variant="secondary">{String(inv?.status ?? "sent")}</Badge>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <Row2 label="Subtotal" value={inr(inv?.subtotal as number)} />
          <Row2 label="GST" value={inr(inv?.tax_amount as number)} />
          <div className="flex justify-between border-t pt-1 font-medium">
            <span>Total</span>
            <span>{inr(inv?.total as number)}</span>
          </div>
          <div className="text-muted-foreground text-xs">Due {String(inv?.due_date ?? "")}</div>
        </CardContent>
      </Card>
    );
  }

  if (name === "record_payment") {
    return (
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
          <ReceiptIndianRupeeIcon className="text-primary size-4" />
          <CardTitle className="text-sm">Payment recorded — {String(data.invoice_number)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <Row2 label="Paid" value={inr(data.amount_paid as number)} />
          <Row2 label="Total" value={inr(data.total as number)} />
          <Row2 label="Balance" value={inr(data.balance as number)} />
          <Badge variant={data.status === "paid" ? "default" : "secondary"}>{String(data.status)}</Badge>
        </CardContent>
      </Card>
    );
  }

  if (name === "send_invoice_reminder") {
    return (
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
          <MailCheckIcon className="size-4 text-emerald-600" />
          <CardTitle className="text-sm">Reminder sent — {String(data.invoice_number)}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="text-muted-foreground">
            Emailed <span className="text-foreground">{String(data.sent_to)}</span> for{" "}
            {inr(data.amount as number)}
            {data.overdue ? " (overdue)" : ""}.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (name === "list_deadlines") {
    const rows = (data.deadlines ?? []) as Row[];
    if (!rows.length) return <EmptyCard text="No upcoming deadlines." />;
    return (
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
          <CalendarClockIcon className="text-primary size-4" />
          <CardTitle className="text-sm">Upcoming deadlines ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map((d, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{String(d.title)}</span>
              <div className="flex shrink-0 items-center gap-2">
                {d.amount ? <span className="text-muted-foreground text-xs">{inr(d.amount as number)}</span> : null}
                <Badge variant={d.overdue ? "destructive" : "outline"}>{String(d.date)}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (name === "list_invoices" || name === "list_overdue_invoices") {
    const rows = (data.invoices ?? data.overdue ?? []) as Row[];
    if (!rows.length) {
      return <EmptyCard text={name === "list_overdue_invoices" ? "No overdue invoices 🎉" : "No invoices yet."} />;
    }
    const isOverdueList = name === "list_overdue_invoices";
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {isOverdueList ? "Overdue invoices" : "Invoices"} ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>{isOverdueList ? "Action" : "Status / Due"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={String(r.id)}>
                  <TableCell className="font-medium">{String(r.invoice_number)}</TableCell>
                  <TableCell>{clientName(r)}</TableCell>
                  <TableCell className="text-right">{inr(r.total as number)}</TableCell>
                  <TableCell>
                    {isOverdueList && onAction ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                        onClick={() =>
                          onAction(`Send a payment reminder for invoice ${String(r.invoice_number)}.`)
                        }>
                        <BellIcon className="size-3" /> Send reminder
                      </Button>
                    ) : r.status ? (
                      <Badge variant={STATUS_VARIANT[String(r.status)] ?? "secondary"}>
                        {String(r.status)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">due {String(r.due_date)}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (name === "list_clients") {
    const rows = (data.clients ?? []) as Row[];
    if (!rows.length) return <EmptyCard text="No clients yet." />;
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Clients ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map((r) => (
            <div key={String(r.id)} className="flex items-center justify-between text-sm">
              <span className="font-medium">{String(r.company || r.name)}</span>
              <span className="text-muted-foreground text-xs">{String(r.email)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Fallback: compact JSON.
  return (
    <Card>
      <CardContent className="p-3">
        <pre className="text-muted-foreground overflow-x-auto text-xs">{JSON.stringify(result, null, 2)}</pre>
      </CardContent>
    </Card>
  );
}

function Row2({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-muted-foreground flex justify-between">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="text-muted-foreground p-4 text-sm">{text}</CardContent>
    </Card>
  );
}

const CONFIRM_TITLES: Record<string, string> = {
  create_invoice: "Create invoice",
  record_payment: "Record payment",
  create_client: "Create client",
  send_invoice_reminder: "Send payment reminder",
};

const FIELD_LABELS: Record<string, string> = {
  invoice_type: "Type",
  invoice_number: "Invoice",
  due_date: "Due date",
  tax_rate: "GST",
  notes: "Notes",
  custom_message: "Message",
  name: "Name",
  email: "Email",
  company: "Company",
  gstin: "GSTIN",
  phone: "Phone",
  address: "Address",
  amount: "Amount",
  method: "Method",
  reference: "Reference",
  paid_on: "Date",
};

// Internal ids and structured fields are handled separately or hidden.
const CONFIRM_HIDDEN = new Set(["client_id", "invoice_id", "id", "items"]);

type LineItem = { description?: string; quantity?: number; unit_price?: number };

function confirmValue(key: string, value: unknown): string {
  if (key === "tax_rate") return `${value}%`;
  if (key === "amount") return inr(value as number);
  if (key === "invoice_type") return String(value).toUpperCase();
  return String(value);
}

/** Human-in-the-loop confirmation — a readable preview of what will happen (no JSON). */
export function ConfirmCard({
  name,
  args,
  onApprove,
  onReject,
  disabled,
}: {
  name: string;
  args: Record<string, unknown>;
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
}) {
  const title = CONFIRM_TITLES[name] ?? name;
  const items = (Array.isArray(args.items) ? args.items : []) as LineItem[];
  const taxRate = Number(args.tax_rate ?? 18);

  const rows = items.map((it) => ({
    description: it.description ?? "Item",
    quantity: Number(it.quantity ?? 1),
    unit_price: Number(it.unit_price ?? 0),
    amount: Number(it.quantity ?? 1) * Number(it.unit_price ?? 0),
  }));
  const subtotal = rows.reduce((s, r) => s + r.amount, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const entries = Object.entries(args).filter(
    ([k, v]) => !CONFIRM_HIDDEN.has(k) && v !== null && v !== undefined && v !== "" && typeof v !== "object"
  );

  return (
    <div className="bg-background animate-in fade-in slide-in-from-bottom-2 w-full overflow-hidden rounded-xl border shadow-sm">
      {/* Header — amber accent signals a human decision is needed */}
      <div className="flex items-center gap-2.5 border-b bg-amber-50/70 px-4 py-2.5 dark:bg-amber-950/20">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
          <AlertTriangleIcon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm leading-tight font-semibold">{title}</p>
          <p className="text-muted-foreground text-xs">Review and approve to continue</p>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        {entries.length > 0 && (
          <dl className="space-y-1.5">
            {entries.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 text-sm">
                <dt className="text-muted-foreground shrink-0">{FIELD_LABELS[k] ?? k}</dt>
                <dd className="text-foreground truncate text-right font-medium">{confirmValue(k, v)}</dd>
              </div>
            ))}
          </dl>
        )}

        {rows.length > 0 && (
          <div className="bg-muted/30 rounded-lg border p-2.5">
            <p className="text-muted-foreground mb-1.5 text-xs font-medium">Line items</p>
            <div className="space-y-1">
              {rows.map((r, i) => (
                <div key={i} className="flex justify-between gap-3 text-sm">
                  <span className="text-foreground min-w-0 truncate">
                    {r.description}
                    <span className="text-muted-foreground"> · {r.quantity} × {inr(r.unit_price)}</span>
                  </span>
                  <span className="text-foreground shrink-0 tabular-nums">{inr(r.amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-1.5 space-y-1 border-t pt-1.5 text-sm">
              <div className="text-muted-foreground flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums">{inr(subtotal)}</span>
              </div>
              <div className="text-muted-foreground flex justify-between">
                <span>GST ({taxRate}%)</span>
                <span className="tabular-nums">{inr(tax)}</span>
              </div>
              <div className="text-foreground flex justify-between font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{inr(total)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t px-4 py-2.5">
        <Button size="sm" onClick={onApprove} disabled={disabled} className="flex-1 gap-1.5">
          <CheckIcon className="size-4" /> Approve
        </Button>
        <Button size="sm" variant="outline" onClick={onReject} disabled={disabled} className="flex-1 gap-1.5">
          <XIcon className="size-4" /> Cancel
        </Button>
      </div>
    </div>
  );
}
