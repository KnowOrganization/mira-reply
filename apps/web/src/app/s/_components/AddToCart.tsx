"use client";
// AddToCart — client island rendered by every template's Listing + Detail.
// Behaviour (unchanged):
//   • priceMinor == null  OR  config.checkoutEnabled == false
//     → link-out button to product.ctaUrl (renders null without a ctaUrl)
//   • otherwise → button calling cart.add()
// Appearance is template-owned: pass `style` / `className`. The old boolean
// style flags (brutal/luxe/neon/…) are gone.
// `fx` picks the add-to-cart micro-interaction (a token, not a callback —
// RSC templates can't pass functions across the client boundary).
// Preview mode: on /s/preview/* the button renders and plays its fx but
// never mutates the cart (there is no cart page for previews).
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { StorefrontConfig } from "@shaiz/shared";
import type { SfProduct } from "../_templates/_shared/types";
import { useCart } from "../_lib/cart";
import ScrambleText from "../_motion/ScrambleText";

export type FxToken =
  | "stamp"
  | "scramble"
  | "shimmer"
  | "neon-ring"
  | "burst"
  | "page-curl"
  | "secured"
  | "tag-arc"
  | "liquid"
  | "scatter";

type AddToCartProps = {
  product: SfProduct;
  config: StorefrontConfig;
  slug: string;
  variant?: "full" | "compact";
  className?: string;
  style?: React.CSSProperties;
  /** idle label — defaults to "Add to cart" / "Add" (or buyLabel on link-out) */
  label?: string;
  /** confirmation label — defaults to "Added ✓" */
  addedLabel?: string;
  fx?: FxToken;
};

const ADDED_MS = 1500;

export default function AddToCart({
  product,
  config,
  slug,
  variant = "full",
  className,
  style,
  label,
  addedLabel = "Added ✓",
  fx,
}: AddToCartProps) {
  const cart = useCart();
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const canCheckout = config.checkoutEnabled && product.priceMinor != null && product.available;
  const isPreview = slug === "preview" || slug.startsWith("preview/");

  const base: React.CSSProperties = {
    position: "relative",
    overflow: fx === "burst" || fx === "tag-arc" ? "visible" : "hidden",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    border: "none",
    fontFamily: "inherit",
    textDecoration: "none",
    background: "var(--sf-accent, #4f6bed)",
    color: "var(--sf-accent-fg, #fff)",
    fontSize: variant === "compact" ? 12 : 14.5,
    fontWeight: 600,
    padding: variant === "compact" ? "7px 14px" : "13px 22px",
    borderRadius: variant === "compact" ? 6 : 10,
    ...style,
  };

  // Link-out fallback — preserves old behaviour for non-checkout stores.
  if (!canCheckout) {
    if (!product.ctaUrl) return null;
    return (
      <a href={product.ctaUrl} target="_blank" rel="noopener noreferrer nofollow" className={className} style={base}>
        {label ?? config.buyLabel}
      </a>
    );
  }

  const idleLabel = label ?? (variant === "compact" ? "Add" : "Add to cart");

  function handleAdd() {
    if (playing) return;
    if (!isPreview) cart.add({ productId: product.id, qty: 1 });
    setPlaying(true);
    timer.current = setTimeout(() => setPlaying(false), ADDED_MS);
  }

  return (
    <motion.button
      type="button"
      onClick={handleAdd}
      className={className}
      style={base}
      whileTap={{ scale: 0.96 }}
      animate={
        playing && fx === "burst"
          ? { scaleY: [1, 0.8, 1.08, 1], scaleX: [1, 1.12, 0.96, 1] }
          : playing && fx === "secured"
            ? { scale: [1, 1.08, 1] }
            : { scale: 1 }
      }
      transition={{ duration: 0.45 }}
      aria-live="polite"
    >
      <FxLabel fx={fx} playing={playing} idle={idleLabel} added={addedLabel} />
      {playing && fx ? <FxOverlay fx={fx} /> : null}
    </motion.button>
  );
}

// ── label treatment per fx ────────────────────────────────────────────────────
function FxLabel({ fx, playing, idle, added }: { fx?: FxToken; playing: boolean; idle: string; added: string }) {
  if (!playing) {
    return fx === "scatter" ? <ScatterLabel text={idle} playing={false} /> : <span>{idle}</span>;
  }
  if (fx === "scramble") return <ScrambleText key="added" text={added} speed={22} />;
  if (fx === "scatter") return <ScatterLabel text={idle} playing />;
  if (fx === "secured") return <span>{idle}</span>; // the stamp overlay carries the confirmation
  return (
    <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {added}
    </motion.span>
  );
}

// deterministic per-index offsets — no Math.random, stable across renders
const SCATTER = [
  [-14, -18], [10, -24], [-8, 14], [16, 10], [-20, -6], [8, 20],
  [-12, -22], [18, -10], [-16, 16], [12, -16], [-6, 22], [20, 6],
];

function ScatterLabel({ text, playing }: { text: string; playing: boolean }) {
  return (
    <span aria-label={text} style={{ display: "inline-flex" }}>
      {text.split("").map((ch, i) => {
        const [dx, dy] = SCATTER[i % SCATTER.length];
        return (
          <motion.span
            key={i}
            aria-hidden
            style={{ display: "inline-block", whiteSpace: "pre" }}
            animate={
              playing
                ? { x: [0, dx, 0], y: [0, dy, 0], rotate: [0, dx > 0 ? 24 : -24, 0], opacity: [1, 0.7, 1] }
                : { x: 0, y: 0, rotate: 0, opacity: 1 }
            }
            transition={{ duration: 0.9, delay: playing ? i * 0.018 : 0, ease: [0.16, 1, 0.3, 1] }}
          >
            {ch}
          </motion.span>
        );
      })}
    </span>
  );
}

// ── overlay effects ───────────────────────────────────────────────────────────
const BURST_DOTS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  return [Math.cos(a) * 34, Math.sin(a) * 34] as const;
});

function FxOverlay({ fx }: { fx: FxToken }) {
  switch (fx) {
    case "stamp":
      return (
        <motion.span
          aria-hidden
          style={overlay({ background: "currentColor", borderRadius: "50%", left: "50%", top: "50%", width: 10, height: 10, marginLeft: -5, marginTop: -5 })}
          initial={{ scale: 0, opacity: 0.45 }}
          animate={{ scale: 30, opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      );
    case "shimmer":
      return (
        <motion.span
          aria-hidden
          style={overlay({ inset: 0, background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,.75) 50%, transparent 70%)" })}
          initial={{ x: "-120%" }}
          animate={{ x: "120%" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      );
    case "neon-ring":
      return (
        <motion.span
          aria-hidden
          style={overlay({ left: "50%", top: "50%", width: 44, height: 44, marginLeft: -22, marginTop: -22, borderRadius: "50%", border: "2px solid currentColor", boxShadow: "0 0 16px currentColor" })}
          initial={{ scale: 0.6, opacity: 0.9 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
        />
      );
    case "burst":
      return (
        <span aria-hidden style={{ position: "absolute", left: "50%", top: "50%" }}>
          {BURST_DOTS.map(([x, y], i) => (
            <motion.span
              key={i}
              style={{ position: "absolute", width: 6, height: 6, borderRadius: "50%", background: "currentColor" }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x, y, opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
            />
          ))}
        </span>
      );
    case "page-curl":
      return (
        <motion.span
          aria-hidden
          style={overlay({ right: 0, top: 0, bottom: 0, width: "38%", background: "linear-gradient(255deg, rgba(255,255,255,.5), transparent 60%)", transformOrigin: "right center" })}
          initial={{ rotateY: 0, opacity: 0 }}
          animate={{ rotateY: -70, opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      );
    case "secured":
      return (
        <motion.span
          aria-hidden
          style={overlay({
            left: "50%",
            top: "50%",
            translate: "-50% -50%",
            border: "2px solid currentColor",
            padding: "2px 10px",
            fontSize: "0.85em",
            fontWeight: 800,
            letterSpacing: "0.12em",
            whiteSpace: "nowrap",
            background: "inherit",
          })}
          initial={{ scale: 1.7, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: -8, opacity: 1 }}
          transition={{ duration: 0.28, ease: "backOut" }}
        >
          SECURED
        </motion.span>
      );
    case "tag-arc":
      return (
        <motion.span
          aria-hidden
          style={overlay({ left: "50%", top: 0, width: 18, height: 12, borderRadius: 3, background: "currentColor" })}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: 44, y: -46, rotate: 40, opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.3, 0.6, 0.4, 1] }}
        />
      );
    case "liquid":
      return (
        <motion.span
          aria-hidden
          style={overlay({ inset: 0, background: "rgba(255,255,255,.28)", transformOrigin: "bottom" })}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: [0, 1, 1, 0] }}
          transition={{ duration: 1.2, times: [0, 0.35, 0.75, 1], ease: "easeInOut" }}
        />
      );
    default:
      return null;
  }
}

function overlay(extra: React.CSSProperties): React.CSSProperties {
  return { position: "absolute", pointerEvents: "none", ...extra };
}
