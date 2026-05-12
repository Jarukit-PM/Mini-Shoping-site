import Link from "next/link";
import { notFound } from "next/navigation";
import { authedFetch } from "@/lib/api-server";

type OrderDetail = {
  id: string;
  status: string;
  createdAt: string;
  paymentRef: string;
  totals: { subtotalCents: number; shippingCents: number; grandTotalCents: number };
  shippingAddress: { name: string; line1: string; city: string; postal: string; country: string };
  lineItems: Array<{
    productId: string;
    name: string;
    qty: number;
    priceCentsSnapshot: number;
    lineTotalCents: number;
  }>;
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

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await authedFetch(`/v1/orders/${id}`);
  if (res.status === 404) notFound();
  if (res.status === 403) {
    return <p className="px-4 py-10 text-sm text-red-600">You do not have access to this order.</p>;
  }
  if (!res.ok) {
    return <p className="px-4 py-10 text-sm text-red-600">Could not load order.</p>;
  }
  const o = (await res.json()) as OrderDetail;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <p className="text-sm text-slate-500">
        <Link className="text-[var(--accent)] hover:underline" href="/orders">
          ← Orders
        </Link>
      </p>
      <h1 className="mt-4 font-mono text-lg font-semibold">{o.id}</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {o.createdAt} · <span className="font-medium text-[var(--foreground)]">{o.status}</span>
      </p>
      <p className="mt-2 text-xs text-slate-500">Payment ref: {o.paymentRef}</p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Ship to</h2>
        <p className="mt-2 text-sm">
          {o.shippingAddress.name}
          <br />
          {o.shippingAddress.line1}
          <br />
          {o.shippingAddress.city} {o.shippingAddress.postal}
          <br />
          {o.shippingAddress.country}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Items</h2>
        <ul className="mt-2 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--card)]">
          {o.lineItems.map((li) => (
            <li className="flex justify-between px-3 py-2 text-sm" key={li.productId}>
              <span>
                {li.name} × {li.qty}
              </span>
              <span>{formatMoney(li.lineTotalCents)}</span>
            </li>
          ))}
          <li className="flex justify-between px-3 py-2 text-sm text-slate-600">
            <span>Subtotal</span>
            <span>{formatMoney(o.totals.subtotalCents)}</span>
          </li>
          <li className="flex justify-between px-3 py-2 text-sm text-slate-600">
            <span>Shipping</span>
            <span>{formatMoney(o.totals.shippingCents)}</span>
          </li>
          <li className="flex justify-between px-3 py-3 font-semibold">
            <span>Total</span>
            <span>{formatMoney(o.totals.grandTotalCents)}</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
