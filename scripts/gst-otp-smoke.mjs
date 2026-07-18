// Verify the WhiteBooks sandbox responds to an OTP request. node scripts/gst-otp-smoke.mjs
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; })
);

const base = env.WHITEBOOKS_BASE_URL_SANDBOX.replace(/\/$/, "");
const url = new URL("/authentication/otprequest", base + "/");
url.searchParams.set("email", env.WHITEBOOKS_REGISTERED_EMAIL);

const res = await fetch(url.toString(), {
  headers: {
    client_id: env.WHITEBOOKS_CLIENT_ID_SANDBOX,
    client_secret: env.WHITEBOOKS_CLIENT_SECRET_SANDBOX,
    ip_address: env.WHITEBOOKS_IP,
    gst_username: "MH_NT4.2823",
    state_cd: "27",
    Accept: "application/json",
  },
});
console.log("HTTP", res.status);
const text = await res.text();
console.log(text.slice(0, 500));
