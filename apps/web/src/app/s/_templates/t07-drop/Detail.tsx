// t07-drop Detail — dark, full-bleed image left, moody copy right.
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
      background: "#0a0a0a", color: "#f5f5f5", minHeight: "100vh",
      fontFamily: "'helvetica neue', helvetica, arial, sans-serif",
    } as React.CSSProperties}>
      <style>{`@media (max-width: 820px) { .drop-det { grid-template-columns: 1fr !important; min-height: auto !important; } }`}</style>

      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 30, padding: "18px 28px", display: "flex", alignItems: "center", background: "rgba(10,10,10,0.9)", backdropFilter: "blur(10px)" }}>
        <Link href={`/s/${slug}`} style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#f5f5f5", textDecoration: "none" }}>← {config.title}</Link>
      </header>

      <main style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "100vh" }} className="drop-det">
        <div style={{ overflow: "hidden", position: "relative" }}>
          <StoreImage src={product.imageUrl} alt={product.title} monogram={monogram(product.title)} eager style={{ width: "100%", height: "100%", minHeight: 500 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 60%, rgba(10,10,10,0.6) 100%)" }} />
        </div>
        <div style={{ padding: "96px 40px 48px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {product.subtitle && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--sf-accent)", marginBottom: 16 }}>{product.subtitle}</div>}
          <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, letterSpacing: "-0.03em", textTransform: "uppercase", lineHeight: 0.95, margin: "0 0 20px" }}>{product.title}</h1>
          {product.priceText && <div style={{ fontSize: 28, fontWeight: 700, color: "var(--sf-accent)", marginBottom: 20 }}>{product.priceText}</div>}
          <div style={{ height: 1, background: "rgba(255,255,255,0.1)", marginBottom: 20 }} />
          {product.description && <p style={{ fontSize: 14, lineHeight: 1.7, color: "#888", whiteSpace: "pre-line", marginBottom: 28 }}>{product.description}</p>}
          <AddToCart product={product} config={config} slug={slug} />
        </div>
      </main>

      {more.length > 0 && (
        <section style={{ padding: "32px 28px 56px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#444", marginBottom: 16 }}>Also available</div>
          <div style={{ display: "flex", gap: 16, overflowX: "auto" }}>
            {more.map((p: SfProduct) => (
              <Link key={p.id} href={`/s/${slug}/p/${p.id}`} style={{ flex: "0 0 160px", textDecoration: "none", color: "inherit" }}>
                <div style={{ aspectRatio: "1 / 1", overflow: "hidden", background: "#1a1a1a" }}>
                  <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)} style={{ width: "100%", height: "100%" }} />
                </div>
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{p.title}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "14px 28px", fontSize: 10, color: "#333", textTransform: "uppercase", letterSpacing: "0.12em" }}>Mira</footer>
    </div>
  );
}
