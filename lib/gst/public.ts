/**
 * WhiteBooks PUBLIC GST APIs (production, read-only) — no OTP, no filing.
 *   GET /public/search   — real taxpayer details for a GSTIN
 *   GET /public/rettrack — GST return filing history for a GSTIN
 * These take a GSTIN the user provides (you can't look up a random taxpayer's filings
 * without their consent — the user enters their own GSTIN + portal username).
 */

import { wbCall, registeredEmail } from "./wb";

export type TaxpayerDetails = {
  gstin: string;
  legalName: string | null;
  tradeName: string | null;
  status: string | null;
  registrationDate: string | null;
  constitution: string | null;
  taxpayerType: string | null;
  address: string | null;
  stateJurisdiction: string | null;
  centreJurisdiction: string | null;
  natureOfBusiness: string[];
};

/** Pull the taxpayer object out of WhiteBooks' envelope (data | result | top-level). */
function taxpayerObj(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  for (const key of ["data", "result", "taxpayerDetails"]) {
    const v = b[key];
    if (v && typeof v === "object") return v as Record<string, unknown>;
  }
  if (b.lgnm || b.gstin) return b;
  return null;
}

function assembleAddress(pradr: unknown): string | null {
  if (!pradr || typeof pradr !== "object") return null;
  const p = pradr as Record<string, unknown>;
  if (typeof p.adr === "string" && p.adr.trim()) return p.adr;
  const a = p.addr as Record<string, unknown> | undefined;
  if (!a) return null;
  const parts = [a.bno, a.st, a.loc, a.dst, a.stcd, a.pncd].filter((x) => typeof x === "string" && x);
  return parts.length ? parts.join(", ") : null;
}

export async function searchTaxpayer(gstin: string): Promise<
  { ok: true; details: TaxpayerDetails } | { ok: false; message: string }
> {
  const res = await wbCall({
    path: "/public/search",
    query: { email: registeredEmail(), gstin: gstin.trim().toUpperCase() },
  });
  if (!res.ok) return { ok: false, message: res.message ?? "GSTIN lookup failed." };

  const tp = taxpayerObj(res.body);
  if (!tp) return { ok: false, message: "No taxpayer details returned for this GSTIN." };

  const str = (k: string) => (typeof tp[k] === "string" ? (tp[k] as string) : null);
  return {
    ok: true,
    details: {
      gstin: str("gstin") ?? gstin.toUpperCase(),
      legalName: str("lgnm"),
      tradeName: str("tradeNam") ?? str("tradenam"),
      status: str("sts"),
      registrationDate: str("rgdt"),
      constitution: str("ctb"),
      taxpayerType: str("dty"),
      address: assembleAddress(tp.pradr),
      stateJurisdiction: str("stj") ?? str("stjCd"),
      centreJurisdiction: str("ctj") ?? str("ctjCd"),
      natureOfBusiness: Array.isArray(tp.nba) ? (tp.nba as string[]) : [],
    },
  };
}

export type ReturnFiling = { rtntype: string; ret_prd: string; dof: string; status: string; arn: string };

export async function trackReturns(
  gstin: string,
  fy: string,
  type?: string
): Promise<{ ok: true; filings: ReturnFiling[] } | { ok: false; message: string }> {
  const res = await wbCall({
    path: "/public/rettrack",
    query: { email: registeredEmail(), gstin: gstin.trim().toUpperCase(), fy, type },
  });
  if (!res.ok) return { ok: false, message: res.message ?? "Return tracking failed." };

  const body = res.body as Record<string, unknown> | null;
  const data = body && typeof body === "object" ? (body.data ?? body.result ?? body) : null;
  const rows = (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).EFiledlist))
    ? ((data as Record<string, unknown>).EFiledlist as Record<string, unknown>[])
    : Array.isArray(data)
      ? (data as Record<string, unknown>[])
      : [];

  const filings: ReturnFiling[] = rows.map((r) => ({
    rtntype: String(r.rtntype ?? ""),
    ret_prd: String(r.ret_prd ?? ""),
    dof: String(r.dof ?? ""),
    status: String(r.status ?? ""),
    arn: String(r.arn ?? ""),
  }));
  return { ok: true, filings };
}
