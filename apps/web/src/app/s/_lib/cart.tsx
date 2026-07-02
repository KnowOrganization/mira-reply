"use client";
// Cart context — localStorage-persisted per store slug.
// Key: `mira:cart:<slug>`. SSR-safe: localStorage is only touched inside effects.
// Consumed by AddToCart (template islands), cart/, checkout/, and success/ pages.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CartItem = {
  productId: string;
  qty: number;
  variantId?: string;
};

export type CartContextValue = {
  items: CartItem[];
  add: (item: CartItem) => void;
  setQty: (productId: string, qty: number, variantId?: string) => void;
  remove: (productId: string, variantId?: string) => void;
  clear: () => void;
  count: number; // sum of all qtys
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function storageKey(slug: string): string {
  return `mira:cart:${slug}`;
}

/** Stable identity key for a cart line (product + optional variant). */
function lineKey(productId: string, variantId?: string): string {
  return variantId ? `${productId}::${variantId}` : productId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage once on mount (client only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(slug));
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed as CartItem[]);
      }
    } catch {
      // Ignore quota / parse errors silently.
    }
    setReady(true);
  }, [slug]);

  // Persist whenever items change, after initial hydration.
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(storageKey(slug), JSON.stringify(items));
    } catch {
      // Ignore storage quota errors silently.
    }
  }, [items, slug, ready]);

  const add = useCallback((item: CartItem) => {
    setItems((prev) => {
      const k = lineKey(item.productId, item.variantId);
      const hit = prev.find((i) => lineKey(i.productId, i.variantId) === k);
      if (hit) {
        return prev.map((i) =>
          lineKey(i.productId, i.variantId) === k
            ? { ...i, qty: i.qty + item.qty }
            : i
        );
      }
      return [...prev, { ...item }];
    });
  }, []);

  const setQty = useCallback(
    (productId: string, qty: number, variantId?: string) => {
      const k = lineKey(productId, variantId);
      if (qty <= 0) {
        setItems((prev) =>
          prev.filter((i) => lineKey(i.productId, i.variantId) !== k)
        );
      } else {
        setItems((prev) =>
          prev.map((i) =>
            lineKey(i.productId, i.variantId) === k ? { ...i, qty } : i
          )
        );
      }
    },
    []
  );

  const remove = useCallback((productId: string, variantId?: string) => {
    const k = lineKey(productId, variantId);
    setItems((prev) =>
      prev.filter((i) => lineKey(i.productId, i.variantId) !== k)
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, add, setQty, remove, clear, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
