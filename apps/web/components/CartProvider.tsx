"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getCart, addItem, updateQty as apiUpdateQty, removeItem as apiRemoveItem } from "@/lib/cart";
import type { Cart } from "@/lib/cart";
import { useToast } from "./Toast";
import { CartDrawer } from "./CartDrawer";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface CartContextValue {
  cart: Cart | null;
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  refresh: () => Promise<void>;
  addToCart: (productId: string, qty: number, productName?: string) => Promise<void>;
  updateQty: (productId: string, qty: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Context                                                             */
/* ------------------------------------------------------------------ */

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                            */
/* ------------------------------------------------------------------ */

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [open, setOpen] = useState(false);
  const { push } = useToast();

  const refresh = useCallback(async () => {
    try {
      const c = await getCart();
      setCart(c);
    } catch {
      // non-fatal — keep stale state
    }
  }, []);

  // Load cart on mount
  useEffect(() => {
    let cancelled = false;
    getCart()
      .then((c) => {
        if (!cancelled) setCart(c);
      })
      .catch(() => {
        // non-fatal — keep stale state
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);

  const addToCart = useCallback(
    async (productId: string, qty: number, productName?: string) => {
      try {
        const c = await addItem(productId, qty);
        setCart(c);
        setOpen(true);
        const name =
          productName ??
          c.items.find((i) => i.productId === productId)?.name ??
          "item";
        push(`Added ${name} to your bag`);
      } catch (err: unknown) {
        const code = (err as { message?: string }).message ?? "";
        if (code.includes("out_of_stock") || code.includes("stock")) {
          push("Out of stock", "bad");
        } else {
          push("Could not add item", "bad");
        }
      }
    },
    [push]
  );

  const updateQty = useCallback(async (productId: string, qty: number) => {
    try {
      const c = await apiUpdateQty(productId, qty);
      setCart(c);
    } catch {
      push("Could not update quantity", "bad");
    }
  }, [push]);

  const removeItem = useCallback(async (productId: string) => {
    try {
      const c = await apiRemoveItem(productId);
      setCart(c);
    } catch {
      push("Could not remove item", "bad");
    }
  }, [push]);

  const clearCart = useCallback(async () => {
    const snapshot = cart?.items ?? [];
    try {
      let finalCart: Cart | null = null;
      for (const item of snapshot) {
        finalCart = await apiRemoveItem(item.productId);
      }
      setCart(finalCart ?? { items: [], grandTotalCents: 0, currency: "" });
    } catch {
      // Best-effort: refresh to sync state
      await refresh();
    }
  }, [cart, refresh]);

  return (
    <CartContext.Provider
      value={{ cart, open, openDrawer, closeDrawer, refresh, addToCart, updateQty, removeItem, clearCart }}
    >
      {children}
      <CartDrawer
        open={open}
        cart={cart}
        onClose={closeDrawer}
        onUpdateQty={updateQty}
        onRemoveItem={removeItem}
      />
    </CartContext.Provider>
  );
}

/** Convenience re-export for consumers who only need the count. */
export function useCartCount(): number {
  const { cart } = useCart();
  return cart?.items.reduce((s, i) => s + i.qty, 0) ?? 0;
}
