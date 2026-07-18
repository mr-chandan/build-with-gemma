import pg from "pg";
const c = new pg.Client({
  connectionString:
    "postgresql://postgres.qeqznsfhsavwwnsrkqgz:mrxaIH4NIWm0Cnt1@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
});
await c.connect();
const uid = "22de48de-fe0d-4db9-93f2-a82386816936";
const q = async (sql) => (await c.query(sql.replace(/\$U/g, `'${uid}'`))).rows;

const inv = await q(`select count(*) n, sum(total) t, sum(amount_paid) p from invoices where user_id=$U`);
const over = await q(`select count(*) n, sum(total-amount_paid) bal from invoices where user_id=$U and status<>'paid' and amount_paid<total and due_date < current_date`);
const cf = await q(`select
  sum(case when type='inflow' then amount else 0 end) inflow,
  sum(case when type='outflow' then amount else 0 end) outflow from cash_flow_entries where user_id=$U`);
const jul = await q(`select count(*) n, sum(subtotal) taxable from invoices where user_id=$U and issue_date >= '2026-07-01' and issue_date < '2026-08-01'`);
const cl = await q(`select count(*) n, count(gstin) b2b from clients where user_id=$U`);

console.log("Clients:", cl[0].n, "( B2B", cl[0].b2b, "/ B2C", cl[0].n - cl[0].b2b, ")");
console.log("Invoices:", inv[0].n, "| Invoiced ₹" + Number(inv[0].t).toLocaleString("en-IN"),
  "| Collected ₹" + Number(inv[0].p).toLocaleString("en-IN"),
  "| Outstanding ₹" + (Number(inv[0].t) - Number(inv[0].p)).toLocaleString("en-IN"));
console.log("Overdue:", over[0].n, "invoices, ₹" + Number(over[0].bal ?? 0).toLocaleString("en-IN"));
console.log("Cash flow — inflow ₹" + Number(cf[0].inflow).toLocaleString("en-IN"),
  "| outflow ₹" + Number(cf[0].outflow).toLocaleString("en-IN"),
  "| net ₹" + (Number(cf[0].inflow) - Number(cf[0].outflow)).toLocaleString("en-IN"));
console.log("July invoices (for GST):", jul[0].n, "| taxable ₹" + Number(jul[0].taxable).toLocaleString("en-IN"));
await c.end();
