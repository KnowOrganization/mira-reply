// t04-neon Detail — dark glass panel, glowing accent on price, sticky image.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import type { DetailProps, SfProduct } from "../_shared/types";

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();

export default function Detail({ config, product, more, slug }: DetailProps) {
  const neonGlow = `0 0 12px ${config.accent}88, 0 0 32px ${config.accent}44`;
  const glass: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, backdropFilter: "blur(6px)" };

  return (
    <div style={{
      ["--sf-accent" as string]: config.accent,
      ["--sf-accent-fg" as string]: config.accentFg,
      background: "#080b14", color: "#e8ecf4", minHeight: "100vh",
      fontFamily: "'helvetica neue', helvetica, arial, sans-serif",
    } as React.CSSProperties}>
      <style>{`@media (max-width: 820px) { .neon-det { grid-template-columns: 1fr !important; } }`}</style>

      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(8,11,20,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "14px 24px" }}>
          <Link href={`/s/${slug}`} style={{ fontSize: 12, color: "var(--sf-accent)", textDecoration: "none", fontWeight: 500 }}>← {config.title}</Link>
        </div>
      </header>

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px 64px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }} className="neon-det">
        <div style={{ position: "sticky", top: 80, ...glass, border: `1px solid ${config.accent}`, boxShadow: neonGlow, aspectRatio: "4 / 5", overflow: "hidden" }}>
          <StoreImage src={product.imageUrl} alt={product.title} monogram={monogram(product.title)} eager style={{ width: "100%", height: "100%" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {product.subtitle && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--sf-accent)", textShadow: `0 0 8px ${config.accent}` }}>{product.subtitle}</div>}
          <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.05, margin: 0, color: "#f0f4ff" }}>{product.title}</h1>
          {product.priceText && (
            <div style={{ fontSize: 26, fontWeight: 700, color: "var(--sf-accent)", textShadow: `0 0 10px ${config.accent}88`, fontVariantNumeric: "tabular-nums" }}>{product.priceText}</div>
          )}
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
          {product.description && <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "#8892a4", whiteSpace: "pre-line", margin: 0 }}>{product.description}</p>}
          <AddToCart product={product} config={config} slug={slug} />
        </div>
      </main>

      {more.length > 0 && (
        <section style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 60px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#3a4458", marginBottom: 16 }}>More</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(more.length, 4)}, 1fr)`, gap: 16 }}>
            {more.map((p: SfProduct) => (
              <Link key={p.id} href={`/s/${slug}/p/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ ...glass, overflow: "hidden" }}>
                  <div style={{ aspectRatio: "1 / 1" }}>
                    <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)} style={{ width: "100%", height: "100%" }} />
                  </div>
                  <div style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{p.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "18px 24px", textAlign: "center", fontSize: 11, color: "#3a4458" }}>Powered by Mira</footer>
    </div>
  );
}
