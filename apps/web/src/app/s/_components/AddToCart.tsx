"use client";
// AddToCart — client island rendered by every template's Listing + Detail.
// Behaviour:
//   • priceMinor == null  OR  config.checkoutEnabled == false
//     → link-out button to product.ctaUrl (old non-breaking behaviour)
//   • otherwise → "Add to cart" button calling cart.add()

import type { StorefrontConfig } from "@shaiz/shared";
import type { SfProduct } from "../_templates/_shared/types";
import { useCart } from "../_lib/cart";

type AddToCartProps = {
  product: SfProduct;
  config: StorefrontConfig;
  slug: string;
  // optional style hints from templates so the button matches the design
  compact?: boolean;
  brutal?: boolean;
  luxe?: boolean;
  neon?: boolean;
  playful?: boolean;
  market?: boolean;
  boutique?: boolean;
  drop?: boolean;
};

export default function AddToCart({
  product,
  config,
  slug: _slug,
  compact,
  brutal,
  luxe,
  neon,
  playful,
  market,
  boutique,
  drop,
}: AddToCartProps) {
  const cart = useCart();

  const canCheckout = config.checkoutEnabled && product.priceMinor != null && product.available;

  // Link-out fallback — preserves old behaviour for non-checkout stores.
  if (!canCheckout) {
    if (!product.ctaUrl) return null;
    return (
      <a
        href={product.ctaUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        style={btnStyle({ compact, brutal, luxe, neon, playful, market, boutique, drop, accent: config.accent, accentFg: config.accentFg })}
      >
        {config.buyLabel}
      </a>
    );
  }

  function handleAdd() {
    cart.add({ productId: product.id, qty: 1 });
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      style={btnStyle({ compact, brutal, luxe, neon, playful, market, boutique, drop, accent: config.accent, accentFg: config.accentFg })}
    >
      {compact ? "Add" : "Add to cart"}
    </button>
  );
}

// ── per-template button style resolver ───────────────────────────────────────
type BtnStyleOpts = {
  compact?: boolean;
  brutal?: boolean;
  luxe?: boolean;
  neon?: boolean;
  playful?: boolean;
  market?: boolean;
  boutique?: boolean;
  drop?: boolean;
  accent: string;
  accentFg: string;
};

function btnStyle(o: BtnStyleOpts): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    border: "none",
    fontFamily: "inherit",
    textDecoration: "none",
    transition: "opacity .15s ease",
  };

  if (o.brutal) {
    return {
      ...base,
      background: o.accent,
      color: o.accentFg,
      fontWeight: 900,
      fontSize: o.compact ? 11 : 13,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      padding: o.compact ? "7px 12px" : "12px 20px",
      borderRadius: 0,
      width: o.compact ? undefined : "100%",
    };
  }

  if (o.luxe) {
    return {
      ...base,
      background: "transparent",
      color: "#1a1714",
      border: "1px solid #1a1714",
      fontFamily: "'helvetica neue', helvetica, arial, sans-serif",
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      padding: o.compact ? "7px 14px" : "12px 24px",
      borderRadius: 0,
      width: o.compact ? undefined : "100%",
    };
  }

  if (o.neon) {
    return {
      ...base,
      background: o.accent,
      color: o.accentFg,
      fontSize: o.compact ? 11 : 13.5,
      fontWeight: 700,
      padding: o.compact ? "6px 12px" : "12px 22px",
      borderRadius: 8,
      boxShadow: `0 0 10px ${o.accent}88`,
      width: o.compact ? undefined : "100%",
    };
  }

  if (o.playful) {
    return {
      ...base,
      background: o.accent,
      color: o.accentFg,
      fontSize: o.compact ? 12 : 14,
      fontWeight: 800,
      padding: o.compact ? "7px 16px" : "13px 26px",
      borderRadius: 999,
      width: o.compact ? undefined : "100%",
    };
  }

  if (o.market) {
    return {
      ...base,
      background: o.accent,
      color: o.accentFg,
      fontSize: o.compact ? 12 : 14,
      fontWeight: 700,
      padding: o.compact ? "6px 12px" : "11px 20px",
      borderRadius: 4,
      width: o.compact ? undefined : "100%",
    };
  }

  if (o.boutique) {
    return {
      ...base,
      background: "transparent",
      color: "#111",
      border: "1px solid #111",
      fontFamily: "'helvetica neue', helvetica, arial, sans-serif",
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      padding: o.compact ? "7px 14px" : "13px 28px",
      borderRadius: 0,
      width: o.compact ? undefined : "100%",
    };
  }

  if (o.drop) {
    return {
      ...base,
      background: "#fff",
      color: "#0a0a0a",
      fontSize: o.compact ? 12 : 14,
      fontWeight: 800,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      padding: o.compact ? "8px 18px" : "13px 28px",
      borderRadius: 2,
    };
  }

  // default / editorial
  return {
    ...base,
    background: o.accent,
    color: o.accentFg,
    fontSize: o.compact ? 12 : 14.5,
    fontWeight: 600,
    padding: o.compact ? "7px 14px" : "13px 22px",
    borderRadius: o.compact ? 6 : 12,
    width: o.compact ? undefined : "100%",
  };
}
