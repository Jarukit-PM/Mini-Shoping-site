/** Server-side Go API base URL; in Docker Compose use `http://api:8080`. */
export function apiBaseUrl(): string {
  return (
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8080"
  );
}

export type Product = {
  id: string
  name: string
  description?: string
  category?: string
  imageUrl?: string
  priceCents: number
  currency: string
  sku: string
  stock: number
}

export type ProductListParams = { q?: string; category?: string; page?: number; pageSize?: number }

export type ProductsResponse = { items: Product[]; page: number; pageSize: number; total: number }

export async function fetchProducts(p: ProductListParams = {}): Promise<ProductsResponse> {
  const url = new URL(`${apiBaseUrl()}/v1/products`)
  if (p.q) url.searchParams.set("q", p.q)
  if (p.category) url.searchParams.set("category", p.category)
  if (p.page) url.searchParams.set("page", String(p.page))
  if (p.pageSize) url.searchParams.set("pageSize", String(p.pageSize))
  const res = await fetch(url.toString(), { next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`fetchProducts ${res.status}`)
  return res.json()
}

export async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`${apiBaseUrl()}/v1/products/${id}`, { next: { revalidate: 60 } })
  if (res.status === 404) throw new Error("not_found")
  if (!res.ok) throw new Error(`fetchProduct ${res.status}`)
  return res.json()
}

export function formatPrice(cents: number, currency: string): string {
  const amount = cents / 100
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "THB" }).format(amount)
  } catch {
    return `${(amount).toFixed(2)} ${currency}`
  }
}

/**
 * Format cents as USD — always "$X.XX".
 * Used throughout the MERIDIAN design-system UI components.
 */
export function formatPriceUSD(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
