// t01-editorial Detail — faithful refactor of ProductDetail from Storefront.tsx.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import type { DetailProps, SfProduct } from "../_shared/types";

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();
const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "link"; } };

function rootVars(config: DetailProps["config"]): React.CSSProperties {
  return {
    ["--sf-accent" as string]: config.accent,
    ["--sf-accent-fg" as string]: config.accentFg,
    ["--sf-accent-soft" as string]: `${config.accent}1f`,
    background: "var(--bg-frame)",
    color: "var(--text)",
    minHeight: "100vh",
  };
}

function ProductCard({ p, href }: { p: SfProduct; href: string }) {
  return (
    <Link href={href} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
      <div style={{ aspectRatio: "4 / 5", overflow: "hidden", background: "var(--bg-inset)", borderRadius: 12 }}>
        <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)} style={{ width: "100%", height: "100%" }} />
      </div>
      <div style={{ padding: "10px 0 0", fontSize: 14, fontWeight: 600 }}>{p.title}</div>
      {p.priceText && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{p.priceText}</div>}
    </Link>
  );
}

export default function Detail({ config, product, more, slug }: DetailProps) {
  const rootStyle = rootVars(config);
  return (
    <div style={rootStyle}>
      <style>{`@media (max-width: 820px) { .sf-detail-t01 { grid-template-columns: 1fr !important; } }`}</style>

      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "color-mix(in srgb, var(--bg) 86%, transparent)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "14px 20px" }}>
          <Link href={`/s/${slug}`} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>← {config.title}</Link>
        </div>
      </header>

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 20px 64px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }} className="sf-detail-t01">
        <div style={{ position: "sticky", top: 80, alignSelf: "start", aspectRatio: "4 / 5", borderRadius: 18, overflow: "hidden", background: "var(--bg-inset)" }}>
          <StoreImage src={product.imageUrl} alt={product.title} monogram={monogram(product.title)} eager style={{ width: "100%", height: "100%" }} />
        </div>
        <div>
          {product.subtitle && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--sf-accent)" }}>{product.subtitle}</div>}
          <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.1, margin: "6px 0 0" }}>{product.title}</h1>
          {product.priceText && <div style={{ fontSize: 22, fontWeight: 600, marginTop: 12, fontVariantNumeric: "tabular-nums" }}>{product.priceText}</div>}
          {product.description && <p style={{ fontSize: 15, lineHeight: 1.65, color: "var(--text-muted)", whiteSpace: "pre-line", margin: "20px 0 0", maxWidth: "60ch" }}>{product.description}</p>}
          <div style={{ marginTop: 28 }}>
            <AddToCart product={product} config={config} slug={slug} />
          </div>
          {product.ctaUrl && (config.checkoutEnabled && product.priceMinor != null) && (
            <div style={{ marginTop: 10, textAlign: "center", fontSize: 11.5, color: "var(--text-subtle)" }}>Opens {hostOf(product.ctaUrl)}</div>
          )}
        </div>
      </main>

      {more.length > 0 && (
        <section style={{ maxWidth: 1120, margin: "0 auto", padding: "0 20px 64px" }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--sf-accent)" }}>More from</div>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "2px 0 0" }}>{config.title}</h2>
          </div>
          <div style={{ display: "grid", gap: 22, gridTemplateColumns: `repeat(${Math.min(4, more.length)}, minmax(0, 1fr))` }}>
            {more.map((p) => <ProductCard key={p.id} p={p} href={`/s/${slug}/p/${p.id}`} />)}
          </div>
        </section>
      )}

      <footer style={{ borderTop: "1px solid var(--border)", padding: "28px 20px", textAlign: "center", fontSize: 11.5, color: "var(--text-subtle)" }}>Powered by Mira</footer>
    </div>
  );
}
