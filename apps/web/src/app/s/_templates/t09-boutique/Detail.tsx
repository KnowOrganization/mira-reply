// t09-boutique Detail — generous whitespace, full image, minimal chrome.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import type { DetailProps, SfProduct } from "../_shared/types";

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();
const sans: React.CSSProperties = { fontFamily: "'helvetica neue', helvetica, arial, sans-serif" };

export default function Detail({ config, product, more, slug }: DetailProps) {
  return (
    <div style={{
      ["--sf-accent" as string]: config.accent,
      ["--sf-accent-fg" as string]: config.accentFg,
      ["--sf-accent-soft" as string]: `${config.accent}14`,
      background: "#ffffff", color: "#111", minHeight: "100vh",
      fontFamily: "'helvetica neue', helvetica, arial, sans-serif",
    } as React.CSSProperties}>
      <style>{`@media (max-width: 820px) { .bout-det { grid-template-columns: 1fr !important; } }`}</style>

      <header style={{ padding: "28px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 8, height: 8, borderRadius: 999, background: "var(--sf-accent)" }} />
        <Link href={`/s/${slug}`} style={{ fontSize: 15, fontWeight: 400, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none", color: "#111" }}>{config.title}</Link>
        <Link href={`/s/${slug}`} style={{ ...sans, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", textDecoration: "none" }}>← Shop</Link>
      </header>

      <div style={{ height: 1, background: "#ebebeb", margin: "0 40px" }} />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 40px", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 72, alignItems: "start" }} className="bout-det">
        <div style={{ aspectRatio: "1 / 1", overflow: "hidden", background: "var(--sf-accent-soft)" }}>
          <StoreImage src={product.imageUrl} alt={product.title} monogram={monogram(product.title)} eager style={{ width: "100%", height: "100%" }} />
        </div>
        <div style={{ paddingTop: 24 }}>
          {product.subtitle && <div style={{ ...sans, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#aaa", marginBottom: 16 }}>{product.subtitle}</div>}
          <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 300, letterSpacing: "-0.015em", lineHeight: 1.1, margin: "0 0 20px" }}>{product.title}</h1>
          {product.priceText && <div style={{ ...sans, fontSize: 18, color: "#555", marginBottom: 24, fontVariantNumeric: "tabular-nums" }}>{product.priceText}</div>}
          <div style={{ height: 1, background: "#ebebeb", marginBottom: 24 }} />
          {product.description && <p style={{ fontSize: 14.5, lineHeight: 1.9, color: "#666", margin: "0 0 32px", whiteSpace: "pre-line" }}>{product.description}</p>}
          <AddToCart product={product} config={config} slug={slug} boutique />
        </div>
      </main>

      {more.length > 0 && (
        <>
          <div style={{ height: 1, background: "#ebebeb", margin: "0 40px" }} />
          <section style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px 72px" }}>
            <div style={{ ...sans, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#aaa", marginBottom: 32, textAlign: "center" }}>You may also like</div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(more.length, 4)}, 1fr)`, gap: "0 32px" }}>
              {more.map((p: SfProduct) => (
                <Link key={p.id} href={`/s/${slug}/p/${p.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
                  <div style={{ aspectRatio: "1 / 1", overflow: "hidden", background: "var(--sf-accent-soft)" }}>
                    <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)} style={{ width: "100%", height: "100%" }} />
                  </div>
                  <div style={{ paddingTop: 14, fontSize: 14, fontWeight: 400 }}>{p.title}</div>
                  {p.priceText && <div style={{ ...sans, fontSize: 12.5, color: "#888", marginTop: 4 }}>{p.priceText}</div>}
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      <footer style={{ borderTop: "1px solid #ebebeb", padding: "20px 40px", display: "flex", justifyContent: "space-between", ...sans, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#ccc" }}>
        <span>{config.title}</span><span>Mira</span>
      </footer>
    </div>
  );
}
