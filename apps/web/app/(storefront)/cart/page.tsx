"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Placeholder } from "@/components/Placeholder";
import { Qty } from "@/components/Qty";
import { useCart } from "@/components/CartProvider";
import { fetchProduct, formatPriceUSD } from "@/lib/api";
import type { Product } from "@/lib/api";
import { productTone } from "@/lib/tone";

export default function CartPage() {
  const router = useRouter();
  const { cart, updateQty, removeItem } = useCart();
  const [productMap, setProductMap] = useState<Record<string, Product>>({});

  // Fetch full product details for stock + category + sku
  useEffect(() => {
    if (!cart || cart.items.length === 0) return;
    Promise.all(
      cart.items.map((item) =>
        fetchProduct(item.productId).then((p) => ({ id: item.productId, p }))
      )
    ).then((results) => {
      const map: Record<string, Product> = {};
      results.forEach(({ id, p }) => {
        map[id] = p;
      });
      setProductMap(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.items.map((i) => i.productId).join(",")]);

  if (!cart) {
    return (
      <div className="fade-in" style={{ padding: "80px 40px" }}>
        <div className="muted">Loading…</div>
      </div>
    );
  }

  const items = cart.items;

  if (items.length === 0) {
    return (
      <div className="empty" style={{ padding: "120px 0" }}>
        <Icon name="bag" className="xl" />
        <div className="heading-2">Your bag is empty</div>
        <button className="btn ghost" onClick={() => router.push("/")}>
          Back to shop
        </button>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.lineTotalCents, 0);
  const shipping = subtotal >= 15000 ? 0 : 800;
  const total = subtotal + shipping;

  return (
    <div
      className="fade-in"
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "40px 40px 80px",
      }}
    >
      <h1 className="heading-1" style={{ margin: "0 0 24px" }}>
        Your bag
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 48,
        }}
      >
        <div>
          {items.map((line) => {
            const prod = productMap[line.productId];
            const tone = prod
              ? productTone(prod.id)
              : productTone(line.productId);
            const stockMax = prod ? prod.stock : line.qty;
            return (
              <div key={line.productId} className="line-item">
                <Placeholder
                  label={prod?.sku ?? line.productId}
                  tone={tone}
                />
                <div>
                  <div className="li-name">{line.name}</div>
                  <div className="li-meta">
                    {prod
                      ? `${prod.category} · ${prod.sku}`
                      : line.productId}
                  </div>
                  <div className="li-bottom">
                    <Qty
                      value={line.qty}
                      onChange={(v) => updateQty(line.productId, v)}
                      max={Math.max(stockMax, 1)}
                    />
                    <span className="li-price">
                      {formatPriceUSD(line.lineTotalCents)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(line.productId)}
                  style={{ alignSelf: "flex-start", color: "var(--muted)" }}
                >
                  <Icon name="trash" />
                </button>
              </div>
            );
          })}
        </div>

        <aside className="summary-panel">
          <h3>Summary</h3>
          <div className="totals-row">
            <span>Subtotal</span>
            <span>{formatPriceUSD(subtotal)}</span>
          </div>
          <div className="totals-row">
            <span>Shipping</span>
            <span>{shipping === 0 ? "Free" : formatPriceUSD(shipping)}</span>
          </div>
          <div className="totals-row grand">
            <span>Total</span>
            <span className="val">{formatPriceUSD(total)}</span>
          </div>
          <button
            className="btn lg full accent"
            style={{ marginTop: 16 }}
            onClick={() => router.push("/checkout")}
          >
            Checkout <Icon name="arrowR" />
          </button>
        </aside>
      </div>
    </div>
  );
}
