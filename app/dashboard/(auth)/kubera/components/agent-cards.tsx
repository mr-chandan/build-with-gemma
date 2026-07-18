"use client";

import { useState } from "react";
import {
  CheckIcon,
  XIcon,
  PlusIcon,
  FileTextIcon,
  UserPlusIcon,
  ReceiptIndianRupeeIcon,
  AlertTriangleIcon,
  MailCheckIcon,
  BellIcon,
  CalendarClockIcon,
  CalendarPlusIcon,
  SendIcon,
  MailIcon,
  CalendarIcon,
  LandmarkIcon,
  KeyRoundIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  if (name === "create_calendar_event") {
    return (
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
          <CalendarPlusIcon className="text-primary size-4" />
          <CardTitle className="text-sm">Added to Google Calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="font-medium">{String(data.summary)}</div>
          <div className="text-muted-foreground text-xs">{String(data.date)}</div>
          {data.link ? (
            <a
              href={String(data.link)}
              target="_blank"
              rel="noreferrer"
              className="text-primary text-xs underline underline-offset-2">
              Open in Calendar
            </a>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (name === "send_gmail") {
    return (
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
          <SendIcon className="size-4 text-emerald-600" />
          <CardTitle className="text-sm">Email sent from Gmail</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="text-muted-foreground">
            To <span className="text-foreground">{String(data.to)}</span> — {String(data.subject)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (name === "list_gmail") {
    const rows = (data.messages ?? []) as Row[];
    if (!rows.length) return <EmptyCard text="No emails found." />;
    return (
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
          <MailIcon className="text-primary size-4" />
          <CardTitle className="text-sm">Inbox ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {rows.map((m, i) => (
            <div key={i} className="border-b pb-2 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{String(m.subject)}</span>
              </div>
              <div className="text-muted-foreground truncate text-xs">{String(m.from)}</div>
              <div className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{String(m.snippet)}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (name === "list_calendar_events") {
    const rows = (data.events ?? []) as Row[];
    if (!rows.length) return <EmptyCard text="No upcoming events." />;
    return (
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
          <CalendarIcon className="text-primary size-4" />
          <CardTitle className="text-sm">Upcoming events ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map((e, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{String(e.summary)}</span>
              <span className="text-muted-foreground shrink-0 text-xs">
                {String(e.start).slice(0, 16).replace("T", " ")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (name === "prepare_gst_return" || name === "file_gst_return") {
    if (data.empty) return <EmptyCard text="No invoices in this period to file GST for." />;
    const s = (data.summary ?? {}) as Row;
    const counts = (s.counts ?? {}) as Row;
    const filed = name === "file_gst_return" && data.filed;
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <LandmarkIcon className="text-primary size-4" />
            <CardTitle className="text-sm">
              {filed ? "GSTR-1 filed (sandbox)" : "GST return prepared"} — {String(s.period ?? "")}
            </CardTitle>
          </div>
          {filed ? <Badge variant="default">filed</Badge> : <Badge variant="secondary">draft</Badge>}
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <Row2 label="Invoices" value={`${String(counts.total ?? 0)} (B2B ${String(counts.b2b ?? 0)} · B2C ${String(counts.b2c ?? 0)})`} />
          <Row2 label="Taxable value" value={inr(s.taxable as number)} />
          <Row2 label="IGST" value={inr(s.igst as number)} />
          <Row2 label="CGST" value={inr(s.cgst as number)} />
          <Row2 label="SGST" value={inr(s.sgst as number)} />
          <div className="flex justify-between border-t pt-1 font-medium">
            <span>Total tax (GSTR-3B)</span>
            <span>{inr(s.totalTax as number)}</span>
          </div>
          {!filed && (
            <p className="text-muted-foreground pt-1 text-xs">
              GSTIN {String(data.gstin ?? "")}. Ask me to file it on the sandbox to submit.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (name === "request_gst_otp") {
    return (
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
          <KeyRoundIcon className="text-primary size-4" />
          <CardTitle className="text-sm">GST OTP sent</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          An OTP was sent for the sandbox GST account ({String(data.gstin ?? "")}). Tell me the OTP
          to file the return.
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
  create_calendar_event: "Add to Google Calendar",
  send_gmail: "Send email from Gmail",
  request_gst_otp: "Request GST OTP (sandbox)",
  file_gst_return: "File GSTR-1 on the sandbox",
};

const FIELD_LABELS: Record<string, string> = {
  invoice_type: "Type",
  invoice_number: "Invoice",
  due_date: "Due date",
  tax_rate: "GST",
  notes: "Notes",
  custom_message: "Message",
  summary: "Event",
  date: "Date",
  to: "To",
  subject: "Subject",
  body: "Message",
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
  otp: "OTP",
  month: "Month",
  year: "Year",
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

// Scalar fields that make sense to edit inline, and their input type.
const EDIT_FIELDS: Record<string, { type: "text" | "number" | "date" | "email" | "select"; options?: string[] }> = {
  invoice_type: { type: "select", options: ["b2b", "b2c"] },
  due_date: { type: "date" },
  tax_rate: { type: "number" },
  notes: { type: "text" },
  name: { type: "text" },
  email: { type: "email" },
  company: { type: "text" },
  gstin: { type: "text" },
  phone: { type: "text" },
  address: { type: "text" },
  amount: { type: "number" },
  method: { type: "text" },
  reference: { type: "text" },
  paid_on: { type: "date" },
  invoice_number: { type: "text" },
  custom_message: { type: "text" },
  summary: { type: "text" },
  date: { type: "date" },
  to: { type: "email" },
  subject: { type: "text" },
  body: { type: "text" },
};

/** Human-in-the-loop confirmation — inline-editable fields + Save. The user can tweak the
 *  details right here before it runs; approved values override what the agent proposed. */
export function ConfirmCard({
  name,
  args,
  onApprove,
  onReject,
  disabled,
}: {
  name: string;
  args: Record<string, unknown>;
  onApprove: (edited: Record<string, unknown>) => void;
  onReject: () => void;
  disabled?: boolean;
}) {
  const title = CONFIRM_TITLES[name] ?? name;

  const [fields, setFields] = useState<Record<string, unknown>>(() => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args)) {
      if (!CONFIRM_HIDDEN.has(k) && typeof v !== "object") out[k] = v;
    }
    return out;
  });
  const [items, setItems] = useState<LineItem[]>(() =>
    (Array.isArray(args.items) ? args.items : []).map((it: LineItem) => ({
      description: it.description ?? "",
      quantity: Number(it.quantity ?? 1),
      unit_price: Number(it.unit_price ?? 0),
    }))
  );

  const setField = (k: string, v: unknown) => setFields((p) => ({ ...p, [k]: v }));
  const setItem = (i: number, patch: Partial<LineItem>) =>
    setItems((p) => p.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () => setItems((p) => [...p, { description: "", quantity: 1, unit_price: 0 }]);
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));

  const hasItems = Array.isArray(args.items);
  const taxRate = Number(fields.tax_rate ?? 18);
  const subtotal = items.reduce((s, it) => s + Number(it.quantity ?? 0) * Number(it.unit_price ?? 0), 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const save = () => {
    // Rebuild the full args: preserve hidden ids, apply edited scalar fields + items.
    const edited: Record<string, unknown> = { ...args, ...fields };
    for (const [k, spec] of Object.entries(EDIT_FIELDS)) {
      if (k in edited && spec.type === "number") edited[k] = Number(edited[k]);
    }
    if (hasItems) {
      edited.items = items.map((it) => ({
        description: it.description ?? "",
        quantity: Number(it.quantity ?? 1),
        unit_price: Number(it.unit_price ?? 0),
      }));
    }
    onApprove(edited);
  };

  const editableEntries = Object.keys(fields).filter((k) => EDIT_FIELDS[k]);

  return (
    <div className="bg-background animate-in fade-in slide-in-from-bottom-2 w-full overflow-hidden rounded-xl border shadow-sm">
      <div className="flex items-center gap-2.5 border-b bg-amber-50/70 px-4 py-2.5 dark:bg-amber-950/20">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
          <AlertTriangleIcon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm leading-tight font-semibold">{title}</p>
          <p className="text-muted-foreground text-xs">Edit the details if needed, then save.</p>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        {editableEntries.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5">
            {editableEntries.map((k) => {
              const spec = EDIT_FIELDS[k];
              return (
                <div key={k} className="space-y-1">
                  <Label className="text-muted-foreground text-xs">{FIELD_LABELS[k] ?? k}</Label>
                  {spec.type === "select" ? (
                    <select
                      value={String(fields[k] ?? "")}
                      onChange={(e) => setField(k, e.target.value)}
                      disabled={disabled}
                      className="border-input bg-background h-8 w-full rounded-md border px-2 text-sm">
                      {spec.options?.map((o) => (
                        <option key={o} value={o}>
                          {o.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type={spec.type === "number" ? "number" : spec.type === "date" ? "date" : "text"}
                      value={String(fields[k] ?? "")}
                      onChange={(e) => setField(k, e.target.value)}
                      disabled={disabled}
                      className="h-8 text-sm"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {hasItems && (
          <div className="bg-muted/30 space-y-2 rounded-lg border p-2.5">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs font-medium">Line items</p>
              <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={addItem} disabled={disabled}>
                <PlusIcon className="size-3" /> Add
              </Button>
            </div>
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Input
                  value={it.description ?? ""}
                  placeholder="Description"
                  onChange={(e) => setItem(i, { description: e.target.value })}
                  disabled={disabled}
                  className="h-8 flex-1 text-sm"
                />
                <Input
                  type="number"
                  value={String(it.quantity ?? 1)}
                  onChange={(e) => setItem(i, { quantity: Number(e.target.value) })}
                  disabled={disabled}
                  className="h-8 w-14 text-sm"
                  title="Qty"
                />
                <Input
                  type="number"
                  value={String(it.unit_price ?? 0)}
                  onChange={(e) => setItem(i, { unit_price: Number(e.target.value) })}
                  disabled={disabled}
                  className="h-8 w-20 text-sm"
                  title="Unit price"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => removeItem(i)}
                  disabled={disabled}>
                  <XIcon className="size-3.5" />
                </Button>
              </div>
            ))}
            <div className="space-y-1 border-t pt-1.5 text-sm">
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
        <Button size="sm" onClick={save} disabled={disabled} className="flex-1 gap-1.5">
          <CheckIcon className="size-4" /> Save &amp; confirm
        </Button>
        <Button size="sm" variant="outline" onClick={onReject} disabled={disabled} className="flex-1 gap-1.5">
          <XIcon className="size-4" /> Cancel
        </Button>
      </div>
    </div>
  );
}
