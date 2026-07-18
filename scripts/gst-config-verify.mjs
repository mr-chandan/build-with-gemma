// Verify the FIXED cfg() logic resolves prod creds and the API returns real data.
import { readFileSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; })
);
Object.assign(process.env, env);

// Exact replica of the fixed cfg() in lib/gst/wb.ts:
function cfg() {
  const e = (process.env.WHITEBOOKS_ENV ?? "sandbox").toLowerCase();
  const isProd = e === "prod" || e === "production" || e === "live";
  const suffix = isProd ? "_PROD" : "_SANDBOX";
  const pick = (b) => process.env[`${b}${suffix}`] ?? process.env[b] ?? "";
  return {
    baseUrl: pick("WHITEBOOKS_BASE_URL").replace(/\/$/, ""),
    clientId: pick("WHITEBOOKS_CLIENT_ID"),
    clientSecret: pick("WHITEBOOKS_CLIENT_SECRET"),
    ip: process.env.WHITEBOOKS_IP ?? "127.0.0.1",
    email: process.env.WHITEBOOKS_REGISTERED_EMAIL ?? "",
  };
}
const c = cfg();
const configured = Boolean(c.baseUrl && c.clientId && c.clientSecret);
console.log("WHITEBOOKS_ENV:", process.env.WHITEBOOKS_ENV);
console.log("resolved baseUrl:", c.baseUrl);
console.log("whitebooksConfigured():", configured);
if (!configured) { console.log("STILL NOT CONFIGURED"); process.exit(1); }

const u = new URL("/public/search", c.baseUrl + "/");
u.searchParams.set("email", c.email);
u.searchParams.set("gstin", "29AABCR1718E1ZL");
const res = await fetch(u, { headers: { client_id: c.clientId, client_secret: c.clientSecret, ip_address: c.ip, Accept: "application/json" } });
const j = await res.json();
const d = j.data ?? {};
console.log("API HTTP", res.status, "status_cd:", j.status_cd);
console.log("legalName:", d.lgnm, "| status:", d.sts, "| registered:", d.rgdt);
