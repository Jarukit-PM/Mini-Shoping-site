"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Placeholder } from "@/components/Placeholder";
import { Qty } from "@/components/Qty";
import { useCart } from "@/components/CartProvider";
import { formatPriceUSD } from "@/lib/api";
import type { Product } from "@/lib/api";
import { productTone } from "@/lib/tone";

export function ProductDetailClient({ product }: { product: Product }) {
  const router = useRouter();
  const { addToCart } = useCart();

  const [qty, setQty] = useState(1);
  const [thumbIdx, setThumbIdx] = useState(0);
  const [overStock, setOverStock] = useState(false);

  const out = product.stock === 0;
  const tone = productTone(product.id);

  const handleAdd = () => {
    if (qty > product.stock) {
      setOverStock(true);
      return;
    }
    addToCart(product.id, qty, product.name);
  };

  const specs: Record<string, string> = {
    Category: product.category ?? "—",
    SKU: product.sku,
    Origin: "Made in studio",
    Care: "—",
  };

  return (
    <div className="product-page fade-in">
      <div className="product-gallery">
        <Placeholder
          className="main-ph"
          label={`VIEW ${thumbIdx + 1}/4`}
          tone={tone}
          sku={product.sku}
        />
        <div className="thumbs">
          {[1, 2, 3, 4].map((i) => (
            <Placeholder
              key={i}
              className={thumbIdx === i - 1 ? "sel" : ""}
              tone={((tone + i - 1) % 5) + 1 as 1 | 2 | 3 | 4 | 5}
              label={`#${i}`}
              style={{ cursor: "pointer" }}
              onClick={() => setThumbIdx(i - 1)}
            />
          ))}
        </div>
      </div>

      <div className="product-info">
        <div style={{ display: "flex", flexDirection: "column", gap: 0, minWidth: 0 }}>
          <div className="label" style={{ marginBottom: 16 }}>
            <a
              onClick={() =>
                router.push(`/?category=${encodeURIComponent(product.category ?? "")}`)
              }
              style={{ cursor: "pointer" }}
            >
              {product.category}
            </a>
            <span style={{ margin: "0 8px" }}>·</span>
            <span className="mono" style={{ letterSpacing: 0 }}>
              {product.sku}
            </span>
          </div>
          <h1 className="h-1" style={{ margin: "0 0 64px", lineHeight: 1.25, overflowWrap: "break-word", wordBreak: "break-word" }}>
            {product.name}
          </h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span
              className="h-3"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatPriceUSD(product.priceCents)}
            </span>
            {out ? (
              <span className="badge bad dot" style={{ alignSelf: "flex-start", padding: "8px 16px", fontSize: 13 }}>Out of stock</span>
            ) : product.stock < 5 ? (
              <span className="badge warn dot" style={{ alignSelf: "flex-start", padding: "8px 16px", fontSize: 13 }}>
                Only {product.stock} left
              </span>
            ) : (
              <span className="badge ok dot" style={{ alignSelf: "flex-start", padding: "8px 16px", fontSize: 13 }}>In stock · ships in 2 days</span>
            )}
          </div>
        </div>

        {product.description && (
          <p className="desc">{product.description}</p>
        )}

        {overStock && (
          <div className="banner bad">
            <Icon name="alert" />
            <div>
              <strong>สินค้าบางรายการหมด</strong> · You&apos;re trying to
              order {qty}, but only {product.stock}{" "}
              {product.stock === 1 ? "is" : "are"} in stock right now.
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Qty
            value={qty}
            onChange={(v) => {
              setQty(v);
              setOverStock(false);
            }}
            max={Math.max(product.stock, 1)}
          />
          <button
            className="btn lg accent"
            disabled={out}
            onClick={handleAdd}
            style={{ flex: 1 }}
          >
            {out ? (
              "Sold out"
            ) : (
              <span
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span>Add to cart</span>
                <span style={{ opacity: 0.7, fontVariantNumeric: "tabular-nums" }}>
                  {formatPriceUSD(product.priceCents * qty)}
                </span>
              </span>
            )}
          </button>
        </div>

        <dl className="spec-list">
          {Object.entries(specs).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <div
          style={{
            display: "flex",
            gap: 24,
            fontSize: 12,
            color: "var(--muted)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="truck" /> Ships within 2 business days
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="package" /> 30-day returns
          </span>
        </div>
      </div>
    </div>
  );
}
