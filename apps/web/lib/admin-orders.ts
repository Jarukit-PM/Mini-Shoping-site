// lib/admin-orders.ts — Admin order API helpers (client-side, credentials: "include").

import { apiBaseUrl } from "./api";
import type { Order, OrderStatus, ShippingAddress } from "./orders";

export type AdminOrderSummary = {
  id: string;
  userId: string;
  status: OrderStatus;
  createdAt: string;
  grandTotalCents: number;
};

export async function getAdminOrders(): Promise<AdminOrderSummary[]> {
  try {
    const res = await fetch(`${apiBaseUrl()}/v1/admin/orders`, { credentials: "include" });
    if (!res.ok) return [];
    const data = (await res.json()) as { items: AdminOrderSummary[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

interface AdminApiLineItem {
  productId: string;
  name: string;
  qty: number;
  priceCentsSnapshot: number;
  lineTotalCents: number;
}

interface AdminApiOrder {
  id: string;
  userId: string;
  lineItems: AdminApiLineItem[];
  totals: { subtotalCents: number; shippingCents: number; grandTotalCents: number };
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  paymentRef: string;
  createdAt: string;
}

export async function getAdminOrder(id: string): Promise<Order | null> {
  try {
    const res = await fetch(`${apiBaseUrl()}/v1/admin/orders/${id}`, { credentials: "include" });
    if (!res.ok) return null;
    const o = (await res.json()) as AdminApiOrder;
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
  } catch {
    return null;
  }
}

export async function advanceOrderStatus(id: string, status: OrderStatus): Promise<boolean> {
  try {
    const res = await fetch(`${apiBaseUrl()}/v1/admin/orders/${id}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
