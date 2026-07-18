import { inr, formatDate } from "@/lib/format";
import type { InvoiceDoc, InvoiceItem } from "@/lib/invoice-pdf";

const lineAmount = (it: InvoiceItem) =>
  it.amount ?? Number(it.quantity ?? 0) * Number(it.unit_price ?? 0);

/** On-screen, print-like rendering of an invoice — shown inside the "View" modal.
 *  Mirrors the layout of the generated PDF so the preview matches the download. */
export function InvoiceDocument({ doc }: { doc: InvoiceDoc }) {
  return (
    <div className="rounded-lg border bg-white p-6 text-neutral-900 sm:p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="text-lg font-semibold">{doc.from || "Kubera.ai"}</div>
        <div className="text-right">
          <div className="text-xl font-semibold tracking-wide text-neutral-400">INVOICE</div>
          <div className="text-sm text-neutral-500">#{doc.invoiceNumber}</div>
        </div>
      </div>

      {/* Meta */}
      <div className="mt-6 flex items-start justify-between gap-6">
        <div>
          <div className="text-[11px] font-semibold tracking-wide text-neutral-400">BILL TO</div>
          <div className="mt-1 font-medium">{doc.client || "—"}</div>
          {doc.type ? (
            <div className="text-xs text-neutral-500 uppercase">{doc.type}</div>
          ) : null}
        </div>
        <div className="space-y-1 text-right text-sm">
          {doc.issueDate ? <MetaRow label="Issued" value={formatDate(doc.issueDate)} /> : null}
          {doc.dueDate ? <MetaRow label="Due" value={formatDate(doc.dueDate)} /> : null}
          {doc.status ? <MetaRow label="Status" value={doc.status.toUpperCase()} /> : null}
        </div>
      </div>

      {/* Items */}
      {doc.items && doc.items.length > 0 ? (
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-y bg-neutral-50 text-[11px] tracking-wide text-neutral-500">
              <th className="py-2 pl-2 text-left font-semibold">DESCRIPTION</th>
              <th className="py-2 text-right font-semibold">QTY</th>
              <th className="py-2 text-right font-semibold">PRICE</th>
              <th className="py-2 pr-2 text-right font-semibold">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((it, i) => (
              <tr key={i} className="border-b border-neutral-100">
                <td className="py-2 pl-2">{it.description || "—"}</td>
                <td className="py-2 text-right text-neutral-500">{it.quantity ?? 1}</td>
                <td className="py-2 text-right text-neutral-500 tabular-nums">{inr(it.unit_price)}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{inr(lineAmount(it))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {/* Totals */}
      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-[240px] space-y-1.5 text-sm">
          {doc.subtotal != null ? <TotalRow label="Subtotal" value={inr(doc.subtotal)} /> : null}
          {doc.tax != null ? (
            <TotalRow
              label={`GST${doc.taxRate != null ? ` (${doc.taxRate}%)` : ""}`}
              value={inr(doc.tax)}
            />
          ) : null}
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{inr(doc.total)}</span>
          </div>
          {doc.paid != null && doc.paid > 0 ? (
            <>
              <TotalRow label="Paid" value={inr(doc.paid)} />
              {doc.balance != null ? (
                <TotalRow label="Balance due" value={inr(doc.balance)} />
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {doc.notes ? (
        <div className="mt-6 border-t pt-4">
          <div className="text-[11px] font-semibold tracking-wide text-neutral-400">NOTES</div>
          <p className="mt-1 text-sm whitespace-pre-wrap">{doc.notes}</p>
        </div>
      ) : null}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-end gap-4">
      <span className="text-neutral-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-neutral-500">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
