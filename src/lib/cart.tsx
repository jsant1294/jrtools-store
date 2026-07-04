"use client";
// ============================================================
// Cart — React context + localStorage persistence.
// Rules baked in from the schema:
//  - pickup_only items lock the whole order to pickup fulfillment
//  - quantity capped at available stock
//  - price stored as snapshot cents (server re-validates at checkout)
// ============================================================
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  qty: number;
  maxQty: number;
  pickupOnly: boolean;
};

type CartCtx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  subtotalCents: number;
  count: number;
  pickupLocked: boolean; // true if any item is pickup_only
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "jrtools_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const add: CartCtx["add"] = (item, qty = 1) =>
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId
            ? { ...i, qty: Math.min(i.qty + qty, i.maxQty) }
            : i,
        );
      }
      return [...prev, { ...item, qty: Math.min(qty, item.maxQty) }];
    });

  const setQty: CartCtx["setQty"] = (productId, qty) =>
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) =>
            i.productId === productId ? { ...i, qty: Math.min(qty, i.maxQty) } : i,
          ),
    );

  const remove = (productId: string) =>
    setItems((prev) => prev.filter((i) => i.productId !== productId));

  const value = useMemo<CartCtx>(() => ({
    items, add, setQty, remove,
    clear: () => setItems([]),
    subtotalCents: items.reduce((s, i) => s + i.priceCents * i.qty, 0),
    count: items.reduce((s, i) => s + i.qty, 0),
    pickupLocked: items.some((i) => i.pickupOnly),
  }), [items]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart outside CartProvider");
  return ctx;
}

export const fmt = (cents: number, locale = "en") =>
  new Intl.NumberFormat(locale === "es" ? "es-US" : "en-US", {
    style: "currency", currency: "USD",
  }).format(cents / 100);
