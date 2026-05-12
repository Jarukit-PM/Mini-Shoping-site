import { authedFetch } from "@/lib/api-server";
import { OrderStatusRow } from "./OrderStatusRow";

type OrderRow = {
  id: string;
  userId: string;
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

export default async function AdminOrdersPage() {
  const res = await authedFetch("/v1/admin/orders");
  if (!res.ok) {
    return <p className="text-sm text-red-600">Could not load orders.</p>;
  }
  const data = (await res.json()) as { items: OrderRow[] };
  const items = data.items ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Update fulfillment status (UC-11). Invalid transitions are rejected by the API.
      </p>

      {items.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-8 text-center text-slate-600 dark:text-slate-400">
          No orders yet — they will appear here after checkout is implemented.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <table className="min-w-full divide-y divide-[var(--border)] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {items.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-mono text-xs">{o.id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{o.userId}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{o.createdAt}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(o.grandTotalCents)}</td>
                  <td className="px-4 py-3">
                    <OrderStatusRow orderId={o.id} status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
