"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Status } from "@/components/Status";
import { Placeholder } from "@/components/Placeholder";
import { getOrder } from "@/lib/orders";
import { STATUS_ORDER } from "@/lib/orders";
import type { Order } from "@/lib/orders";
import { fmtDate } from "@/lib/format";
import { formatPriceUSD } from "@/lib/api";
import { productTone } from "@/lib/tone";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    getOrder(id).then((o) => setOrder(o ?? null));
  }, [id]);

  if (order === undefined) {
    return (
      <div className="fade-in" style={{ padding: "80px 40px" }}>
        <div className="muted">Loading…</div>
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="empty" style={{ padding: "120px 0" }}>
        <div className="heading-3">Order not found</div>
        <button className="btn ghost" onClick={() => router.push("/orders")}>
          Back
        </button>
      </div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(order.status);

  return (
    <div
      className="fade-in"
      style={{ maxWidth: 920, margin: "0 auto", padding: "40px 40px 80px" }}
    >
      <button className="btn link" onClick={() => router.push("/orders")}>
        <Icon name="arrowL" /> All orders
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: 18,
          gap: 40,
        }}
      >
        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Order
          </div>
          <h1
            className="heading-1 mono"
            style={{ margin: 0, letterSpacing: 0 }}
          >
            {order.id}
          </h1>
          <div className="muted" style={{ marginTop: 6 }}>
            Placed {fmtDate(order.createdAt)}
          </div>
        </div>
        <Status value={order.status} />
      </div>

      <div className="divider"></div>

      <div className="timeline">
        {STATUS_ORDER.map((s, i) => (
          <div
            key={s}
            className={`tl-step ${
              i < currentIdx ? "done" : i === currentIdx ? "current" : ""
            }`}
          >
            <div className="tl-title">{s}</div>
            <div className="tl-meta">
              {i <= currentIdx ? "Complete" : "Pending"}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 40 }}>
        <div className="label" style={{ marginBottom: 14 }}>
          Items
        </div>
        {order.lineItems.map((li) => (
          <div
            key={li.productId}
            className="summary-line"
            style={{ borderBottom: "1px solid var(--line)" }}
          >
            <Placeholder
              label={li.productId}
              tone={productTone(li.productId)}
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
            <div className="sl-price">
              {formatPriceUSD(li.lineTotalCents)}
            </div>
          </div>
        ))}
        <div
          style={{ marginTop: 18, maxWidth: 320, marginLeft: "auto" }}
        >
          <div className="totals-row">
            <span>Subtotal</span>
            <span>{formatPriceUSD(order.subtotalCents)}</span>
          </div>
          <div className="totals-row">
            <span>Shipping</span>
            <span>
              {order.shippingCents === 0
                ? "Free"
                : formatPriceUSD(order.shippingCents)}
            </span>
          </div>
          <div className="totals-row grand">
            <span>Total</span>
            <span className="val">
              {formatPriceUSD(order.grandTotalCents)}
            </span>
          </div>
        </div>
      </div>

      <div className="divider"></div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}
      >
        <div>
          <div className="label" style={{ marginBottom: 10 }}>
            Shipping to
          </div>
          <div>{order.shippingAddress.name}</div>
          <div className="muted">{order.shippingAddress.line1}</div>
          <div className="muted">
            {order.shippingAddress.city}, {order.shippingAddress.postal}
          </div>
          <div className="muted">{order.shippingAddress.country}</div>
        </div>
        <div>
          <div className="label" style={{ marginBottom: 10 }}>
            Payment reference
          </div>
          <div className="mono">{order.paymentRef}</div>
        </div>
      </div>
    </div>
  );
}
