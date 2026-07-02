// t04-neon — Dark synthwave storefront. Deep navy bg, glowing accent borders,
// neon product cards, scanline texture overlay, high-contrast text.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import type { ListingProps, SfProduct } from "../_shared/types";

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();

function rootVars(config: ListingProps["config"]): React.CSSProperties {
  return {
    ["--sf-accent" as string]: config.accent,
    ["--sf-accent-fg" as string]: config.accentFg,
    ["--sf-accent-soft" as string]: `${config.accent}22`,
    ["--neon-glow" as string]: `0 0 12px ${config.accent}88, 0 0 32px ${config.accent}44`,
    background: "#080b14",
    color: "#e8ecf4",
    fontFamily: "'helvetica neue', helvetica, arial, sans-serif",
    minHeight: "100vh",
  };
}

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  backdropFilter: "blur(6px)",
};

function NeonCard({ p, href, config, slug }: { p: SfProduct; href: string; config: ListingProps["config"]; slug: string }) {
  return (
    <div style={{ ...glassCard, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <Link href={href} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
        <div style={{ aspectRatio: "1 / 1", overflow: "hidden", position: "relative" }}>
          <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)}
            className="neon-img" style={{ width: "100%", height: "100%", transition: "transform .4s ease" }} />
          <div style={{ position: "absolute", inset: 0, border: "1px solid transparent", borderRadius: 0, pointerEvents: "none" }} className="neon-border" />
        </div>
      </Link>
      <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em", color: "#e8ecf4" }}>{p.title}</div>
        {p.priceText && (
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--sf-accent)", fontVariantNumeric: "tabular-nums" }}>{p.priceText}</div>
        )}
        <div style={{ marginTop: 4 }}>
          <AddToCart product={p} config={config} slug={slug} variant="compact" />
        </div>
      </div>
    </div>
  );
}

export default function Listing({ config, products, slug }: ListingProps) {
  const featured = config.showFeatured
    ? config.featuredIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) as SfProduct[]
    : [];

  return (
    <div style={rootVars(config)}>
      <style>{`
        .neon-img:hover { transform: scale(1.05); }
        .neon-card:hover { box-shadow: var(--neon-glow); border-color: var(--sf-accent) !important; }
        @media (max-width: 640px) { .neon-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>

      {/* scanline overlay */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)", opacity: 0.5 }} />

      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(8,11,20,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--sf-accent)", boxShadow: "0 0 8px var(--sf-accent)", display: "inline-block" }} />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: "#e8ecf4" }}>{config.title}</span>
          <a href="#products" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 500, color: "var(--sf-accent)", textDecoration: "none", letterSpacing: "0.04em" }}>Shop ↓</a>
        </div>
      </header>

      {/* hero */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "64px 24px 48px", position: "relative", zIndex: 2 }}>
        <div style={{ display: "grid", gridTemplateColumns: config.heroImageUrl ? "1fr 1fr" : "1fr", gap: 48, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--sf-accent)", marginBottom: 14, textShadow: "0 0 8px var(--sf-accent)" }}>
              Live now
            </div>
            <h1 style={{ fontSize: "clamp(36px, 7vw, 72px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 0.95, margin: 0, color: "#f0f4ff" }}>
              {config.heroHeadline}
            </h1>
            {config.heroTagline && (
              <p style={{ fontSize: 15, lineHeight: 1.6, color: "#8892a4", marginTop: 18, maxWidth: 420 }}>{config.heroTagline}</p>
            )}
            <a href="#products" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 28, padding: "11px 22px", borderRadius: 8, background: "var(--sf-accent)", color: "var(--sf-accent-fg)", fontSize: 13.5, fontWeight: 700, textDecoration: "none", boxShadow: "var(--neon-glow)" }}>
              Shop now →
            </a>
          </div>
          {config.heroImageUrl && (
            <div style={{ ...glassCard, aspectRatio: "4 / 5", overflow: "hidden", border: "1px solid var(--sf-accent)", boxShadow: "var(--neon-glow)" }}>
              <StoreImage src={config.heroImageUrl} alt={config.heroHeadline} monogram={monogram(config.title)} eager style={{ width: "100%", height: "100%" }} />
            </div>
          )}
        </div>
      </section>

      {/* featured */}
      {featured.length > 0 && (
        <section style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 40px", position: "relative", zIndex: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--sf-accent)", marginBottom: 16 }}>Featured</div>
          <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(200px, 1fr)", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
            {featured.map((p) => <NeonCard key={p.id} p={p} href={`/s/${slug}/p/${p.id}`} config={config} slug={slug} />)}
          </div>
        </section>
      )}

      {/* grid */}
      <section id="products" style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 72px", position: "relative", zIndex: 2, scrollMarginTop: 60 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#5a647a" }}>All products</div>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          <div style={{ fontSize: 11, color: "#4a5468" }}>{products.length} items</div>
        </div>
        {products.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#4a5468", fontSize: 13 }}>Nothing here yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="neon-grid">
            {products.map((p) => <NeonCard key={p.id} p={p} href={`/s/${slug}/p/${p.id}`} config={config} slug={slug} />)}
          </div>
        )}
      </section>

      {config.showAbout && (
        <section style={{ maxWidth: 600, margin: "0 auto", padding: "0 24px 64px", position: "relative", zIndex: 2, textAlign: "center" }}>
          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 32 }} />
          <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "#8892a4", whiteSpace: "pre-line" }}>{config.about}</p>
        </section>
      )}

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "20px 24px", textAlign: "center", fontSize: 11, color: "#3a4458", position: "relative", zIndex: 2 }}>
        Powered by Mira
      </footer>
    </div>
  );
}
