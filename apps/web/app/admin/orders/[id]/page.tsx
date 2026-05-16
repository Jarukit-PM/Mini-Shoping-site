"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminOrder, advanceOrderStatus } from "@/lib/admin-orders";
import { listAllProducts, type AdminProduct } from "@/lib/admin-products";
import { type Order, type OrderStatus } from "@/lib/orders";
import { formatPriceUSD } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { Placeholder } from "@/components/Placeholder";
import { Status } from "@/components/Status";
import { useToast } from "@/components/Toast";

const ADMIN_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  Pending: ["Paid", "Cancelled"],
  Paid: ["Shipped", "Cancelled"],
  Shipped: [],
  Delivered: [],
  Cancelled: [],
};

const STATUS_TIMELINE: OrderStatus[] = ["Pending", "Paid", "Shipped", "Delivered"];

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { push } = useToast();
  const [order, setOrder] = useState<Order | null | "loading">("loading");
  const [products, setProducts] = useState<AdminProduct[]>([]);

  function loadOrder() {
    getAdminOrder(id).then((o) => setOrder(o));
  }

  useEffect(() => {
    loadOrder();
    listAllProducts().then(setProducts);
  }, [id]);

  async function handleAdvance(status: OrderStatus) {
    if (!order || order === "loading") return;
    const ok = await advanceOrderStatus(order.id, status);
    if (ok) {
      push(`Order ${order.id.slice(0, 8)}… → ${status}`, "ok");
      loadOrder();
    } else {
      push("Could not update status", "bad");
    }
  }

  if (order === "loading") return null;
  if (!order) {
    return (
      <div className="empty">
        <div className="h-3">Order not found</div>
      </div>
    );
  }

  const nextStatuses = ADMIN_STATUS_FLOW[order.status] ?? [];
  const currentIdx = STATUS_TIMELINE.indexOf(order.status);

  return (
    <div className="fade-in">
      <button className="btn link" onClick={() => router.push("/admin/orders")}>
        <Icon name="arrowL" /> All orders
      </button>

      <div className="admin-head" style={{ marginTop: 16 }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Order</div>
          <h1 className="h-1 mono" style={{ margin: 0, letterSpacing: 0 }}>{order.id}</h1>
          <div className="muted tiny" style={{ marginTop: 6 }}>
            Placed {fmtDate(order.createdAt)} · {order.shippingAddress.name}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Status value={order.status} />
          {nextStatuses.map((s) => (
            <button
              key={s}
              className={`btn ${s === "Cancelled" ? "ghost" : "accent"}`}
              onClick={() => handleAdvance(s)}
            >
              {s === "Cancelled" ? "Cancel order" : `Mark ${s}`}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32 }}>
        {/* Left: items + totals + timeline */}
        <section>
          <div className="label" style={{ marginBottom: 14 }}>Items</div>
          <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r-2)", padding: "0 18px" }}>
            {order.lineItems.map((li) => {
              const prod = products.find((p) => p.id === li.productId);
              return (
                <div
                  key={li.productId}
                  className="summary-line"
                  style={{ borderBottom: "1px solid var(--line)" }}
                >
                  <Placeholder
                    label={prod ? prod.sku : ""}
                    tone={prod ? prod.tone : 1}
                  />
                  <div>
                    <div className="sl-name">{li.name}</div>
                    <div className="sl-qty">
                      <span>Qty {li.qty}</span>
                      <span style={{ marginLeft: 10, fontVariantNumeric: "tabular-nums" }}>
                        {formatPriceUSD(li.priceCents)} each
                      </span>
                    </div>
                  </div>
                  <div className="sl-price">{formatPriceUSD(li.lineTotalCents)}</div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 18, maxWidth: 320, marginLeft: "auto" }}>
            <div className="totals-row">
              <span>Subtotal</span>
              <span>{formatPriceUSD(order.subtotalCents)}</span>
            </div>
            <div className="totals-row">
              <span>Shipping</span>
              <span>{order.shippingCents === 0 ? "Free" : formatPriceUSD(order.shippingCents)}</span>
            </div>
            <div className="totals-row grand">
              <span>Total</span>
              <span className="val">{formatPriceUSD(order.grandTotalCents)}</span>
            </div>
          </div>

          <div className="label" style={{ marginTop: 32, marginBottom: 14 }}>Status timeline</div>
          <div className="timeline">
            {STATUS_TIMELINE.map((s, i) => (
              <div
                key={s}
                className={`tl-step ${i < currentIdx ? "done" : i === currentIdx ? "current" : ""}`}
              >
                <div className="tl-title">{s}</div>
                <div className="tl-meta">{i <= currentIdx ? "Complete" : "Pending"}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Right: customer, payment, notes */}
        <aside>
          <div className="label" style={{ marginBottom: 10 }}>Customer</div>
          <div style={{ marginBottom: 20 }}>
            <div>{order.shippingAddress.name}</div>
            <div className="muted">{order.shippingAddress.line1}</div>
            <div className="muted">
              {order.shippingAddress.city}, {order.shippingAddress.postal}
            </div>
            <div className="muted">{order.shippingAddress.country}</div>
          </div>

          <div className="label" style={{ marginBottom: 10 }}>Payment</div>
          <div style={{ marginBottom: 20 }}>
            <div className="mono">{order.paymentRef}</div>
            <div className="muted tiny" style={{ marginTop: 4 }}>Stub processor · captured</div>
          </div>

          <div className="label" style={{ marginBottom: 10 }}>Customer notes</div>
          <div className="muted">No notes from the customer.</div>
        </aside>
      </div>
    </div>
  );
}
