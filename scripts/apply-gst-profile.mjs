// Add the user's own GST identity to profiles. node scripts/apply-gst-profile.mjs
import pg from "pg";
const client = new pg.Client({
  connectionString:
    "postgresql://postgres.qeqznsfhsavwwnsrkqgz:mrxaIH4NIWm0Cnt1@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
});
await client.connect();
await client.query(`
  alter table profiles add column if not exists gstin text;
  alter table profiles add column if not exists gst_username text;
  alter table profiles add column if not exists gst_legal_name text;
`);
console.log("profiles GST columns ready");
await client.end();
