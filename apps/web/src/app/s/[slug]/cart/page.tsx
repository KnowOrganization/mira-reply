"use client";
// Cart page — /s/<slug>/cart. Shows line items with qty steppers and a subtotal,
// then links to /checkout. Product details are fetched client-side so we can
// join cart item ids against the real store catalogue.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useCart } from "../../_lib/cart";
import type { SfProduct } from "../../_templates/_shared/types";
import type { StorefrontConfig } from "@shaiz/shared";

type StoreData = {
  config: StorefrontConfig;
  products: SfProduct[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatPrice(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

const stepperBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 6,
  border: "1px solid var(--sf-border, #e0e0e0)",
  background: "transparent",
  cursor: "pointer",
  fontSize: 17,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
  fontFamily: "inherit",
  color: "inherit",
};

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function CartPage() {
  const { slug } = useParams() as { slug: string };
  const cart = useCart();

  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/store/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d: StoreData) => setStoreData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const productMap = new Map<string, SfProduct>(
    (storeData?.products ?? []).map((p) => [p.id, p])
  );

  const lineItems = cart.items.map((item) => ({
    item,
    product: productMap.get(item.productId),
  }));

  const currency = storeData?.config.currency ?? "INR";
  const accent = storeData?.config.accent ?? "#4f6bed";
  const accentFg = storeData?.config.accentFg ?? "#ffffff";

  const subtotal = lineItems.reduce((sum, { item, product }) => {
    return sum + (product?.priceMinor ?? 0) * item.qty;
  }, 0);

  // ── Loading shell ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{ padding: "3rem", textAlign: "center", color: "var(--sf-muted, #888)", fontSize: 14 }}
      >
        Loading cart…
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (cart.count === 0) {
    return (
      <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
        <p style={{ fontSize: 18, color: "var(--sf-muted, #888)", marginBottom: 28 }}>
          Your cart is empty.
        </p>
        <Link
          href={`/s/${slug}`}
          style={{
            display: "inline-block",
            padding: "11px 26px",
            background: accent,
            color: accentFg,
            borderRadius: 10,
            fontWeight: 600,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          Back to shop
        </Link>
      </div>
    );
  }

  // ── Cart ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <Link
          href={`/s/${slug}`}
          style={{ color: "var(--sf-muted, #888)", textDecoration: "none", fontSize: 13 }}
        >
          ← Shop
        </Link>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
          Cart
        </h1>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            background: "var(--sf-accent-soft, #eceffd)",
            color: "var(--sf-accent, #4f6bed)",
            borderRadius: 99,
            padding: "3px 10px",
            fontWeight: 700,
          }}
        >
          {cart.count} {cart.count === 1 ? "item" : "items"}
        </span>
      </div>

      {/* Line items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {lineItems.map(({ item, product }) => {
          const title = product?.title ?? item.productId;
          const imageUrl = product?.imageUrl;
          const priceMinor = product?.priceMinor;

          return (
            <div
              key={`${item.productId}:${item.variantId ?? ""}`}
              style={{
                display: "flex",
                gap: 14,
                padding: "16px 0",
                borderBottom: "1px solid var(--sf-border, #eee)",
                alignItems: "center",
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 8,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "var(--sf-accent-soft, #eceffd)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--sf-accent, #4f6bed)",
                  fontWeight: 700,
                  fontSize: 22,
                }}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  title.charAt(0).toUpperCase()
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    fontSize: 14,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {title}
                </p>
                {priceMinor != null && (
                  <p style={{ margin: "3px 0 0", color: "var(--sf-muted, #888)", fontSize: 12 }}>
                    {formatPrice(priceMinor, currency)} each
                  </p>
                )}
              </div>

              {/* Qty stepper */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() =>
                    cart.setQty(item.productId, item.qty - 1, item.variantId)
                  }
                  style={stepperBtn}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span style={{ width: 20, textAlign: "center", fontWeight: 700, fontSize: 14 }}>
                  {item.qty}
                </span>
                <button
                  onClick={() =>
                    cart.setQty(item.productId, item.qty + 1, item.variantId)
                  }
                  style={stepperBtn}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              {/* Line total */}
              {priceMinor != null && (
                <p
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: 14,
                    minWidth: 68,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {formatPrice(priceMinor * item.qty, currency)}
                </p>
              )}

              {/* Remove */}
              <button
                onClick={() => cart.remove(item.productId, item.variantId)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--sf-muted, #bbb)",
                  fontSize: 20,
                  padding: "0 2px",
                  lineHeight: 1,
                  flexShrink: 0,
                  fontFamily: "inherit",
                }}
                aria-label={`Remove ${title}`}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Subtotal + CTA */}
      <div
        style={{
          marginTop: 24,
          padding: "20px 0 0",
          borderTop: "2px solid var(--sf-border, #e8e8e8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--sf-muted, #888)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Subtotal
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em" }}>
            {formatPrice(subtotal, currency)}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--sf-muted, #aaa)" }}>
            Final amount calculated at checkout
          </p>
        </div>
        <Link
          href={`/s/${slug}/checkout`}
          style={{
            display: "inline-block",
            padding: "13px 28px",
            background: accent,
            color: accentFg,
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 15,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          Checkout →
        </Link>
      </div>
    </div>
  );
}
