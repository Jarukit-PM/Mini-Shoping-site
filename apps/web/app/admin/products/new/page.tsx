"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiBaseUrl } from "@/lib/api";

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sku, setSku] = useState("");
  const [currency, setCurrency] = useState("THB");
  const [priceBaht, setPriceBaht] = useState("");
  const [stock, setStock] = useState("0");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setMessage(null);
    const priceNum = Number(priceBaht);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setFieldErrors({ priceCents: "ราคาสินค้าต้องมากกว่า 0" });
      return;
    }
    const priceCents = Math.round(priceNum * 100);
    const stockNum = Number.parseInt(stock, 10);
    if (!Number.isFinite(stockNum) || stockNum < 0) {
      setFieldErrors({ stock: "stock must be >= 0" });
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`${apiBaseUrl()}/v1/admin/products`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          category,
          imageUrl,
          sku,
          currency: currency || "THB",
          priceCents,
          stock: stockNum,
        }),
      });
      if (res.status === 201) {
        router.push("/admin/products");
        router.refresh();
        return;
      }
      const body = (await res.json()) as {
        error?: { code?: string; message?: string; fields?: Record<string, string> };
      };
      if (body.error?.fields) setFieldErrors(body.error.fields);
      if (body.error?.code === "invalid_price" || body.error?.fields?.priceCents) {
        setMessage(body.error.fields?.priceCents ?? body.error.message ?? "ราคาสินค้าต้องมากกว่า 0");
      } else {
        setMessage(body.error?.message ?? "Could not create product");
      }
    } catch {
      setMessage("Could not reach the API");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Add product</h1>
        <Link className="text-sm text-[var(--accent)] hover:underline" href="/admin/products">
          Back
        </Link>
      </div>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium" htmlFor="name">
            Name
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm outline-none ring-[var(--accent)] focus:ring-2"
            id="name"
            onChange={(e) => setName(e.target.value)}
            required
            value={name}
          />
          {fieldErrors.name ? <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p> : null}
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="description">
            Description
          </label>
          <textarea
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm outline-none ring-[var(--accent)] focus:ring-2"
            id="description"
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            value={description}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" htmlFor="category">
              Category
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm outline-none ring-[var(--accent)] focus:ring-2"
              id="category"
              onChange={(e) => setCategory(e.target.value)}
              value={category}
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="imageUrl">
              Image URL
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm outline-none ring-[var(--accent)] focus:ring-2"
              id="imageUrl"
              onChange={(e) => setImageUrl(e.target.value)}
              type="url"
              value={imageUrl}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" htmlFor="sku">
              SKU
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-mono text-sm shadow-sm outline-none ring-[var(--accent)] focus:ring-2"
              id="sku"
              onChange={(e) => setSku(e.target.value)}
              required
              value={sku}
            />
            {fieldErrors.sku ? <p className="mt-1 text-xs text-red-600">{fieldErrors.sku}</p> : null}
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="currency">
              Currency
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm outline-none ring-[var(--accent)] focus:ring-2"
              id="currency"
              onChange={(e) => setCurrency(e.target.value)}
              value={currency}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" htmlFor="price">
              Price (major units, e.g. THB)
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm outline-none ring-[var(--accent)] focus:ring-2"
              id="price"
              min="0"
              onChange={(e) => setPriceBaht(e.target.value)}
              step="0.01"
              type="number"
              value={priceBaht}
            />
            {fieldErrors.priceCents ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.priceCents}</p>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="stock">
              Stock
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm outline-none ring-[var(--accent)] focus:ring-2"
              id="stock"
              min="0"
              onChange={(e) => setStock(e.target.value)}
              type="number"
              value={stock}
            />
            {fieldErrors.stock ? <p className="mt-1 text-xs text-red-600">{fieldErrors.stock}</p> : null}
          </div>
        </div>
        {message ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {message}
          </p>
        ) : null}
        <button
          className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving…" : "Create product"}
        </button>
      </form>
    </div>
  );
}
