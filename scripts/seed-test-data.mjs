// Seed clients + July-2026 invoices for a user so GST/metrics can be tested.
// node scripts/seed-test-data.mjs
import pg from "pg";

const EMAIL = "chandanchethan321@gmail.com";
const CONN =
  "postgresql://postgres.qeqznsfhsavwwnsrkqgz:mrxaIH4NIWm0Cnt1@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres";

const client = new pg.Client({ connectionString: CONN });
await client.connect();

// Resolve the user's auth UID (they've signed in, so it's in google_credentials/profiles).
const u = await client.query(
  `select user_id from google_credentials where email=$1
   union select id from profiles where email=$1 limit 1`,
  [EMAIL]
);
if (!u.rows.length) {
  console.log("No user found for", EMAIL, "- sign in once first.");
  await client.end();
  process.exit(1);
}
const userId = u.rows[0].user_id ?? u.rows[0].id;
console.log("user_id:", userId);

// Clients: two B2B (GSTIN) + one B2C (no GSTIN). MH gstin => intra (CGST+SGST); TN => inter (IGST).
const clients = [
  { name: "Acme Industries", company: "Acme Industries Pvt Ltd", email: EMAIL, gstin: "27AAGCB1286QJZM" },
  { name: "Bharat Traders", company: "Bharat Traders", email: EMAIL, gstin: "33AAGCB1286QOZO" },
  { name: "Riya Sharma", company: null, email: EMAIL, gstin: null },
];
const clientIds = [];
for (const c of clients) {
  const r = await client.query(
    `insert into clients (name, company, email, gstin, user_id) values ($1,$2,$3,$4,$5) returning id`,
    [c.name, c.company, c.email, c.gstin, userId]
  );
  clientIds.push(r.rows[0].id);
}

// Continue invoice numbering from the user's current max.
const maxq = await client.query(`select invoice_number from invoices where user_id=$1`, [userId]);
let seq = 0;
for (const row of maxq.rows) {
  const m = /(\d+)$/.exec(row.invoice_number ?? "");
  if (m) seq = Math.max(seq, Number(m[1]));
}
const num = () => `INV-${String(++seq).padStart(4, "0")}`;

// Invoices dated in July 2026 (current month) so "prepare GST for this month" works.
const invoices = [
  { client: 0, subtotal: 50000, rate: 18, date: "2026-07-05", pay: 59000 }, // Acme, paid in full
  { client: 1, subtotal: 30000, rate: 18, date: "2026-07-10", pay: 0 }, // Bharat, unpaid
  { client: 2, subtotal: 10000, rate: 18, date: "2026-07-14", pay: 5000 }, // Riya, partial
];

for (const iv of invoices) {
  const tax = Math.round(iv.subtotal * (iv.rate / 100) * 100) / 100;
  const total = iv.subtotal + tax;
  const invNo = num();
  const fullyPaid = iv.pay >= total;
  const r = await client.query(
    `insert into invoices
      (invoice_number, client_id, user_id, invoice_type, status, issue_date, due_date,
       subtotal, tax_rate, tax_amount, total, amount_paid, paid_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id`,
    [
      invNo,
      clientIds[iv.client],
      userId,
      clients[iv.client].gstin ? "b2b" : "b2c",
      fullyPaid ? "paid" : "sent",
      iv.date,
      "2026-08-15",
      iv.subtotal,
      iv.rate,
      tax,
      total,
      iv.pay,
      fullyPaid ? new Date("2026-07-20").toISOString() : null,
    ]
  );
  const invId = r.rows[0].id;
  await client.query(
    `insert into invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
     values ($1,$2,$3,$4,$5,0)`,
    [invId, "Consulting services", 1, iv.subtotal, iv.subtotal]
  );
  if (iv.pay > 0) {
    await client.query(
      `insert into invoice_payments (invoice_id, user_id, amount, paid_on, method) values ($1,$2,$3,$4,$5)`,
      [invId, userId, iv.pay, iv.date, "UPI"]
    );
    await client.query(
      `insert into cash_flow_entries (entry_date, type, category, description, amount, source, invoice_id, user_id)
       values ($1,'inflow','invoice_payment',$2,$3,'invoice',$4,$5)`,
      [iv.date, `Payment for ${invNo}`, iv.pay, invId, userId]
    );
  }
  console.log(`  ${invNo}: ${clients[iv.client].name} — total ₹${total}, paid ₹${iv.pay}`);
}

// One manual outflow so cash-flow metrics have both directions.
await client.query(
  `insert into cash_flow_entries (entry_date, type, category, description, amount, source, user_id)
   values ('2026-07-08','outflow','rent','Office rent',25000,'manual',$1)`,
  [userId]
);

console.log("Seed complete.");
await client.end();
