// Make invoice_number unique PER USER instead of globally.
// node scripts/fix-invoice-number-constraint.mjs
import pg from "pg";

const DDL = `
alter table invoices drop constraint if exists invoices_invoice_number_key;
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'invoices_user_number_unique'
  ) then
    alter table invoices add constraint invoices_user_number_unique unique (user_id, invoice_number);
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
  "select conname from pg_constraint where conrelid = 'invoices'::regclass and contype = 'u'"
);
console.log("invoices unique constraints:", rows.map((r) => r.conname).join(", "));
await client.end();
