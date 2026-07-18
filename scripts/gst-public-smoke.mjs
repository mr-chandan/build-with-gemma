// Test the WhiteBooks PRODUCTION public taxpayer search. node scripts/gst-public-smoke.mjs [GSTIN]
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; })
);

const gstin = process.argv[2] || "33AAGCB1286Q1ZB";
const base = env.WHITEBOOKS_BASE_URL_PROD.replace(/\/$/, "");
const url = new URL("/public/search", base + "/");
url.searchParams.set("email", env.WHITEBOOKS_REGISTERED_EMAIL);
url.searchParams.set("gstin", gstin);

const res = await fetch(url.toString(), {
  headers: {
    client_id: env.WHITEBOOKS_CLIENT_ID_PROD,
    client_secret: env.WHITEBOOKS_CLIENT_SECRET_PROD,
    ip_address: env.WHITEBOOKS_IP,
    Accept: "application/json",
  },
});
console.log("GSTIN:", gstin, "| HTTP", res.status);
const text = await res.text();
console.log(text.slice(0, 1200));
