import Link from "next/link";
import { authedFetch } from "@/lib/api-server";

type OrderRow = {
  id: string;
  status: string;
  createdAt: string;
  grandTotalCents: number;
};

function formatMoney(cents: number): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toFixed(0)} THB`;
  }
}

export default async function OrdersPage() {
  const res = await authedFetch("/v1/orders");
  if (!res.ok) {
    return <p className="px-4 py-10 text-sm text-red-600">Could not load orders.</p>;
  }
  const data = (await res.json()) as { items: OrderRow[] };
  const items = data.items ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your orders</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">UC-06 — only your own orders are listed.</p>
      {items.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-8 text-center text-slate-600 dark:text-slate-400">
          No orders yet.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--card)]">
          {items.map((o) => (
            <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-4" key={o.id}>
              <div>
                <Link className="font-mono text-sm font-medium text-[var(--accent)] hover:underline" href={`/orders/${o.id}`}>
                  {o.id}
                </Link>
                <p className="text-xs text-slate-500">{o.createdAt}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{o.status}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{formatMoney(o.grandTotalCents)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
