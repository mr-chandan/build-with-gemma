// Diagnose: what scopes does the stored Google refresh token actually grant?
// node scripts/check-google-scopes.mjs
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; })
);

const client = new pg.Client({
  connectionString:
    "postgresql://postgres.qeqznsfhsavwwnsrkqgz:mrxaIH4NIWm0Cnt1@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
});
await client.connect();
const { rows } = await client.query(
  "select user_id, email, scopes, left(refresh_token, 12) as token_prefix, updated_at from google_credentials order by updated_at desc"
);
await client.end();

console.log("Stored google_credentials rows:", rows.length);
for (const r of rows) console.log(" ", r.email, "| stored scopes:", r.scopes, "| updated:", r.updated_at);

if (!rows.length) {
  console.log("\nNo stored Google credential — user hasn't completed a Google sign-in that returned a refresh token.");
  process.exit(0);
}

// Exchange the most recent refresh token for an access token, then read its real scopes.
const refreshToken = (await (async () => {
  const c = new pg.Client({
    connectionString:
      "postgresql://postgres.qeqznsfhsavwwnsrkqgz:mrxaIH4NIWm0Cnt1@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
  });
  await c.connect();
  const { rows: r } = await c.query("select refresh_token from google_credentials order by updated_at desc limit 1");
  await c.end();
  return r[0].refresh_token;
})());

const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  }),
});
const tokenJson = await tokenRes.json();
if (!tokenJson.access_token) {
  console.log("\nToken refresh FAILED:", JSON.stringify(tokenJson));
  process.exit(1);
}
const info = await (await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${tokenJson.access_token}`)).json();
console.log("\nACTUAL granted scopes on the live access token:");
console.log(" ", info.scope || "(none)");
console.log("\nHas gmail.readonly?", (info.scope || "").includes("gmail.readonly"));
console.log("Has calendar.readonly?", (info.scope || "").includes("calendar.readonly"));
