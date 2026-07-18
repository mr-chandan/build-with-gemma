/**
 * Prepare a GSTR-1 return + GSTR-3B summary from Kubera invoices for a period.
 *
 * Simplified for Kubera's schema (single GST rate per invoice, services). Classifies each
 * invoice as B2B (client has a GSTIN) or B2CS (no GSTIN), splits tax into IGST (inter-state)
 * vs CGST+SGST (intra-state) by comparing the client's GSTIN state to the supplier's, and
 * builds both a human summary and the WhiteBooks /gstr1/retsave payload.
 */

import { GST_ACCOUNT } from "./wb";

export type PrepInvoice = {
  invoice_number: string;
  issue_date: string;
  total: number;
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  client_gstin: string | null;
  client_name: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** "YYYY-MM" or a Date → WhiteBooks ret_period "MMYYYY". */
export function retPeriod(year: number, month1to12: number): string {
  return `${String(month1to12).padStart(2, "0")}${year}`;
}

/** ISO date → GSTR-1 "DD-MM-YYYY". */
function idt(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

export type GstSummary = {
  period: string;
  supplierGstin: string;
  counts: { b2b: number; b2c: number; total: number };
  taxable: number;
  igst: number;
  cgst: number;
  sgst: number;
  totalTax: number;
  invoiceTotal: number;
};

type Item = { num: number; itm_det: { rt: number; txval: number; iamt: number; camt: number; samt: number; csamt: number } };

export function prepareReturn(
  invoices: PrepInvoice[],
  year: number,
  month1to12: number
): { summary: GstSummary; payload: Record<string, unknown> } {
  const fp = retPeriod(year, month1to12);
  const supplierState = GST_ACCOUNT.stateCode;

  let taxable = 0,
    igst = 0,
    cgst = 0,
    sgst = 0,
    invoiceTotal = 0,
    b2bCount = 0,
    b2cCount = 0;

  const b2bByCtin = new Map<string, { ctin: string; inv: unknown[] }>();
  const b2csAgg = new Map<string, { sply_ty: string; typ: string; pos: string; rt: number; txval: number; iamt: number; camt: number; samt: number; csamt: number }>();
  const invoiceNumbers: string[] = [];

  for (const inv of invoices) {
    const gstin = inv.client_gstin?.trim().toUpperCase() || null;
    const pos = gstin && /^\d{2}/.test(gstin) ? gstin.slice(0, 2) : supplierState;
    const inter = pos !== supplierState;
    const tax = round2(inv.tax_amount);
    const iamt = inter ? tax : 0;
    const camt = inter ? 0 : round2(tax / 2);
    const samt = inter ? 0 : round2(tax / 2);

    taxable = round2(taxable + inv.subtotal);
    igst = round2(igst + iamt);
    cgst = round2(cgst + camt);
    sgst = round2(sgst + samt);
    invoiceTotal = round2(invoiceTotal + inv.total);
    invoiceNumbers.push(inv.invoice_number);

    const items: Item[] = [
      { num: 1, itm_det: { rt: inv.tax_rate, txval: round2(inv.subtotal), iamt, camt, samt, csamt: 0 } },
    ];

    if (gstin) {
      b2bCount++;
      const row = {
        inum: inv.invoice_number,
        idt: idt(inv.issue_date),
        val: round2(inv.total),
        pos,
        rchrg: "N",
        inv_typ: "R",
        itms: items,
      };
      const existing = b2bByCtin.get(gstin);
      if (existing) existing.inv.push(row);
      else b2bByCtin.set(gstin, { ctin: gstin, inv: [row] });
    } else {
      b2cCount++;
      const sply_ty = inter ? "INTER" : "INTRA";
      const key = `${sply_ty}|${pos}|${inv.tax_rate}`;
      const prev = b2csAgg.get(key) ?? { sply_ty, typ: "OE", pos, rt: inv.tax_rate, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 };
      prev.txval = round2(prev.txval + inv.subtotal);
      prev.iamt = round2(prev.iamt + iamt);
      prev.camt = round2(prev.camt + camt);
      prev.samt = round2(prev.samt + samt);
      b2csAgg.set(key, prev);
    }
  }

  const payload: Record<string, unknown> = {
    gstin: GST_ACCOUNT.gstin,
    fp,
    gt: round2(invoiceTotal),
    cur_gt: round2(invoiceTotal),
  };
  if (b2bByCtin.size) payload.b2b = [...b2bByCtin.values()];
  if (b2csAgg.size) payload.b2cs = [...b2csAgg.values()];
  if (invoiceNumbers.length) {
    payload.doc_issue = {
      doc_det: [
        {
          doc_num: 1,
          docs: [
            {
              num: 1,
              from: invoiceNumbers[0],
              to: invoiceNumbers[invoiceNumbers.length - 1],
              totnum: invoiceNumbers.length,
              cancel: 0,
              net_issue: invoiceNumbers.length,
            },
          ],
        },
      ],
    };
  }

  const summary: GstSummary = {
    period: fp,
    supplierGstin: GST_ACCOUNT.gstin,
    counts: { b2b: b2bCount, b2c: b2cCount, total: invoices.length },
    taxable: round2(taxable),
    igst,
    cgst,
    sgst,
    totalTax: round2(igst + cgst + sgst),
    invoiceTotal: round2(invoiceTotal),
  };

  return { summary, payload };
}
