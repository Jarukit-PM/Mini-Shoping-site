"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Placeholder } from "@/components/Placeholder";
import { getOrder } from "@/lib/orders";
import type { Order } from "@/lib/orders";
import { fmtDate } from "@/lib/format";
import { formatPriceUSD } from "@/lib/api";
import { productTone } from "@/lib/tone";

export default function ConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = React.use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    getOrder(orderId).then((o) => setOrder(o ?? null));
  }, [orderId]);

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
        <Icon name="alert" className="xl" />
        <div className="h-3">No order to show</div>
        <button className="btn ghost" onClick={() => router.push("/")}>
          Back to shop
        </button>
      </div>
    );
  }

  const firstName = order.shippingAddress.name.split(" ")[0];
  const placedTime = new Date(order.createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="confirm-page fade-in">
      <div className="hero">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "var(--ok)",
          }}
        >
          <Icon name="check" className="xl" />
          <span className="label" style={{ color: "inherit" }}>
            Order confirmed
          </span>
        </div>
        <h1 className="h-display" style={{ margin: 0 }}>
          Thank you, {firstName}.
        </h1>
        <p className="body muted" style={{ margin: 0, maxWidth: 540 }}>
          We&apos;ve received your order and sent a copy of the confirmation to
          your email. We&apos;ll send tracking the moment it ships.
        </p>
        <div className="order-id">
          <span className="muted">Order ID</span>
          <strong>{order.id}</strong>
        </div>
      </div>

      <div className="timeline">
        <div className="tl-step done">
          <div className="tl-title">Order placed</div>
          <div className="tl-meta">
            {fmtDate(order.createdAt)} · {placedTime}
          </div>
        </div>
        <div className="tl-step current">
          <div className="tl-title">Pending — being prepared</div>
          <div className="tl-meta">
            Status will update to &ldquo;Paid&rdquo; once our team verifies the
            charge.
          </div>
        </div>
        <div className="tl-step">
          <div className="tl-title">Shipped</div>
          <div className="tl-meta">Typically within 2 business days</div>
        </div>
        <div className="tl-step">
          <div className="tl-title">Delivered</div>
          <div className="tl-meta">
            Carrier: USPS Ground · 3–5 business days
          </div>
        </div>
      </div>

      <div className="divider"></div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 40,
          marginBottom: 32,
        }}
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
            Payment
          </div>
          <div>Card</div>
          <div className="muted mono tiny">{order.paymentRef}</div>
        </div>
      </div>

      <div>
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
          style={{
            marginTop: 18,
            maxWidth: 320,
            marginLeft: "auto",
          }}
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

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 40,
          justifyContent: "flex-end",
        }}
      >
        <button
          className="btn ghost"
          onClick={() => router.push("/orders")}
        >
          View all orders
        </button>
        <button className="btn" onClick={() => router.push("/")}>
          Continue shopping <Icon name="arrowR" />
        </button>
      </div>
    </div>
  );
}
