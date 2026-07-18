"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MoreHorizontal,
  EyeIcon,
  DownloadIcon,
  BanknoteIcon,
  CopyIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr } from "@/lib/format";
import { downloadInvoicePdf, type InvoiceDoc } from "@/lib/invoice-pdf";
import { InvoiceDocument } from "./invoice-document";

export type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  client: string;
  type: string;
  total: number;
  paid: number;
  balance: number;
  dueDate: string;
  status: string;
};

/** Row-level actions for an invoice: view, download, record payment, copy, delete —
 *  all collapsed into a single overflow menu. */
export function InvoiceRowActions({ invoice }: { invoice: InvoiceRow }) {
  const router = useRouter();
  const [viewOpen, setViewOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const doc: InvoiceDoc = {
    invoiceNumber: invoice.invoiceNumber,
    client: invoice.client,
    type: invoice.type,
    status: invoice.status,
    dueDate: invoice.dueDate,
    total: invoice.total,
    paid: invoice.paid,
    balance: invoice.balance,
  };

  const fullyPaid = invoice.balance <= 0;

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(invoice.invoiceNumber);
      toast.success(`Copied ${invoice.invoiceNumber}`);
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  }

  return (
    <div className="flex items-center justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setViewOpen(true)}>
            <EyeIcon /> View invoice
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => downloadInvoicePdf(doc)}>
            <DownloadIcon /> Download PDF
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPayOpen(true)} disabled={fullyPaid}>
            <BanknoteIcon /> Record payment
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void copyNumber()}>
            <CopyIcon /> Copy number
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" disabled>
            <Trash2Icon /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Preview */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice {doc.invoiceNumber}</DialogTitle>
            <DialogDescription>Preview of the invoice. Download to save a PDF copy.</DialogDescription>
          </DialogHeader>

          <InvoiceDocument doc={doc} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
            <Button onClick={() => downloadInvoicePdf(doc)}>
              <DownloadIcon /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record payment */}
      <RecordPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        invoice={invoice}
        onRecorded={() => router.refresh()}
      />
    </div>
  );
}

function RecordPaymentDialog({
  open,
  onOpenChange,
  invoice,
  onRecorded,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  invoice: InvoiceRow;
  onRecorded: () => void;
}) {
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Payments always settle the full outstanding balance — the amount is fixed, not editable.
  const value = invoice.balance;

  // Reset the form each time the dialog opens.
  function handleOpenChange(next: boolean) {
    if (next) {
      setMethod("");
      setReference("");
    }
    onOpenChange(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Nothing outstanding to record.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value, method: method || undefined, reference: reference || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not record payment.");
        return;
      }
      toast.success(
        data.status === "paid"
          ? `${data.invoice_number} marked paid.`
          : `Recorded ${inr(value)} — ${inr(data.balance)} still due.`
      );
      onOpenChange(false);
      onRecorded();
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {invoice.invoiceNumber} · {inr(invoice.balance)} outstanding of {inr(invoice.total)}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pay-amount">Amount received (₹)</Label>
            <Input id="pay-amount" value={inr(value)} disabled readOnly />
            <p className="text-muted-foreground text-xs">
              Records the full outstanding balance.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-method">Method (optional)</Label>
            <Input
              id="pay-method"
              placeholder="UPI, bank transfer, cash…"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-reference">Reference (optional)</Label>
            <Input
              id="pay-reference"
              placeholder="UTR / transaction id"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Recording…" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
