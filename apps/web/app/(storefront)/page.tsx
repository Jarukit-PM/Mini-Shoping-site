import { Suspense } from "react";
import { fetchProducts } from "@/lib/api";
import type { Product } from "@/lib/api";
import { CatalogClient } from "./CatalogClient";

export const revalidate = 60;

export default async function CatalogPage() {
  let items: Product[] = [];
  let fetchError = false;
  try {
    const res = await fetchProducts({ pageSize: 100 });
    items = res.items;
  } catch {
    fetchError = true;
  }

  return (
    <Suspense fallback={null}>
      <CatalogClient initialProducts={items} fetchError={fetchError} />
    </Suspense>
  );
}
