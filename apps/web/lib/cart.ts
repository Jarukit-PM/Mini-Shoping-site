import { apiBaseUrl, fetchProduct } from "./api"

export type CartLine = {
  productId: string
  name: string
  imageUrl?: string
  qty: number
  unitPriceCents: number
  lineTotalCents: number
}
export type Cart = { items: CartLine[]; grandTotalCents: number; currency: string }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(body?.error?.code ?? `http_${res.status}`), { status: res.status, body })
  }
  return res.json()
}

// --- Guest cart (localStorage, used when not authenticated) ---

const GUEST_KEY = "guest_cart"
type GuestItem = { productId: string; qty: number }

function getGuestItems(): GuestItem[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(GUEST_KEY) ?? "[]") } catch { return [] }
}

function saveGuestItems(items: GuestItem[]): void {
  localStorage.setItem(GUEST_KEY, JSON.stringify(items))
}

async function guestToCart(items: GuestItem[]): Promise<Cart> {
  let grand = 0
  let currency = ""
  const lines: CartLine[] = []
  for (const item of items) {
    try {
      const p = await fetchProduct(item.productId)
      const lineTotal = p.priceCents * item.qty
      lines.push({ productId: item.productId, name: p.name, imageUrl: p.imageUrl, qty: item.qty, unitPriceCents: p.priceCents, lineTotalCents: lineTotal })
      grand += lineTotal
      if (!currency) currency = p.currency
    } catch { /* product removed from catalog — skip */ }
  }
  return { items: lines, grandTotalCents: grand, currency }
}

function isUnauth(e: unknown): boolean {
  return (e as Partial<{ status: number }>).status === 401
}

// --- Public API ---

export const getCart = async (): Promise<Cart> => {
  try { return await call<Cart>("/v1/cart") }
  catch (e) { if (isUnauth(e)) return guestToCart(getGuestItems()); throw e }
}

export const addItem = async (productId: string, qty: number): Promise<Cart> => {
  try { return await call<Cart>("/v1/cart/items", { method: "POST", body: JSON.stringify({ productId, qty }) }) }
  catch (e) {
    if (isUnauth(e)) {
      const items = getGuestItems()
      const existing = items.find(i => i.productId === productId)
      if (existing) existing.qty += qty; else items.push({ productId, qty })
      saveGuestItems(items)
      return guestToCart(items)
    }
    throw e
  }
}

export const updateQty = async (productId: string, qty: number): Promise<Cart> => {
  try { return await call<Cart>(`/v1/cart/items/${productId}`, { method: "PATCH", body: JSON.stringify({ qty }) }) }
  catch (e) {
    if (isUnauth(e)) {
      const items = getGuestItems()
      const it = items.find(i => i.productId === productId)
      if (it) it.qty = qty
      saveGuestItems(items)
      return guestToCart(items)
    }
    throw e
  }
}

export const removeItem = async (productId: string): Promise<Cart> => {
  try { return await call<Cart>(`/v1/cart/items/${productId}`, { method: "DELETE" }) }
  catch (e) {
    if (isUnauth(e)) {
      const items = getGuestItems().filter(i => i.productId !== productId)
      saveGuestItems(items)
      return guestToCart(items)
    }
    throw e
  }
}
