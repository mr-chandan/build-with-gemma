"use client";

import { useState, type ReactNode } from "react";
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
  Trash2Icon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { GstUsernameModal } from "./gst-username-modal";
import { formatDate } from "@/lib/format";
import { InvoiceActions } from "@/components/invoice/invoice-actions";
import type { InvoiceDoc } from "@/lib/invoice-pdf";

// Hide the native number-input spinner arrows.
const NO_SPINNER =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

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

/** Up to two uppercase initials for an avatar. */
function initials(s: string): string {
  return (
    s
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
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
      <Card className="border-destructive/40 py-4">
        <CardContent className="flex items-center gap-2.5">
          <span className="bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-lg">
            <AlertTriangleIcon className="size-4" />
          </span>
          <span className="text-destructive text-sm">{String(data.error)}</span>
        </CardContent>
      </Card>
    );
  }

  if (name === "create_client") {
    const c = data.client as Row;
    const displayName = String(c?.company || c?.name || "—");
    const details: Array<[string, string]> = [];
    if (c?.gstin) details.push(["GSTIN", String(c.gstin)]);
    if (c?.phone) details.push(["Phone", String(c.phone)]);
    if (c?.address) details.push(["Address", String(c.address)]);
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <UserPlusIcon className="text-primary size-4" />
          <CardTitle className="text-sm">Client added</CardTitle>
          <Badge variant="secondary" className="ml-auto">New</Badge>
        </CardHeader>
        <CardContent className="space-y-3 border-t pt-3">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {initials(displayName)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{displayName}</div>
              {c?.email ? (
                <div className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                  <MailIcon className="size-3 shrink-0" />
                  <span className="truncate">{String(c.email)}</span>
                </div>
              ) : null}
            </div>
          </div>
          {details.length > 0 && (
            <div className="bg-muted/40 space-y-2.5 rounded-lg px-3 py-2.5 text-xs">
              {details.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <span className="truncate text-right font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (name === "create_invoice") {
    const inv = data.invoice as Row;
    const invClient = inv?.client as { name?: string; company?: string } | undefined;
    const invoiceDoc: InvoiceDoc = {
      invoiceNumber: String(inv?.invoice_number ?? ""),
      client: invClient?.company || invClient?.name || undefined,
      type: inv?.invoice_type ? String(inv.invoice_type) : undefined,
      status: inv?.status ? String(inv.status) : "sent",
      issueDate: inv?.issue_date ? String(inv.issue_date) : undefined,
      dueDate: inv?.due_date ? String(inv.due_date) : undefined,
      items: Array.isArray(inv?.items) ? (inv.items as InvoiceDoc["items"]) : undefined,
      subtotal: inv?.subtotal != null ? Number(inv.subtotal) : undefined,
      taxRate: inv?.tax_rate != null ? Number(inv.tax_rate) : undefined,
      tax: inv?.tax_amount != null ? Number(inv.tax_amount) : undefined,
      total: Number(inv?.total ?? 0),
      notes: inv?.notes ? String(inv.notes) : undefined,
    };
    return (
      <Card className="gap-4 py-4">
        <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
          <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
            <FileTextIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">Invoice {String(inv?.invoice_number)}</CardTitle>
            <CardDescription className="truncate text-xs">
              {invoiceDoc.client ? `${invoiceDoc.client} · ` : ""}Due {formatDate(inv?.due_date as string)}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="capitalize">{String(inv?.status ?? "sent")}</Badge>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/40 space-y-2 rounded-lg px-3 py-3 text-sm">
            <Row2 label="Subtotal" value={inr(inv?.subtotal as number)} />
            <Row2 label="GST" value={inr(inv?.tax_amount as number)} />
            <div className="text-foreground flex items-center justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{inr(inv?.total as number)}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <InvoiceActions doc={invoiceDoc} />
        </CardFooter>
      </Card>
    );
  }

  if (name === "record_payment") {
    return (
      <Card className="gap-4 py-4">
        <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
          <CardIcon>
            <ReceiptIndianRupeeIcon className="size-4" />
          </CardIcon>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">Payment recorded</CardTitle>
            <CardDescription className="text-xs">{String(data.invoice_number)}</CardDescription>
          </div>
          <Badge variant={data.status === "paid" ? "default" : "secondary"} className="capitalize">
            {String(data.status)}
          </Badge>
        </CardHeader>
        <CardContent>
          <SummaryStrip>
            <Row2 label="Paid" value={inr(data.amount_paid as number)} />
            <Row2 label="Total" value={inr(data.total as number)} />
            <TotalRow label="Balance" value={inr(data.balance as number)} />
          </SummaryStrip>
        </CardContent>
      </Card>
    );
  }

  if (name === "send_invoice_reminder") {
    return (
      <Card className="gap-4 py-4">
        <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
          <CardIcon>
            <MailCheckIcon className="size-4" />
          </CardIcon>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">Reminder sent</CardTitle>
            <CardDescription className="text-xs">{String(data.invoice_number)}</CardDescription>
          </div>
          {data.overdue ? <Badge variant="destructive">overdue</Badge> : null}
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Emailed <span className="text-foreground font-medium">{String(data.sent_to)}</span> for{" "}
          <span className="text-foreground font-medium">{inr(data.amount as number)}</span>.
        </CardContent>
      </Card>
    );
  }

  if (name === "create_calendar_event") {
    return (
      <Card className="gap-4 py-4">
        <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
          <CardIcon>
            <CalendarPlusIcon className="size-4" />
          </CardIcon>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">Added to Google Calendar</CardTitle>
            <CardDescription className="text-xs">{formatDate(data.date as string)}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="font-medium">{String(data.summary)}</div>
          {data.link ? (
            <a
              href={String(data.link)}
              target="_blank"
              rel="noreferrer"
              className="text-primary inline-flex text-xs underline underline-offset-2">
              Open in Calendar
            </a>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (name === "send_gmail") {
    return (
      <Card className="gap-4 py-4">
        <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
          <CardIcon>
            <SendIcon className="size-4" />
          </CardIcon>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">Email sent from Gmail</CardTitle>
            <CardDescription className="truncate text-xs">To {String(data.to)}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="text-muted-foreground truncate">{String(data.subject)}</div>
        </CardContent>
      </Card>
    );
  }

  if (name === "list_gmail") {
    const rows = (data.messages ?? []) as Row[];
    if (!rows.length) return <EmptyCard text="No emails found." />;
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <MailIcon className="text-primary size-4" />
          <CardTitle className="text-sm">Inbox ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 border-t pt-3">
          {rows.map((m, i) => (
            <div key={i} className="flex items-center gap-3 border-b pb-2.5 last:border-0 last:pb-0">
              <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                <MailIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{String(m.subject)}</div>
                <div className="text-muted-foreground truncate text-xs">{String(m.from)}</div>
                <div className="text-muted-foreground truncate text-xs">{String(m.snippet)}</div>
              </div>
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
      <Card className="gap-4 py-4">
        <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
          <CardIcon>
            <CalendarIcon className="size-4" />
          </CardIcon>
          <CardTitle className="text-sm">Upcoming events ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 border-t pt-3">
          {rows.map((e, i) => (
            <div key={i} className="flex items-center gap-3 border-b pb-2.5 last:border-0 last:pb-0">
              <CardIcon>
                <CalendarIcon className="size-4" />
              </CardIcon>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{String(e.summary)}</div>
                <div className="text-muted-foreground truncate text-xs">
                  {String(e.start).slice(0, 16).replace("T", " ")}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (name === "request_gst_otp") {
    if (data.needsUsername) {
      return (
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
            <KeyRoundIcon className="text-primary size-4" />
            <CardTitle className="text-sm">GST portal username needed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">
              To file, add your GST portal username. The OTP will be sent to your GST-registered
              mobile.
            </p>
            <GstUsernameModal
              onSaved={() =>
                onAction?.("I've added my GST portal username. Please request the OTP now.")
              }
            />
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
          <KeyRoundIcon className="text-primary size-4" />
          <CardTitle className="text-sm">OTP sent to your registered mobile</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          A GST portal OTP was sent for {String(data.gstin ?? "your GSTIN")}. Tell me the OTP to
          file the return.
        </CardContent>
      </Card>
    );
  }

  if (name === "prepare_gst_return" || name === "file_gst_return") {
    if (data.empty) return <EmptyCard text={`No invoices in ${String(data.period ?? "this period")} to prepare GST for.`} />;
    if (data.needsProfile) return <EmptyCard text="Tell me your GSTIN first so I can prepare your GST return." />;
    const filed = name === "file_gst_return" && data.filed;
    const s = (data.summary ?? {}) as Row;
    const counts = (s.counts ?? {}) as Row;
    return (
      <Card className="gap-4 py-4">
        <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
          <CardIcon>
            <LandmarkIcon className="size-4" />
          </CardIcon>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">{filed ? "GSTR-1 filed" : "GST return prepared"}</CardTitle>
            <CardDescription className="text-xs">{String(s.period ?? "")}</CardDescription>
          </div>
          <Badge variant={filed ? "default" : "secondary"}>{filed ? "filed" : "GSTR-1 + 3B"}</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          <SummaryStrip>
            <Row2 label="Invoices" value={`${String(counts.total ?? 0)} (B2B ${String(counts.b2b ?? 0)} · B2C ${String(counts.b2c ?? 0)})`} />
            <Row2 label="Taxable value" value={inr(s.taxable as number)} />
            <Row2 label="IGST" value={inr(s.igst as number)} />
            <Row2 label="CGST" value={inr(s.cgst as number)} />
            <Row2 label="SGST" value={inr(s.sgst as number)} />
            <TotalRow label="Total tax (GSTR-3B)" value={inr(s.totalTax as number)} />
          </SummaryStrip>
          <p className="text-muted-foreground text-xs">GSTIN {String(data.gstin ?? "")}</p>
        </CardContent>
      </Card>
    );
  }

  if (name === "set_gst_profile" || name === "get_gst_details") {
    const d = (data.details ?? {}) as Row;
    return (
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
          <LandmarkIcon className="text-primary size-4" />
          <CardTitle className="text-sm">
            {name === "set_gst_profile" ? "GST profile saved & verified" : "GST taxpayer details"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="font-medium">{String(d.legalName ?? d.tradeName ?? d.gstin ?? "—")}</div>
          <Row2 label="GSTIN" value={String(d.gstin ?? "")} />
          {d.tradeName ? <Row2 label="Trade name" value={String(d.tradeName)} /> : null}
          {d.status ? <Row2 label="Status" value={String(d.status)} /> : null}
          {d.taxpayerType ? <Row2 label="Type" value={String(d.taxpayerType)} /> : null}
          {d.constitution ? <Row2 label="Constitution" value={String(d.constitution)} /> : null}
          {d.registrationDate ? <Row2 label="Registered" value={String(d.registrationDate)} /> : null}
          {d.address ? <p className="text-muted-foreground pt-1 text-xs">{String(d.address)}</p> : null}
        </CardContent>
      </Card>
    );
  }

  if (name === "get_gst_return_status") {
    const rows = (data.filings ?? []) as Row[];
    if (!rows.length) return <EmptyCard text={`No filings found for ${String(data.fy ?? "")}.`} />;
    return (
      <Card className="gap-4 py-4">
        <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
          <CardIcon>
            <KeyRoundIcon className="size-4" />
          </CardIcon>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">GST filings — {String(data.fy ?? "")}</CardTitle>
            <CardDescription className="text-xs">{rows.length} return(s)</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Filed</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{String(r.rtntype)}</TableCell>
                  <TableCell>{String(r.ret_prd)}</TableCell>
                  <TableCell className="text-muted-foreground">{String(r.dof || "—")}</TableCell>
                  <TableCell>
                    <Badge variant={String(r.status).toUpperCase() === "FILED" ? "default" : "secondary"}>
                      {String(r.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (name === "list_deadlines") {
    const rows = (data.deadlines ?? []) as Row[];
    if (!rows.length) return <EmptyCard text="No upcoming deadlines." />;
    return (
      <Card className="gap-4 py-4">
        <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
          <CardIcon>
            <CalendarClockIcon className="size-4" />
          </CardIcon>
          <CardTitle className="text-sm">Upcoming deadlines ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 border-t pt-3">
          {rows.map((d, i) => (
            <div key={i} className="flex items-center gap-3 border-b pb-2.5 last:border-0 last:pb-0">
              <CardIcon>
                <CalendarClockIcon className="size-4" />
              </CardIcon>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{String(d.title)}</div>
                {d.amount ? (
                  <div className="text-muted-foreground text-xs tabular-nums">{inr(d.amount as number)}</div>
                ) : null}
              </div>
              <Badge variant={d.overdue ? "destructive" : "outline"} className="shrink-0">
                {String(d.date)}
              </Badge>
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
      <Card className="gap-4 py-4">
        <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
          <CardIcon>
            {isOverdueList ? <AlertTriangleIcon className="size-4" /> : <FileTextIcon className="size-4" />}
          </CardIcon>
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
      <Card className="gap-4 py-4">
        <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
          <CardIcon>
            <UsersIcon className="size-4" />
          </CardIcon>
          <CardTitle className="text-sm">Clients ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 border-t pt-3">
          {rows.map((r) => {
            const display = String(r.company || r.name || "—");
            return (
              <div
                key={String(r.id)}
                className="flex items-center gap-3 border-b pb-2.5 last:border-0 last:pb-0">
                <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                  {initials(display)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{display}</div>
                  {r.email ? (
                    <div className="text-muted-foreground truncate text-xs">{String(r.email)}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  if (name === "get_cash_flow_summary") {
    if (!data.has_data) {
      return (
        <EmptyCard text="No cash-flow history yet. Record an invoice payment or log an expense to get started." />
      );
    }
    const tm = (data.this_month ?? {}) as Row;
    const avgNet = Number(data.avg_monthly_net ?? 0);
    const healthy = avgNet >= 0;
    const runway = data.runway_months;
    return (
      <Card className="gap-4 py-4">
        <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
          <CardIcon>
            <WalletIcon className="size-4" />
          </CardIcon>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">Cash flow &amp; liquidity</CardTitle>
            <CardDescription className="text-xs">
              Net position {inr(data.net_position as number)}
            </CardDescription>
          </div>
          <Badge variant={healthy ? "default" : "destructive"}>
            {healthy ? "surplus" : "burning"}
          </Badge>
        </CardHeader>
        <CardContent>
          <SummaryStrip>
            <Row2 label="This month (net)" value={inr(tm.net as number)} />
            <Row2 label="Avg monthly inflow" value={inr(data.avg_monthly_inflow as number)} />
            <Row2 label="Avg monthly outflow" value={inr(data.avg_monthly_outflow as number)} />
            <Row2 label="Avg monthly net" value={inr(data.avg_monthly_net as number)} />
            <Row2 label="Outstanding receivables" value={inr(data.outstanding_receivables as number)} />
            <TotalRow label="Runway" value={runway == null ? "—" : `${String(runway)} mo`} />
          </SummaryStrip>
        </CardContent>
      </Card>
    );
  }

  // Fallback: compact JSON.
  return (
    <Card className="py-4">
      <CardContent>
        <pre className="text-muted-foreground bg-muted/40 overflow-x-auto rounded-lg p-3 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}

function Row2({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-muted-foreground flex justify-between">
      <span>{label}</span>
      <span className="text-foreground tabular-nums">{value}</span>
    </div>
  );
}

/** The standard rounded icon badge used in every card header and list row. */
function CardIcon({ children }: { children: ReactNode }) {
  return (
    <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
      {children}
    </span>
  );
}

/** A muted rounded strip for label/value rows, with an emphasized final total. */
function SummaryStrip({ children }: { children: ReactNode }) {
  return <div className="bg-muted/40 space-y-2 rounded-lg px-3 py-3 text-sm">{children}</div>;
}

/** The emphasized total row inside a SummaryStrip. */
function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-foreground flex items-center justify-between border-t pt-2 text-base font-semibold">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <Card className="py-4">
      <CardContent className="text-muted-foreground text-sm">{text}</CardContent>
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
  set_gst_profile: "Save & verify your GST details",
  request_gst_otp: "Request GST portal OTP",
  file_gst_return: "File GSTR-1 to the GST portal",
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
  month: "Month",
  year: "Year",
  gst_username: "GST username",
  otp: "OTP",
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
    <Card className="animate-in fade-in slide-in-from-bottom-2 gap-4 py-4">
      <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
        <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
          <AlertTriangleIcon className="size-4" />
        </span>
        <div className="min-w-0">
          <CardTitle className="text-sm">{title}</CardTitle>
          <CardDescription>Edit the details if needed, then save.</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {editableEntries.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {editableEntries.map((k) => {
              const spec = EDIT_FIELDS[k];
              return (
                <div key={k} className="space-y-1.5">
                  <Label>{FIELD_LABELS[k] ?? k}</Label>
                  {spec.type === "select" ? (
                    <select
                      value={String(fields[k] ?? "")}
                      onChange={(e) => setField(k, e.target.value)}
                      disabled={disabled}
                      className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm">
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
                      className={spec.type === "number" ? NO_SPINNER : undefined}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {hasItems && (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label>Line items</Label>
              <Button variant="ghost" size="sm" onClick={addItem} disabled={disabled}>
                <PlusIcon /> Add
              </Button>
            </div>
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={it.description ?? ""}
                  placeholder="Description"
                  onChange={(e) => setItem(i, { description: e.target.value })}
                  disabled={disabled}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={String(it.quantity ?? 1)}
                  onChange={(e) => setItem(i, { quantity: Number(e.target.value) })}
                  disabled={disabled}
                  className={`w-16 ${NO_SPINNER}`}
                  title="Qty"
                />
                <Input
                  type="number"
                  value={String(it.unit_price ?? 0)}
                  onChange={(e) => setItem(i, { unit_price: Number(e.target.value) })}
                  disabled={disabled}
                  className={`w-24 ${NO_SPINNER}`}
                  title="Unit price"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(i)}
                  disabled={disabled}
                  title="Delete item">
                  <Trash2Icon />
                </Button>
              </div>
            ))}
          </div>
        )}

        {hasItems && (
          <div className="bg-muted/40 space-y-2 rounded-lg px-3 py-3 text-sm">
            <div className="text-muted-foreground flex justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums">{inr(subtotal)}</span>
            </div>
            <div className="text-muted-foreground flex justify-between">
              <span>GST ({taxRate}%)</span>
              <span className="tabular-nums">{inr(tax)}</span>
            </div>
            <div className="text-foreground flex items-center justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{inr(total)}</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onReject} disabled={disabled}>
          <XIcon /> Cancel
        </Button>
        <Button onClick={save} disabled={disabled}>
          <CheckIcon /> Save &amp; confirm
        </Button>
      </CardFooter>
    </Card>
  );
}
