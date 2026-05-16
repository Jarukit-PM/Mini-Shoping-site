// lib/orders.ts — API-backed order store.
// getOrders and getOrder call the Go API; call only from client components (credentials: "include").

export type OrderStatus = "Pending" | "Paid" | "Shipped" | "Delivered" | "Cancelled";

export type LineItem = {
  productId: string;
  name: string;
  qty: number;
  priceCents: number;       // mapped from API's priceCentsSnapshot
  lineTotalCents: number;
};

export type ShippingAddress = {
  name: string;
  line1: string;
  city: string;
  postal: string;
  country: string;
};

export type Order = {
  id: string;
  userId?: string;
  lineItems: LineItem[];
  subtotalCents: number;
  shippingCents: number;
  grandTotalCents: number;
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  paymentRef: string;
  createdAt: string;
};

export type OrderSummary = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  grandTotalCents: number;
};

export const STATUS_ORDER: OrderStatus[] = ["Pending", "Paid", "Shipped", "Delivered"];

export const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
  Pending: "Paid",
  Paid: "Shipped",
  Shipped: "Delivered",
  Delivered: null,
  Cancelled: null,
};

function clientBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
}

export async function getOrders(): Promise<OrderSummary[]> {
  try {
    const res = await fetch(`${clientBase()}/v1/orders`, { credentials: "include" });
    if (!res.ok) return [];
    const data = (await res.json()) as { items: OrderSummary[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

interface ApiLineItem {
  productId: string;
  name: string;
  qty: number;
  priceCentsSnapshot: number;
  lineTotalCents: number;
}

interface ApiOrder {
  id: string;
  userId: string;
  lineItems: ApiLineItem[];
  totals: { subtotalCents: number; shippingCents: number; grandTotalCents: number };
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  paymentRef: string;
  createdAt: string;
}

function apiOrderToOrder(o: ApiOrder): Order {
  return {
    id: o.id,
    userId: o.userId,
    lineItems: (o.lineItems ?? []).map((li) => ({
      productId: li.productId,
      name: li.name,
      qty: li.qty,
      priceCents: li.priceCentsSnapshot,
      lineTotalCents: li.lineTotalCents,
    })),
    subtotalCents: o.totals?.subtotalCents ?? 0,
    shippingCents: o.totals?.shippingCents ?? 0,
    grandTotalCents: o.totals?.grandTotalCents ?? 0,
    shippingAddress: o.shippingAddress,
    status: o.status,
    paymentRef: o.paymentRef,
    createdAt: o.createdAt,
  };
}

export async function getOrder(id: string): Promise<Order | null> {
  try {
    const res = await fetch(`${clientBase()}/v1/orders/${id}`, { credentials: "include" });
    if (!res.ok) return null;
    return apiOrderToOrder((await res.json()) as ApiOrder);
  } catch {
    return null;
  }
}
