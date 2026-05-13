"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { Placeholder } from "./Placeholder";
import { Qty } from "./Qty";
import { formatPriceUSD } from "@/lib/api";
import { productTone } from "@/lib/tone";
import type { Cart } from "@/lib/cart";

/* ------------------------------------------------------------------ */
/*  Props — driven by CartProvider                                      */
/* ------------------------------------------------------------------ */

interface CartDrawerProps {
  open: boolean;
  cart: Cart | null;
  onClose: () => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveItem: (productId: string) => void;
}

export function CartDrawer({
  open,
  cart,
  onClose,
  onUpdateQty,
  onRemoveItem,
}: CartDrawerProps) {
  const router = useRouter();
  const items = cart?.items ?? [];
  const subtotal = items.reduce((s, li) => s + li.lineTotalCents, 0);
  const shipping = subtotal > 0 && subtotal < 15000 ? 800 : 0;
  const total = subtotal + shipping;

  const handleCheckout = () => {
    onClose();
    router.push("/checkout");
  };

  return (
    <>
      {/* Scrim */}
      <div className={`scrim ${open ? "open" : ""}`} onClick={onClose} />

      {/* Drawer panel */}
      <div className={`drawer ${open ? "open" : ""}`}>
        {/* Header */}
        <div className="drawer-head">
          <div className="h-3">Your bag</div>
          <button className="icon-btn" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="empty">
              <Icon name="bag" className="xl" />
              <span>Your bag is empty</span>
            </div>
          ) : (
            items.map((li) => (
              <div key={li.productId} className="line-item">
                {/* Placeholder thumbnail */}
                <Placeholder tone={productTone(li.productId)} />

                {/* Item info */}
                <div>
                  <div className="li-name">{li.name}</div>
                  <div className="li-meta">{formatPriceUSD(li.unitPriceCents)} each</div>
                  <div className="li-bottom">
                    <Qty
                      value={li.qty}
                      onChange={(v) => onUpdateQty(li.productId, v)}
                    />
                    <span className="li-price">
                      {formatPriceUSD(li.lineTotalCents)}
                    </span>
                  </div>
                </div>

                {/* Remove */}
                <button onClick={() => onRemoveItem(li.productId)}>
                  <Icon name="trash" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="drawer-foot">
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
            <button className="btn accent full lg" onClick={handleCheckout}>
              Checkout <Icon name="arrowR" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
