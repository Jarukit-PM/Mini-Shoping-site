// lib/admin-products.ts — Admin product API helpers (real API, no localStorage).

import { apiBaseUrl, type Product } from "./api";
import { productTone } from "./tone";

export type AdminProduct = Product & {
  tone: 1 | 2 | 3 | 4 | 5;
};

export async function listAllProducts(): Promise<AdminProduct[]> {
  try {
    const res = await fetch(`${apiBaseUrl()}/v1/products?pageSize=200`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items: Product[] };
    return (data.items ?? []).map((p) => ({
      ...p,
      tone: productTone(p.id),
    }));
  } catch {
    return [];
  }
}

export async function saveProduct(p: AdminProduct): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${apiBaseUrl()}/v1/admin/products/${p.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: p.name,
        description: p.description,
        category: p.category,
        imageUrl: p.imageUrl,
        sku: p.sku,
        priceCents: p.priceCents,
        currency: p.currency,
        stock: p.stock,
      }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      return { ok: false, error: err?.error?.message ?? "Update failed" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiBaseUrl()}/v1/admin/products/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}
