// t06-magazine Detail — full-width image, editorial sidebar, serif copy.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import type { DetailProps, SfProduct } from "../_shared/types";

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();
const serif = "'georgia', 'times new roman', serif";
const sans = "'helvetica neue', helvetica, arial, sans-serif";

export default function Detail({ config, product, more, slug }: DetailProps) {
  return (
    <div style={{
      ["--sf-accent" as string]: config.accent,
      ["--sf-accent-fg" as string]: config.accentFg,
      ["--sf-accent-soft" as string]: `${config.accent}18`,
      background: "#fff", color: "#0e0e12", minHeight: "100vh", fontFamily: sans,
    } as React.CSSProperties}>
      <style>{`@media (max-width: 820px) { .mag-det { grid-template-columns: 1fr !important; } }`}</style>

      <header style={{ borderBottom: "3px solid #0e0e12" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 24px", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
          <Link href={`/s/${slug}`} style={{ fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#999", textDecoration: "none" }}>← Back</Link>
          <div style={{ fontFamily: serif, fontSize: "clamp(20px, 3vw, 30px)", fontWeight: 700, textAlign: "center" }}>{config.title}</div>
          <div />
        </div>
      </header>
      <div style={{ height: 3, background: "var(--sf-accent)" }} />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 64px", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 48, alignItems: "start" }} className="mag-det">
        <div style={{ aspectRatio: "4 / 5", overflow: "hidden", background: "var(--sf-accent-soft)" }}>
          <StoreImage src={product.imageUrl} alt={product.title} monogram={monogram(product.title)} eager style={{ width: "100%", height: "100%" }} />
        </div>
        <div style={{ paddingTop: 8 }}>
          {product.subtitle && <div style={{ fontFamily: sans, fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--sf-accent)", marginBottom: 12 }}>{product.subtitle}</div>}
          <h1 style={{ fontFamily: serif, fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, margin: "0 0 16px" }}>{product.title}</h1>
          <div style={{ height: 1, background: "#e0e0e0", marginBottom: 16 }} />
          {product.priceText && <div style={{ fontFamily: sans, fontSize: 22, fontWeight: 700, color: "var(--sf-accent)", marginBottom: 16 }}>{product.priceText}</div>}
          {product.description && <p style={{ fontFamily: serif, fontSize: 15, lineHeight: 1.8, color: "#444", fontStyle: "italic", whiteSpace: "pre-line", margin: "0 0 24px" }}>{product.description}</p>}
          <AddToCart product={product} config={config} slug={slug} />
        </div>
      </main>

      {more.length > 0 && (
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 60px", borderTop: "1px solid #e0e0e0" }}>
          <div style={{ fontFamily: sans, fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#999", margin: "24px 0 20px" }}>Also in this collection</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(more.length, 4)}, 1fr)`, gap: "20px 16px" }}>
            {more.map((p: SfProduct) => (
              <Link key={p.id} href={`/s/${slug}/p/${p.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
                <div style={{ aspectRatio: "4 / 3", overflow: "hidden", background: "#f5f5f5" }}>
                  <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)} style={{ width: "100%", height: "100%" }} />
                </div>
                <div style={{ fontFamily: serif, fontSize: 13.5, marginTop: 8 }}>{p.title}</div>
                {p.priceText && <div style={{ fontFamily: sans, fontSize: 12, color: "#888", marginTop: 3 }}>{p.priceText}</div>}
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer style={{ borderTop: "3px solid #0e0e12", padding: "12px 24px", fontFamily: sans, fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#999", display: "flex", justifyContent: "space-between" }}>
        <span>{config.title}</span><span>Powered by Mira</span>
      </footer>
    </div>
  );
}
