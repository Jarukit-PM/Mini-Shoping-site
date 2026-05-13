// NOTE: This module accesses localStorage; call only from client-side code.

import { fetchProducts, type Product } from "./api";
import { productTone } from "./tone";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type AdminProduct = Product & {
  tone: 1 | 2 | 3 | 4 | 5;
  _deleted?: boolean;
  _override?: boolean;
};

/* ------------------------------------------------------------------ */
/*  localStorage override layer                                         */
/* ------------------------------------------------------------------ */

const LS_KEY = "meridian_product_overrides";

function readOverrides(): Record<string, AdminProduct> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeOverrides(overrides: Record<string, AdminProduct>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(overrides));
}

/* ------------------------------------------------------------------ */
/*  Public API                                                          */
/* ------------------------------------------------------------------ */

/** Return merged product list: API results + localStorage overrides. */
export async function listAllProducts(): Promise<AdminProduct[]> {
  const overrides = readOverrides();

  // Try to fetch from API; fall back to overrides only on failure
  let apiItems: Product[] = [];
  try {
    const resp = await fetchProducts({ pageSize: 200 });
    apiItems = resp.items;
  } catch {
    // API unreachable — serve from overrides
  }

  const merged: Map<string, AdminProduct> = new Map();

  // Base from API
  for (const p of apiItems) {
    merged.set(p.id, {
      ...p,
      tone: productTone(p.id),
    });
  }

  // Apply overrides (including admin-created products not in API)
  for (const [id, override] of Object.entries(overrides)) {
    if (override._deleted) {
      merged.delete(id);
    } else {
      merged.set(id, override);
    }
  }

  return Array.from(merged.values());
}

/** Save (create or update) a product in the override layer. */
export function saveProduct(p: AdminProduct): void {
  const overrides = readOverrides();
  overrides[p.id] = {
    ...p,
    tone: p.tone ?? productTone(p.id),
    _override: true,
  };
  writeOverrides(overrides);
}

/** Soft-delete a product from the override layer. */
export function deleteProduct(id: string): void {
  const overrides = readOverrides();
  overrides[id] = { ...overrides[id], id, _deleted: true } as AdminProduct;
  writeOverrides(overrides);
}
