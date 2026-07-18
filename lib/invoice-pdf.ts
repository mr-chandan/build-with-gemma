import { jsPDF } from "jspdf";

import { formatDate } from "@/lib/format";

/** Currency for the PDF. jsPDF's built-in Helvetica can't render the ₹ glyph
 *  (it prints as a stray "1"), so use the ASCII-safe "Rs." prefix instead. */
function money(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? Number(n) : (n ?? 0);
  return "Rs. " + (v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/** A single billed line. `amount` is derived when missing. */
export type InvoiceItem = {
  description: string;
  quantity: number;
  unit_price: number;
  amount?: number;
};

/** Everything needed to render/print an invoice, from any source (agent card or table row).
 *  Most fields are optional so a summary-only invoice still renders. */
export type InvoiceDoc = {
  invoiceNumber: string;
  client?: string;
  type?: string; // "b2b" | "b2c"
  status?: string;
  issueDate?: string;
  dueDate?: string;
  items?: InvoiceItem[];
  subtotal?: number;
  taxRate?: number;
  tax?: number;
  total: number;
  paid?: number;
  balance?: number;
  notes?: string;
  /** Business/issuer name shown in the header. */
  from?: string;
};

const lineAmount = (it: InvoiceItem) =>
  it.amount ?? Number(it.quantity ?? 0) * Number(it.unit_price ?? 0);

/** Build a crisp, vector (text-based) PDF from invoice JSON — not a screenshot. */
export function buildInvoicePdf(doc: InvoiceDoc): jsPDF {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const M = 48; // margin
  const right = pageW - M;
  let y = M;

  const ink = (r: number, g: number, b: number) => pdf.setTextColor(r, g, b);
  const muted = () => ink(120, 120, 130);
  const dark = () => ink(20, 20, 25);

  // Header: issuer + INVOICE label
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  dark();
  pdf.text(doc.from || "Kubera.ai", M, y);

  pdf.setFontSize(22);
  muted();
  pdf.text("INVOICE", right, y, { align: "right" });
  y += 22;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  muted();
  pdf.text(`#${doc.invoiceNumber}`, right, y, { align: "right" });
  y += 24;

  // Meta block: bill-to (left) + dates/status (right)
  const metaTop = y;
  dark();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("BILL TO", M, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  y += 15;
  pdf.text(doc.client || "—", M, y);
  if (doc.type) {
    y += 14;
    muted();
    pdf.setFontSize(9);
    pdf.text(doc.type.toUpperCase(), M, y);
  }

  // Right meta rows
  let ry = metaTop;
  const metaRow = (label: string, value: string) => {
    muted();
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(label, right - 150, ry);
    dark();
    pdf.setFontSize(10);
    pdf.text(value, right, ry, { align: "right" });
    ry += 15;
  };
  if (doc.issueDate) metaRow("Issued", formatDate(doc.issueDate));
  if (doc.dueDate) metaRow("Due", formatDate(doc.dueDate));
  if (doc.status) metaRow("Status", doc.status.toUpperCase());

  y = Math.max(y, ry) + 22;

  // Items table (only when we have line items)
  if (doc.items && doc.items.length > 0) {
    const cols = { desc: M, qty: right - 210, price: right - 120, amt: right };
    pdf.setDrawColor(225, 225, 230);
    pdf.setFillColor(245, 245, 247);
    pdf.rect(M, y - 12, right - M, 22, "F");
    dark();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("DESCRIPTION", cols.desc + 6, y + 3);
    pdf.text("QTY", cols.qty, y + 3, { align: "right" });
    pdf.text("PRICE", cols.price, y + 3, { align: "right" });
    pdf.text("AMOUNT", cols.amt - 6, y + 3, { align: "right" });
    y += 24;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    for (const it of doc.items) {
      dark();
      pdf.text(String(it.description || "—"), cols.desc + 6, y);
      muted();
      pdf.text(String(it.quantity ?? 1), cols.qty, y, { align: "right" });
      pdf.text(money(it.unit_price), cols.price, y, { align: "right" });
      dark();
      pdf.text(money(lineAmount(it)), cols.amt - 6, y, { align: "right" });
      y += 18;
      pdf.setDrawColor(238, 238, 242);
      pdf.line(M, y - 6, right, y - 6);
    }
    y += 10;
  }

  // Totals
  const totalsX = right - 200;
  const totalRow = (label: string, value: string, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(bold ? 12 : 10);
    if (bold) dark();
    else muted();
    pdf.text(label, totalsX, y);
    dark();
    pdf.text(value, right, y, { align: "right" });
    y += bold ? 20 : 16;
  };
  if (doc.subtotal != null) totalRow("Subtotal", money(doc.subtotal));
  if (doc.tax != null)
    totalRow(`GST${doc.taxRate != null ? ` (${doc.taxRate}%)` : ""}`, money(doc.tax));
  pdf.setDrawColor(210, 210, 216);
  pdf.line(totalsX, y - 8, right, y - 8);
  totalRow("Total", money(doc.total), true);
  if (doc.paid != null && doc.paid > 0) {
    totalRow("Paid", money(doc.paid));
    if (doc.balance != null) totalRow("Balance due", money(doc.balance));
  }

  // Notes
  if (doc.notes) {
    y += 16;
    muted();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("NOTES", M, y);
    y += 14;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    dark();
    const wrapped = pdf.splitTextToSize(doc.notes, right - M);
    pdf.text(wrapped, M, y);
  }

  return pdf;
}

/** Trigger a browser download of the invoice PDF. */
export function downloadInvoicePdf(doc: InvoiceDoc): void {
  buildInvoicePdf(doc).save(`${doc.invoiceNumber}.pdf`);
}
