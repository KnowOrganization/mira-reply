// t03-luxe Detail — serene, centered, full-bleed image left.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import type { DetailProps, SfProduct } from "../_shared/types";

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();
const sans: React.CSSProperties = { fontFamily: "'helvetica neue', helvetica, arial, sans-serif" };
const divider: React.CSSProperties = { borderTop: "1px solid #d8d0c5" };

export default function Detail({ config, product, more, slug }: DetailProps) {
  return (
    <div style={{
      ["--sf-accent" as string]: config.accent,
      ["--sf-accent-fg" as string]: config.accentFg,
      ["--sf-accent-soft" as string]: `${config.accent}18`,
      background: "#f8f6f3", color: "#1a1714", minHeight: "100vh",
      fontFamily: "georgia, 'times new roman', serif",
    } as React.CSSProperties}>
      <style>{`@media (max-width: 820px) { .luxe-detail { grid-template-columns: 1fr !important; min-height: auto !important; } }`}</style>

      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(248,246,243,0.96)", backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "18px 24px", display: "flex", justifyContent: "center", position: "relative" }}>
          <Link href={`/s/${slug}`} style={{ ...sans, position: "absolute", left: 24, fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9a8f84", textDecoration: "none", top: "50%", transform: "translateY(-50%)" }}>← {config.title}</Link>
          <span style={{ fontSize: 20, fontWeight: 400, letterSpacing: "0.1em", textTransform: "uppercase" }}>{config.title}</span>
        </div>
        <div style={divider} />
      </header>

      <main style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "80vh" }} className="luxe-detail">
        <div style={{ background: "var(--sf-accent-soft)" }}>
          <StoreImage src={product.imageUrl} alt={product.title} monogram={monogram(product.title)} eager style={{ width: "100%", height: "100%", minHeight: 400 }} />
        </div>
        <div style={{ padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {product.subtitle && <div style={{ ...sans, fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9a8f84", marginBottom: 14 }}>{product.subtitle}</div>}
          <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 400, letterSpacing: "-0.01em", lineHeight: 1.1, margin: "0 0 16px" }}>{product.title}</h1>
          {product.priceText && <div style={{ ...sans, fontSize: 18, color: "#5a5248", marginBottom: 20, fontVariantNumeric: "tabular-nums" }}>{product.priceText}</div>}
          <div style={divider} />
          {product.description && <p style={{ fontSize: 14.5, lineHeight: 1.8, color: "#7a7068", marginTop: 20, whiteSpace: "pre-line" }}>{product.description}</p>}
          <div style={{ marginTop: 28 }}>
            <AddToCart product={product} config={config} slug={slug} />
          </div>
        </div>
      </main>

      {more.length > 0 && (
        <>
          <div style={divider} />
          <section style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px 64px" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ ...sans, fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9a8f84" }}>You may also like</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(more.length, 4)}, 1fr)`, gap: "32px 24px" }}>
              {more.map((p: SfProduct) => (
                <Link key={p.id} href={`/s/${slug}/p/${p.id}`} style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ aspectRatio: "3 / 4", width: "100%", overflow: "hidden", background: "var(--sf-accent-soft)" }}>
                    <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)} style={{ width: "100%", height: "100%" }} />
                  </div>
                  <div style={{ marginTop: 10, textAlign: "center", fontSize: 15 }}>{p.title}</div>
                  {p.priceText && <div style={{ ...sans, fontSize: 12.5, color: "#7a7068", marginTop: 4 }}>{p.priceText}</div>}
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      <div style={divider} />
      <footer style={{ textAlign: "center", padding: "20px", ...sans, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#b0a89f" }}>
        Powered by Mira
      </footer>
    </div>
  );
}
