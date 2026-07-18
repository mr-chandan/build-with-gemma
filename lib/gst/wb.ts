/**
 * WhiteBooks GSP client (sandbox) — Node port of gst-steps/lib/wb.ts.
 *
 * The authenticated GSTR-1 filing flow is: /authentication/otprequest → (user OTP) →
 * /authentication/authtoken → /gstr1/retsave. Every call carries client_id/secret +
 * ip_address; auth calls add gst_username/state_cd; save calls add gstin/ret_period and
 * the session token as both `txn` and `auth-token`.
 */

function cfg() {
  // Read env freshly each call (survives dev env reloads). Accept prod/production/live.
  const env = (process.env.WHITEBOOKS_ENV ?? "sandbox").toLowerCase();
  const isProd = env === "prod" || env === "production" || env === "live";
  const suffix = isProd ? "_PROD" : "_SANDBOX";
  const pick = (base: string) =>
    process.env[`${base}${suffix}`] ?? process.env[base] ?? "";
  return {
    baseUrl: pick("WHITEBOOKS_BASE_URL").replace(/\/$/, ""),
    clientId: pick("WHITEBOOKS_CLIENT_ID"),
    clientSecret: pick("WHITEBOOKS_CLIENT_SECRET"),
    ip: process.env.WHITEBOOKS_IP ?? "127.0.0.1",
    email: process.env.WHITEBOOKS_REGISTERED_EMAIL ?? "",
  };
}

export function whitebooksConfigured(): boolean {
  const c = cfg();
  return Boolean(c.baseUrl && c.clientId && c.clientSecret);
}

export const registeredEmail = () => cfg().email;

/** The single sandbox test account we file against (gst-steps accounts.ts mh-1). */
export const GST_ACCOUNT = {
  gstin: process.env.GST_FILING_TEST_GSTIN ?? "27AAGCB1286QJZM",
  username: process.env.GST_FILING_TEST_USERNAME ?? "MH_NT4.2823",
  stateCode: "27",
  stateName: "Maharashtra",
};

export type WbResult = {
  ok: boolean;
  httpStatus: number;
  statusCd: string | null;
  message: string | null;
  body: unknown;
};

type Opts = {
  path: string;
  method?: "GET" | "POST" | "PUT";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  gstUsername?: string;
  stateCode?: string;
  txn?: string;
  authToken?: string;
  extraHeaders?: Record<string, string>;
};

export async function wbCall(opts: Opts): Promise<WbResult> {
  const c = cfg();
  if (!c.baseUrl) {
    return { ok: false, httpStatus: 0, statusCd: null, message: "WhiteBooks not configured.", body: null };
  }

  const url = new URL(opts.path, c.baseUrl + "/");
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = {
    client_id: c.clientId,
    client_secret: c.clientSecret,
    ip_address: c.ip,
    Accept: "application/json",
  };
  if (opts.gstUsername) headers.gst_username = opts.gstUsername;
  if (opts.stateCode) headers.state_cd = opts.stateCode;
  if (opts.txn) headers.txn = opts.txn;
  if (opts.authToken) headers["auth-token"] = opts.authToken;
  if (opts.extraHeaders) Object.assign(headers, opts.extraHeaders);
  if (opts.body) headers["Content-Type"] = "application/json";

  try {
    const res = await fetch(url.toString(), {
      method: opts.method ?? "GET",
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    });
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* keep as text */
    }
    const statusCd =
      typeof parsed === "object" && parsed !== null ? ((parsed as { status_cd?: string }).status_cd ?? null) : null;
    const ok = res.ok && statusCd !== "0";
    let message: string | null = null;
    if (!ok && typeof parsed === "object" && parsed !== null) {
      const p = parsed as { error?: { message?: string } | string; status_desc?: string };
      const err = typeof p.error === "object" ? p.error?.message : p.error;
      message = err || p.status_desc || `WhiteBooks HTTP ${res.status}`;
    }
    return { ok, httpStatus: res.status, statusCd, message, body: parsed };
  } catch (e) {
    return {
      ok: false,
      httpStatus: 0,
      statusCd: null,
      message: e instanceof Error ? e.message : "Network error",
      body: null,
    };
  }
}

/** Session token lives at body.txn or body.header.txn (both otprequest + authtoken). */
export function extractTxn(body: unknown): string | null {
  if (body && typeof body === "object") {
    const b = body as { txn?: string; header?: { txn?: string } };
    if (typeof b.txn === "string") return b.txn;
    if (b.header && typeof b.header.txn === "string") return b.header.txn;
  }
  return null;
}
