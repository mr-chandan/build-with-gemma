/** Format a number as Indian Rupees with the Indian numbering system. */
export function inr(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? Number(n) : (n ?? 0);
  return "₹" + (v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/** Format an ISO date (YYYY-MM-DD or full timestamp) as e.g. "15 Aug 2026". */
export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
