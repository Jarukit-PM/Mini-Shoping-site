/**
 * Format an ISO date string to "Nov 8, 2025" style.
 */
export function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

/**
 * Generate a new order ID like MER-260512-A4F2.
 */
export function newOrderId(): string {
  const d = new Date();
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MER-${ymd}-${suffix}`;
}
