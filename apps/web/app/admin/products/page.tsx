import Link from "next/link";
import { authedFetch } from "@/lib/api-server";

type Product = {
  id: string;
  name: string;
  sku: string;
  priceCents: number;
  currency: string;
  stock: number;
  category?: string;
};

function formatPrice(cents: number, currency: string): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "THB",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toFixed(0)} ${currency}`;
  }
}

export default async function AdminProductsPage() {
  const res = await authedFetch("/v1/products");
  if (!res.ok) {
    return <p className="text-sm text-red-600">Could not load products.</p>;
  }
  const data = (await res.json()) as { items: Product[] };
  const items = data.items ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Active catalog (soft-deleted items are hidden from the storefront).
          </p>
        </div>
        <Link
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
          href="/admin/products/new"
        >
          Add product
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-8 text-center text-slate-600 dark:text-slate-400">
          No products yet.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <table className="min-w-full divide-y divide-[var(--border)] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.category ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatPrice(p.priceCents, p.currency)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.stock}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      className="text-[var(--accent)] hover:underline"
                      href={`/admin/products/${p.id}`}
                    >
                      Edit
                    </Link>
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
