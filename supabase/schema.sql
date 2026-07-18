-- FinMate schema — run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

create extension if not exists "pgcrypto";

-- Clients you invoice
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  gstin text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

-- Invoices
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  client_id uuid not null references clients(id) on delete restrict,
  invoice_type text not null default 'b2b' check (invoice_type in ('b2b', 'b2c')),
  auto_remind boolean not null default true,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issue_date date not null default current_date,
  due_date date not null,
  currency text not null default 'INR',
  subtotal numeric(14,2) not null default 0,
  tax_rate numeric(5,2) not null default 18.00,
  tax_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  notes text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  amount numeric(14,2) not null default 0,
  sort_order int not null default 0
);

-- Reminder emails sent for an invoice (via Resend)
create table if not exists invoice_reminders (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  sent_to text not null,
  subject text not null,
  status text not null default 'sent' check (status in ('scheduled', 'sent', 'failed')),
  resend_id text,
  scheduled_for timestamptz,
  sent_at timestamptz default now()
);

-- Payments recorded against invoices (partial or full)
create table if not exists invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  paid_on date not null default current_date,
  method text,
  reference text,
  created_at timestamptz not null default now()
);

-- Cash flow ledger (manual entries + auto entries from paid invoices; AI can add/delete via tools)
create table if not exists cash_flow_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  type text not null check (type in ('inflow', 'outflow')),
  category text not null default 'other',
  description text,
  amount numeric(14,2) not null check (amount >= 0),
  source text not null default 'manual' check (source in ('manual', 'invoice', 'ai')),
  invoice_id uuid references invoices(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoices_client on invoices(client_id);
create index if not exists idx_invoices_status on invoices(status);
create index if not exists idx_invoice_items_invoice on invoice_items(invoice_id);
create index if not exists idx_reminders_invoice on invoice_reminders(invoice_id);
create index if not exists idx_payments_invoice on invoice_payments(invoice_id);
create index if not exists idx_cash_flow_date on cash_flow_entries(entry_date);

-- Keep invoices.updated_at fresh
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_invoices_updated_at on invoices;
create trigger trg_invoices_updated_at before update on invoices
  for each row execute function set_updated_at();

-- RLS: enabled with permissive policies for now (single-tenant hackathon build).
-- Tighten to auth.uid()-scoped policies when auth is added.
alter table clients enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table invoice_reminders enable row level security;
alter table invoice_payments enable row level security;
alter table cash_flow_entries enable row level security;

create policy "allow all clients" on clients for all using (true) with check (true);
create policy "allow all invoices" on invoices for all using (true) with check (true);
create policy "allow all invoice_items" on invoice_items for all using (true) with check (true);
create policy "allow all invoice_reminders" on invoice_reminders for all using (true) with check (true);
create policy "allow all invoice_payments" on invoice_payments for all using (true) with check (true);
create policy "allow all cash_flow_entries" on cash_flow_entries for all using (true) with check (true);
