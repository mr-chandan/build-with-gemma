// One-off: create the google_credentials table. node scripts/apply-google-creds.mjs
import pg from "pg";

const DDL = `
create table if not exists google_credentials (
  user_id uuid primary key,
  refresh_token text not null,
  scopes text,
  email text,
  updated_at timestamptz not null default now()
);
alter table google_credentials enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'google_credentials' and policyname = 'allow all google_credentials') then
    create policy "allow all google_credentials" on google_credentials for all using (true) with check (true);
  end if;
end $$;
`;

const client = new pg.Client({
  connectionString:
    "postgresql://postgres.qeqznsfhsavwwnsrkqgz:mrxaIH4NIWm0Cnt1@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
});
await client.connect();
await client.query(DDL);
const { rows } = await client.query(
  "select column_name from information_schema.columns where table_name = 'google_credentials' order by ordinal_position"
);
console.log("google_credentials columns:", rows.map((r) => r.column_name).join(", "));
await client.end();
