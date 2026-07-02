// t02-brutalist Detail — thick borders, uppercase, brutal grid layout.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import type { DetailProps, SfProduct } from "../_shared/types";

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();

function rootVars(config: DetailProps["config"]): React.CSSProperties {
  return {
    ["--sf-accent" as string]: config.accent,
    ["--sf-accent-fg" as string]: config.accentFg,
    ["--sf-accent-soft" as string]: `${config.accent}22`,
    background: "#ffffff",
    color: "#111",
    fontFamily: "'helvetica neue', helvetica, arial, sans-serif",
    minHeight: "100vh",
  };
}

export default function Detail({ config, product, more, slug }: DetailProps) {
  return (
    <div style={rootVars(config)}>
      <style>{`@media (max-width: 820px) { .sf-brutal-detail { grid-template-columns: 1fr !important; } }`}</style>

      <header style={{ background: "var(--sf-accent)", borderBottom: "3px solid #111", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "stretch" }}>
          <Link href={`/s/${slug}`} style={{ display: "flex", alignItems: "center", padding: "14px 20px 14px 0", borderRight: "3px solid #111", fontWeight: 900, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--sf-accent-fg)", textDecoration: "none" }}>
            ← {config.title}
          </Link>
          <div style={{ padding: "14px 0 14px 20px", fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--sf-accent-fg)" }}>
            {product.title}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "3px solid #111" }} className="sf-brutal-detail">
        {/* image */}
        <div style={{ borderRight: "3px solid #111", aspectRatio: "1 / 1", overflow: "hidden" }}>
          <StoreImage src={product.imageUrl} alt={product.title} monogram={monogram(product.title)} eager style={{ width: "100%", height: "100%" }} />
        </div>
        {/* info */}
        <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {product.subtitle && <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--sf-accent)" }}>{product.subtitle}</div>}
          <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 0.95, margin: 0 }}>{product.title}</h1>
          {product.priceText && (
            <div style={{ fontSize: 28, fontWeight: 900, borderTop: "3px solid #111", borderBottom: "3px solid #111", padding: "12px 0", fontVariantNumeric: "tabular-nums" }}>
              {product.priceText}
            </div>
          )}
          {product.description && <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{product.description}</p>}
          <AddToCart product={product} config={config} slug={slug} brutal />
        </div>
      </main>

      {more.length > 0 && (
        <section style={{ padding: "24px 20px 48px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", borderBottom: "3px solid #111", paddingBottom: 8, marginBottom: 16 }}>More items</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(more.length, 4)}, 1fr)`, border: "3px solid #111" }}>
            {more.map((p, i) => (
              <Link key={p.id} href={`/s/${slug}/p/${p.id}`} style={{ display: "block", textDecoration: "none", color: "inherit", borderRight: i < more.length - 1 ? "3px solid #111" : undefined }}>
                <div style={{ aspectRatio: "1 / 1", overflow: "hidden", borderBottom: "3px solid #111" }}>
                  <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)} style={{ width: "100%", height: "100%" }} />
                </div>
                <div style={{ padding: "8px 10px", fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{p.title}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer style={{ borderTop: "3px solid #111", background: "#111", color: "#fff", padding: "14px 20px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Powered by Mira
      </footer>
    </div>
  );
}
