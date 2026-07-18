// Verify the Resend key + sending. node scripts/resend-smoke.mjs <to-email>
import { readFileSync } from "node:fs";
import { Resend } from "resend";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; })
);

const to = process.argv[2] || "harshdesai.3007@gmail.com";
const resend = new Resend(env.RESEND_API_KEY);
const res = await resend.emails.send({
  from: "onboarding@resend.dev",
  to,
  subject: "Kubera.ai — reminder test",
  html: "<p>This is a Kubera.ai reminder test.</p>",
});
console.log("to:", to);
console.log(JSON.stringify(res, null, 2));
