// One-off: gst_sessions table to carry the WhiteBooks OTP txn between tool calls.
// node scripts/apply-gst-sessions.mjs
import pg from "pg";

const DDL = `
create table if not exists gst_sessions (
  user_id uuid primary key,
  txn text,
  auth_token text,
  updated_at timestamptz not null default now()
);
alter table gst_sessions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='gst_sessions' and policyname='allow all gst_sessions') then
    create policy "allow all gst_sessions" on gst_sessions for all using (true) with check (true);
  end if;
end $$;
`;

const client = new pg.Client({
  connectionString:
    "postgresql://postgres.qeqznsfhsavwwnsrkqgz:mrxaIH4NIWm0Cnt1@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
});
await client.connect();
await client.query(DDL);
console.log("gst_sessions ready");
await client.end();
