// t10-typo — Typography-as-design. Products listed as giant text items at 7-10vw.
// Price right-aligned. No product images in listing view (just the giant name).
// Detail has image left + enormous title right. Inspired by fashion-week invitations.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import type { ListingProps, SfProduct } from "../_shared/types";

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();

function rootVars(config: ListingProps["config"]): React.CSSProperties {
  return {
    ["--sf-accent" as string]: config.accent,
    ["--sf-accent-fg" as string]: config.accentFg,
    ["--sf-accent-soft" as string]: `${config.accent}18`,
    background: "#fafafa",
    color: "#080808",
    fontFamily: "'helvetica neue', helvetica, arial, sans-serif",
    minHeight: "100vh",
  };
}

export default function Listing({ config, products, slug }: ListingProps) {
  return (
    <div style={rootVars(config)}>
      <style>{`
        .typo-row { transition: color .15s ease; }
        .typo-row:hover { color: var(--sf-accent) !important; }
        @media (max-width: 640px) { .typo-name { font-size: 14vw !important; } }
      `}</style>

      {/* header — full width accent bar */}
      <header style={{ background: "var(--sf-accent)", padding: "12px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20 }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--sf-accent-fg)" }}>{config.title}</span>
        <a href="#products" style={{ fontSize: 11, color: "var(--sf-accent-fg)", opacity: 0.75, textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase" }}>Shop</a>
      </header>

      {/* hero — giant headline, centered */}
      <section style={{ padding: "80px 28px 40px", borderBottom: "2px solid #080808" }}>
        <h1 style={{ fontSize: "clamp(48px, 9vw, 110px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.9, margin: 0, maxWidth: "20ch" }}>
          {config.heroHeadline}
        </h1>
        {config.heroTagline && (
          <p style={{ fontSize: 14, color: "#666", marginTop: 24, maxWidth: 440, lineHeight: 1.6 }}>{config.heroTagline}</p>
        )}
      </section>

      {/* index line */}
      <div style={{ padding: "8px 28px", borderBottom: "1px solid #e0e0e0", display: "flex", justifyContent: "space-between", fontSize: 10, color: "#aaa", letterSpacing: "0.14em", textTransform: "uppercase" }}>
        <span>Product</span>
        <span>Price</span>
      </div>

      {/* typography list */}
      <section id="products" style={{ scrollMarginTop: 60 }}>
        {products.length === 0 ? (
          <div style={{ padding: "80px 28px", fontSize: 14, color: "#bbb" }}>Nothing here yet.</div>
        ) : (
          products.map((p, i) => (
            <div key={p.id} style={{ borderBottom: "1px solid #e8e8e8" }}>
              <Link href={`/s/${slug}/p/${p.id}`} style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "baseline", gap: 16, padding: "20px 28px 12px", textDecoration: "none", color: "inherit" }} className="typo-row">
                <div>
                  <div style={{ fontSize: "clamp(28px, 7vw, 88px)", fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 0.95, textTransform: "uppercase" }} className="typo-name">
                    {p.title}
                  </div>
                  {p.subtitle && <div style={{ fontSize: 12, color: "#888", marginTop: 6, letterSpacing: "0.04em" }}>{p.subtitle}</div>}
                </div>
                {p.priceText && (
                  <div style={{ fontSize: "clamp(16px, 2.5vw, 28px)", fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: "var(--sf-accent)" }}>
                    {p.priceText}
                  </div>
                )}
              </Link>
              <div style={{ padding: "0 28px 16px" }}>
                <AddToCart product={p} config={config} slug={slug} variant="compact" />
              </div>
            </div>
          ))
        )}
      </section>

      {config.showAbout && (
        <section style={{ padding: "60px 28px", borderTop: "2px solid #080808", maxWidth: 560 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aaa", marginBottom: 16 }}>About</div>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "#444", margin: 0 }}>{config.about}</p>
        </section>
      )}

      <footer style={{ borderTop: "1px solid #e0e0e0", padding: "16px 28px", display: "flex", justifyContent: "space-between", fontSize: 10, color: "#bbb", letterSpacing: "0.12em", textTransform: "uppercase" }}>
        <span>{config.title}</span><span>Mira</span>
      </footer>
    </div>
  );
}
