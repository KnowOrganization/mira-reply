// t10-typo Detail — enormous product title left, image right. Type is the hero.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import type { DetailProps, SfProduct } from "../_shared/types";

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();

export default function Detail({ config, product, more, slug }: DetailProps) {
  return (
    <div style={{
      ["--sf-accent" as string]: config.accent,
      ["--sf-accent-fg" as string]: config.accentFg,
      background: "#fafafa", color: "#080808", minHeight: "100vh",
      fontFamily: "'helvetica neue', helvetica, arial, sans-serif",
    } as React.CSSProperties}>
      <style>{`@media (max-width: 820px) { .typo-det { grid-template-columns: 1fr !important; } .typo-det .typo-img { min-height: 300px; } }`}</style>

      <header style={{ background: "var(--sf-accent)", padding: "12px 28px", display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 20 }}>
        <Link href={`/s/${slug}`} style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--sf-accent-fg)", textDecoration: "none" }}>← {config.title}</Link>
      </header>

      <main style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", minHeight: "80vh", borderBottom: "2px solid #080808" }} className="typo-det">
        <div style={{ padding: "56px 28px", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: "1px solid #e0e0e0" }}>
          <div>
            {product.subtitle && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--sf-accent)", marginBottom: 20 }}>{product.subtitle}</div>}
            <h1 style={{ fontSize: "clamp(36px, 7vw, 96px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.9, textTransform: "uppercase", margin: "0 0 28px" }}>{product.title}</h1>
            {product.priceText && (
              <div style={{ fontSize: "clamp(22px, 3vw, 38px)", fontWeight: 700, color: "var(--sf-accent)", fontVariantNumeric: "tabular-nums", marginBottom: 28 }}>{product.priceText}</div>
            )}
            <div style={{ height: 1, background: "#e0e0e0", marginBottom: 24 }} />
            {product.description && <p style={{ fontSize: 14, lineHeight: 1.7, color: "#555", whiteSpace: "pre-line", marginBottom: 32 }}>{product.description}</p>}
          </div>
          <AddToCart product={product} config={config} slug={slug} />
        </div>
        <div style={{ background: "#f0f0f0", overflow: "hidden", minHeight: 400 }} className="typo-img">
          <StoreImage src={product.imageUrl} alt={product.title} monogram={monogram(product.title)} eager style={{ width: "100%", height: "100%", minHeight: 400 }} />
        </div>
      </main>

      {more.length > 0 && (
        <section style={{ padding: "32px 28px 60px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#aaa", marginBottom: 24 }}>More</div>
          {more.map((p: SfProduct, i) => (
            <div key={p.id} style={{ borderBottom: "1px solid #e8e8e8" }}>
              <Link href={`/s/${slug}/p/${p.id}`} style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "baseline", padding: "14px 0", textDecoration: "none", color: "inherit", gap: 16 }}>
                <div style={{ fontSize: "clamp(18px, 3.5vw, 40px)", fontWeight: 900, letterSpacing: "-0.03em", textTransform: "uppercase" }}>{p.title}</div>
                {p.priceText && <div style={{ fontSize: 16, fontWeight: 700, color: "var(--sf-accent)", whiteSpace: "nowrap" }}>{p.priceText}</div>}
              </Link>
            </div>
          ))}
        </section>
      )}

      <footer style={{ borderTop: "1px solid #e0e0e0", padding: "14px 28px", fontSize: 10, color: "#bbb", letterSpacing: "0.12em", textTransform: "uppercase", display: "flex", justifyContent: "space-between" }}>
        <span>{config.title}</span><span>Mira</span>
      </footer>
    </div>
  );
}
