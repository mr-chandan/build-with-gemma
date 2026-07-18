"use client";

import { useState } from "react";
import { DownloadIcon, EyeIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadInvoicePdf, type InvoiceDoc } from "@/lib/invoice-pdf";
import { InvoiceDocument } from "./invoice-document";

/** View (opens a modal with the rendered invoice) + Download (saves a PDF from JSON).
 *  `compact` renders icon-only buttons, suited to a table row. */
export function InvoiceActions({
  doc,
  compact = false,
  className,
}: {
  doc: InvoiceDoc;
  compact?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      {compact ? (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" title="View invoice" onClick={() => setOpen(true)}>
            <EyeIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Download PDF"
            onClick={() => downloadInvoicePdf(doc)}>
            <DownloadIcon />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <EyeIcon /> View
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadInvoicePdf(doc)}>
            <DownloadIcon /> Download
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice {doc.invoiceNumber}</DialogTitle>
            <DialogDescription>
              Preview of the invoice. Download to save a PDF copy.
            </DialogDescription>
          </DialogHeader>

          <InvoiceDocument doc={doc} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={() => downloadInvoicePdf(doc)}>
              <DownloadIcon /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
