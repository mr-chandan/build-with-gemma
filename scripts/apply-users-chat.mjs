// One-off: users (profiles), per-user scoping columns, and chat history tables.
// node scripts/apply-users-chat.mjs
import pg from "pg";

const DDL = `
-- User profiles, mirrored from auth.users at sign-in.
create table if not exists profiles (
  id uuid primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Per-user ownership on the data tables (nullable so existing rows survive).
alter table clients add column if not exists user_id uuid;
alter table invoices add column if not exists user_id uuid;
alter table invoice_payments add column if not exists user_id uuid;
alter table invoice_reminders add column if not exists user_id uuid;
alter table cash_flow_entries add column if not exists user_id uuid;

create index if not exists idx_clients_user on clients(user_id);
create index if not exists idx_invoices_user on invoices(user_id);
create index if not exists idx_payments_user on invoice_payments(user_id);
create index if not exists idx_cashflow_user on cash_flow_entries(user_id);

-- Chat history.
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  kind text not null,               -- user | assistant | tool | confirm
  content text,
  tool_call_id text,
  tool_name text,
  tool_result jsonb,
  tool_args jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_conversations_user on conversations(user_id, updated_at desc);
create index if not exists idx_messages_conversation on messages(conversation_id, created_at);

alter table profiles enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='allow all profiles') then
    create policy "allow all profiles" on profiles for all using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where tablename='conversations' and policyname='allow all conversations') then
    create policy "allow all conversations" on conversations for all using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where tablename='messages' and policyname='allow all messages') then
    create policy "allow all messages" on messages for all using (true) with check (true); end if;
end $$;
`;

const client = new pg.Client({
  connectionString:
    "postgresql://postgres.qeqznsfhsavwwnsrkqgz:mrxaIH4NIWm0Cnt1@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
});
await client.connect();
await client.query(DDL);
const { rows } = await client.query(
  "select table_name from information_schema.tables where table_schema='public' order by table_name"
);
console.log("tables:", rows.map((r) => r.table_name).join(", "));
await client.end();
