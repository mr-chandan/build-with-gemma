// Fresh-start demo data for the presentation account. Wipes the user's data and seeds a
// varied dataset (clients, invoices across statuses/months, payments, cash flow).
// node scripts/reset-and-seed-demo.mjs
import pg from "pg";

const EMAIL = "chandanh.mailbox@gmail.com";
const c = new pg.Client({
  connectionString:
    "postgresql://postgres.qeqznsfhsavwwnsrkqgz:mrxaIH4NIWm0Cnt1@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
});
await c.connect();

const ures = await c.query(
  `select user_id from google_credentials where email=$1
   union select id from profiles where email=$1 limit 1`,
  [EMAIL]
);
if (!ures.rows.length) {
  console.log("User not found:", EMAIL);
  await c.end();
  process.exit(1);
}
const uid = ures.rows[0].user_id ?? ures.rows[0].id;
console.log("user_id:", uid);

// --- Wipe (invoices before clients: FK is restrict) ---
await c.query("delete from cash_flow_entries where user_id=$1", [uid]);
await c.query("delete from invoice_reminders where user_id=$1", [uid]);
await c.query("delete from invoices where user_id=$1", [uid]); // cascades items + payments
await c.query("delete from clients where user_id=$1", [uid]);
// Fresh GST identity: leave unset so the live "my GSTIN is …" verification can be demoed.
await c.query("update profiles set gstin=null, gst_username=null, gst_legal_name=null where id=$1", [uid]);
console.log("wiped existing data.");

const REMINDER_EMAIL = "chandanchethan321@gmail.com"; // Resend delivers only here on the free tier

// --- Clients: B2B across states (IGST vs CGST/SGST) + B2C ---
const clients = [
  { name: "Acme Solutions", company: "Acme Solutions Pvt Ltd", email: "accounts@acme.example", gstin: "27AAGCB1286QJZM", phone: "+91 98200 11111", address: "Andheri East, Mumbai, Maharashtra" },
  { name: "Zenith Traders", company: "Zenith Traders", email: "billing@zenith.example", gstin: "29AAACZ1234A1Z5", phone: "+91 98450 22222", address: "Koramangala, Bengaluru, Karnataka" },
  { name: "Sunrise Enterprises", company: "Sunrise Enterprises", email: REMINDER_EMAIL, gstin: "33AAGCB1286QOZO", phone: "+91 98400 33333", address: "T Nagar, Chennai, Tamil Nadu" },
  { name: "Global Tech", company: "Global Tech LLP", email: "ap@globaltech.example", gstin: "07AAACG1234B1Z5", phone: "+91 98110 44444", address: "Connaught Place, New Delhi" },
  { name: "Priya Nair", company: null, email: "priya.nair@example.com", gstin: null, phone: "+91 99000 55555", address: "Kochi, Kerala" },
  { name: "Rahul Mehta", company: null, email: "rahul.mehta@example.com", gstin: null, phone: "+91 99001 66666", address: "Pune, Maharashtra" },
];
const clientId = {};
for (const cl of clients) {
  const r = await c.query(
    `insert into clients (name, company, email, gstin, phone, address, user_id)
     values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [cl.name, cl.company, cl.email, cl.gstin, cl.phone, cl.address, uid]
  );
  clientId[cl.name] = r.rows[0].id;
}
console.log(`inserted ${clients.length} clients.`);

// --- Invoice helper ---
let seq = 0;
const invNo = () => `INV-${String(++seq).padStart(4, "0")}`;
const r2 = (n) => Math.round(n * 100) / 100;

async function makeInvoice({ client, issue, due, items, rate, paid = 0, method = "UPI", desc }) {
  const subtotal = r2(items.reduce((s, it) => s + it.qty * it.price, 0));
  const tax = r2(subtotal * (rate / 100));
  const total = r2(subtotal + tax);
  const fullyPaid = paid >= total;
  const gstin = clients.find((x) => x.name === client).gstin;
  const number = invNo();
  const ir = await c.query(
    `insert into invoices
      (invoice_number, client_id, user_id, invoice_type, status, issue_date, due_date,
       subtotal, tax_rate, tax_amount, total, amount_paid, paid_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id`,
    [number, clientId[client], uid, gstin ? "b2b" : "b2c", fullyPaid ? "paid" : "sent",
     issue, due, subtotal, rate, tax, total, paid, fullyPaid ? issue + "T10:00:00Z" : null]
  );
  const invId = ir.rows[0].id;
  let order = 0;
  for (const it of items) {
    await c.query(
      `insert into invoice_items (invoice_id, description, quantity, unit_price, amount, sort_order)
       values ($1,$2,$3,$4,$5,$6)`,
      [invId, it.desc, it.qty, it.price, r2(it.qty * it.price), order++]
    );
  }
  if (paid > 0) {
    await c.query(
      `insert into invoice_payments (invoice_id, user_id, amount, paid_on, method) values ($1,$2,$3,$4,$5)`,
      [invId, uid, paid, issue, method]
    );
    await c.query(
      `insert into cash_flow_entries (entry_date, type, category, description, amount, source, invoice_id, user_id)
       values ($1,'inflow','invoice_payment',$2,$3,'invoice',$4,$5)`,
      [issue, `Payment for ${number}`, paid, invId, uid]
    );
  }
  return { number, total, status: fullyPaid ? "paid" : "sent" };
}

// --- Invoices: varied statuses, GST rates, states, across May–Jul 2026 ---
const invoices = [
  // July 2026 (current month → prepare GST, current metrics)
  { client: "Acme Solutions", issue: "2026-07-03", due: "2026-07-18", rate: 18, paid: 94400, items: [{ desc: "Web app development", qty: 1, price: 80000 }] },
  { client: "Zenith Traders", issue: "2026-07-06", due: "2026-08-05", rate: 18, paid: 0, items: [{ desc: "Cloud consulting (30 hrs)", qty: 30, price: 1500 }] },
  { client: "Sunrise Enterprises", issue: "2026-07-08", due: "2026-07-15", rate: 18, paid: 0, items: [{ desc: "Annual maintenance contract", qty: 1, price: 60000 }] }, // OVERDUE
  { client: "Priya Nair", issue: "2026-07-10", due: "2026-07-25", rate: 18, paid: 17700, items: [{ desc: "Website design", qty: 1, price: 15000 }] },
  { client: "Global Tech", issue: "2026-07-12", due: "2026-08-12", rate: 12, paid: 50000, items: [{ desc: "ERP integration", qty: 1, price: 120000 }] }, // PARTIAL
  { client: "Rahul Mehta", issue: "2026-07-14", due: "2026-07-29", rate: 5, paid: 0, items: [{ desc: "Logo & branding kit", qty: 1, price: 8000 }] },
  // June 2026 (prior month → MoM deltas, prior GST period)
  { client: "Acme Solutions", issue: "2026-06-05", due: "2026-06-20", rate: 18, paid: 82600, items: [{ desc: "API development", qty: 1, price: 70000 }] },
  { client: "Zenith Traders", issue: "2026-06-20", due: "2026-07-05", rate: 18, paid: 35400, items: [{ desc: "Data migration", qty: 1, price: 30000 }] },
  { client: "Sunrise Enterprises", issue: "2026-06-25", due: "2026-07-10", rate: 18, paid: 0, items: [{ desc: "Support retainer (June)", qty: 1, price: 55000 }] }, // OVERDUE
  // May 2026
  { client: "Global Tech", issue: "2026-05-15", due: "2026-05-30", rate: 12, paid: 100800, items: [{ desc: "Platform audit", qty: 1, price: 90000 }] },
];
for (const iv of invoices) {
  const res = await makeInvoice(iv);
  console.log(`  ${res.number}: ${iv.client} — ₹${res.total} (${res.status})`);
}

// --- Extra cash-flow: manual inflow + varied outflows across months ---
const cash = [
  ["2026-07-02", "inflow", "other_income", "Consulting retainer (advance)", 40000, "manual"],
  ["2026-07-01", "outflow", "rent", "Office rent — July", 25000, "manual"],
  ["2026-07-01", "outflow", "salaries", "Team salaries — July", 120000, "manual"],
  ["2026-07-05", "outflow", "software", "SaaS subscriptions", 14000, "manual"],
  ["2026-07-09", "outflow", "utilities", "Electricity & internet", 6500, "manual"],
  ["2026-07-11", "outflow", "marketing", "Google Ads campaign", 22000, "manual"],
  ["2026-06-01", "outflow", "rent", "Office rent — June", 25000, "manual"],
  ["2026-06-01", "outflow", "salaries", "Team salaries — June", 115000, "manual"],
  ["2026-06-14", "outflow", "equipment", "New laptops (2)", 180000, "manual"],
  ["2026-05-01", "outflow", "rent", "Office rent — May", 25000, "manual"],
  ["2026-05-01", "outflow", "salaries", "Team salaries — May", 110000, "manual"],
];
for (const [date, type, category, description, amount, source] of cash) {
  await c.query(
    `insert into cash_flow_entries (entry_date, type, category, description, amount, source, user_id)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [date, type, category, description, amount, source, uid]
  );
}
console.log(`inserted ${cash.length} manual cash-flow entries (+ inflows from payments).`);
console.log("Demo seed complete for", EMAIL);
await c.end();
