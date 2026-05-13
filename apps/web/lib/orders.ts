// NOTE: This module accesses localStorage and must only be called from client-side code.
// Do NOT import directly into server components or API routes.

// Re-export format helpers for convenience
export { fmtDate, newOrderId } from "./format";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type OrderStatus = "Pending" | "Paid" | "Shipped" | "Delivered" | "Cancelled";

export type LineItem = {
  productId: string;
  name: string;
  qty: number;
  priceCents: number;
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
  payment?: { last4: string };
};

/* ------------------------------------------------------------------ */
/*  Status flow (Pending → Paid → Shipped → Delivered)                 */
/* ------------------------------------------------------------------ */

export const STATUS_ORDER: OrderStatus[] = ["Pending", "Paid", "Shipped", "Delivered"];

export const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
  Pending: "Paid",
  Paid: "Shipped",
  Shipped: "Delivered",
  Delivered: null,
  Cancelled: null,
};

/* ------------------------------------------------------------------ */
/*  Seed data (ported from data.js SEED_ORDERS)                        */
/* ------------------------------------------------------------------ */

const SEED_ORDERS: Order[] = [
  {
    id: "MER-241108-A4F2",
    userId: "u-customer",
    lineItems: [
      { productId: "p005", name: "Brass Desk Lamp", qty: 1, priceCents: 18800 },
      { productId: "p006", name: "Field Notebook", qty: 2, priceCents: 2200 },
    ],
    subtotalCents: 23200,
    shippingCents: 800,
    grandTotalCents: 24000,
    shippingAddress: { name: "Alex Mercer", line1: "224 Bowery, Apt 5", city: "New York", postal: "10012", country: "USA" },
    status: "Shipped",
    paymentRef: "pay_x83hf2",
    createdAt: "2025-11-08T14:22:00Z",
  },
  {
    id: "MER-241015-E991",
    userId: "u-customer",
    lineItems: [
      { productId: "p001", name: "Linen Field Shirt", qty: 1, priceCents: 12800 },
    ],
    subtotalCents: 12800,
    shippingCents: 800,
    grandTotalCents: 13600,
    shippingAddress: { name: "Alex Mercer", line1: "224 Bowery, Apt 5", city: "New York", postal: "10012", country: "USA" },
    status: "Delivered",
    paymentRef: "pay_qq8a32",
    createdAt: "2025-10-15T09:11:00Z",
  },
  {
    id: "MER-241112-9CC1",
    userId: "u-other",
    lineItems: [
      { productId: "p010", name: "Walnut Salad Bowl", qty: 1, priceCents: 14400 },
      { productId: "p003", name: "Ribbed Carafe", qty: 1, priceCents: 6400 },
    ],
    subtotalCents: 20800,
    shippingCents: 800,
    grandTotalCents: 21600,
    shippingAddress: { name: "June Park", line1: "40 Garden Way", city: "Portland", postal: "97214", country: "USA" },
    status: "Pending",
    paymentRef: "pay_v22ka1",
    createdAt: "2025-11-12T08:02:00Z",
  },
  {
    id: "MER-241111-7B0D",
    userId: "u-other",
    lineItems: [
      { productId: "p008", name: "Single-Origin Coffee", qty: 3, priceCents: 2400 },
    ],
    subtotalCents: 7200,
    shippingCents: 800,
    grandTotalCents: 8000,
    shippingAddress: { name: "Mira Tanaka", line1: "88 Sansome St", city: "San Francisco", postal: "94104", country: "USA" },
    status: "Paid",
    paymentRef: "pay_l01mk9",
    createdAt: "2025-11-11T19:47:00Z",
  },
];

/* ------------------------------------------------------------------ */
/*  localStorage-backed store                                           */
/* ------------------------------------------------------------------ */

const LS_KEY = "meridian_orders";

function readAll(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as Order[];
    // First visit: seed
    localStorage.setItem(LS_KEY, JSON.stringify(SEED_ORDERS));
    return SEED_ORDERS;
  } catch {
    return [];
  }
}

function writeAll(orders: Order[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(orders));
}

export function getOrders(): Order[] {
  return readAll();
}

export function getOrder(id: string): Order | undefined {
  return readAll().find((o) => o.id === id);
}

export function addOrder(order: Order): void {
  const orders = readAll();
  writeAll([order, ...orders]);
}

export function updateOrderStatus(id: string, status: OrderStatus): void {
  const orders = readAll().map((o) => (o.id === id ? { ...o, status } : o));
  writeAll(orders);
}
