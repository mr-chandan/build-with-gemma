import pg from "pg";
const c = new pg.Client({
  connectionString:
    "postgresql://postgres.qeqznsfhsavwwnsrkqgz:mrxaIH4NIWm0Cnt1@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
});
await c.connect();
const p = await c.query("select id, email, gstin, gst_username from profiles order by created_at");
console.log("profiles:");
for (const r of p.rows) console.log(" ", r.email, "|", r.id, "| gstin:", r.gstin ?? "-");
const g = await c.query("select user_id, email from google_credentials");
console.log("google_credentials:");
for (const r of g.rows) console.log(" ", r.email, "|", r.user_id);
await c.end();
