// t05-playful Detail — bubbly card, tinted bg, big rounded CTA.
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
      ["--sf-accent-soft" as string]: `${config.accent}22`,
      background: "#fefcf8", color: "#1a1a24", minHeight: "100vh",
      fontFamily: "'helvetica neue', helvetica, arial, sans-serif",
    } as React.CSSProperties}>
      <style>{`@media (max-width: 820px) { .play-detail { grid-template-columns: 1fr !important; } }`}</style>

      <header style={{ padding: "16px 20px", position: "sticky", top: 0, zIndex: 20, background: "rgba(254,252,248,0.95)", backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", background: "var(--sf-accent)", borderRadius: 999, padding: "10px 20px", display: "flex", alignItems: "center" }}>
          <Link href={`/s/${slug}`} style={{ fontSize: 13, fontWeight: 700, color: "var(--sf-accent-fg)", textDecoration: "none" }}>← {config.title}</Link>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px 64px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "start" }} className="play-detail">
        <div style={{ borderRadius: 28, overflow: "hidden", background: "var(--sf-accent-soft)", aspectRatio: "4 / 5" }}>
          <StoreImage src={product.imageUrl} alt={product.title} monogram={monogram(product.title)} eager style={{ width: "100%", height: "100%" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {product.subtitle && (
            <div style={{ display: "inline-block", background: "var(--sf-accent)", color: "var(--sf-accent-fg)", borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 800, alignSelf: "flex-start" }}>{product.subtitle}</div>
          )}
          <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, letterSpacing: "-0.025em", lineHeight: 1.05, margin: 0 }}>{product.title}</h1>
          {product.priceText && <div style={{ fontSize: 26, fontWeight: 900, color: "var(--sf-accent)" }}>{product.priceText}</div>}
          <div style={{ height: 2, background: "var(--sf-accent-soft)", borderRadius: 999 }} />
          {product.description && <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "#666", margin: 0 }}>{product.description}</p>}
          <AddToCart product={product} config={config} slug={slug} />
        </div>
      </main>

      {more.length > 0 && (
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 64px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--sf-accent)", marginBottom: 16 }}>◉ More picks</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(more.length, 4)}, 1fr)`, gap: 16 }}>
            {more.map((p: SfProduct, i) => (
              <Link key={p.id} href={`/s/${slug}/p/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ borderRadius: 20, overflow: "hidden", background: ["#fff0f5", "#f0f5ff", "#f0fff4", "#fffaf0"][i % 4] }}>
                  <div style={{ aspectRatio: "1 / 1" }}>
                    <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)} style={{ width: "100%", height: "100%" }} />
                  </div>
                  <div style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700 }}>{p.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer style={{ textAlign: "center", padding: "20px", fontSize: 12, color: "#ccc" }}>Made with ✦ Mira</footer>
    </div>
  );
}
