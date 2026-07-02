// t05-playful — Bubbly, joyful, rounded corners everywhere.
// Accent colour patches, candy tints, fun rotated labels, big CTA energy.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import type { ListingProps, SfProduct } from "../_shared/types";

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();
const TINTS = ["#fff0f5", "#f0f5ff", "#f0fff4", "#fffaf0", "#f5f0ff"];

function rootVars(config: ListingProps["config"]): React.CSSProperties {
  return {
    ["--sf-accent" as string]: config.accent,
    ["--sf-accent-fg" as string]: config.accentFg,
    ["--sf-accent-soft" as string]: `${config.accent}22`,
    background: "#fefcf8",
    color: "#1a1a24",
    fontFamily: "'helvetica neue', helvetica, arial, sans-serif",
    minHeight: "100vh",
  };
}

function PlayCard({ p, href, i, config, slug }: { p: SfProduct; href: string; i: number; config: ListingProps["config"]; slug: string }) {
  const tint = TINTS[i % TINTS.length];
  return (
    <div style={{ borderRadius: 24, overflow: "hidden", background: tint, display: "flex", flexDirection: "column", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <Link href={href} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
        <div style={{ aspectRatio: "4 / 5", overflow: "hidden" }}>
          <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)}
            className="play-img" style={{ width: "100%", height: "100%", transition: "transform .4s ease" }} />
        </div>
      </Link>
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{p.title}</div>
        {p.subtitle && <div style={{ fontSize: 12, color: "#888" }}>{p.subtitle}</div>}
        {p.priceText && <div style={{ fontSize: 14, fontWeight: 800, color: "var(--sf-accent)" }}>{p.priceText}</div>}
        <div style={{ marginTop: 6 }}>
          <AddToCart product={p} config={config} slug={slug} compact playful />
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
        .play-img:hover { transform: scale(1.06); }
        @media (max-width: 640px) { .play-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>

      {/* nav — rounded pill bar */}
      <header style={{ padding: "16px 20px", position: "sticky", top: 0, zIndex: 20, background: "rgba(254,252,248,0.95)", backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", background: "var(--sf-accent)", borderRadius: 999, padding: "10px 20px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: "var(--sf-accent-fg)", flex: 1 }}>{config.title} ✦</span>
          <a href="#products" style={{ fontSize: 13, fontWeight: 700, color: "var(--sf-accent-fg)", textDecoration: "none", background: "rgba(255,255,255,0.2)", borderRadius: 999, padding: "5px 14px" }}>Shop</a>
        </div>
      </header>

      {/* hero */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 20px 32px" }}>
        <div style={{ borderRadius: 32, background: "var(--sf-accent-soft)", padding: "48px 40px", display: "grid", gridTemplateColumns: config.heroImageUrl ? "1fr 1fr" : "1fr", gap: 32, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-block", background: "var(--sf-accent)", color: "var(--sf-accent-fg)", borderRadius: 999, padding: "4px 14px", fontSize: 11, fontWeight: 800, marginBottom: 16, transform: "rotate(-1deg)" }}>
              Hello! ✌
            </div>
            <h1 style={{ fontSize: "clamp(34px, 6vw, 60px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.0, margin: "0 0 14px" }}>{config.heroHeadline}</h1>
            {config.heroTagline && <p style={{ fontSize: 15, lineHeight: 1.6, color: "#666", maxWidth: 400 }}>{config.heroTagline}</p>}
            <a href="#products" style={{ display: "inline-block", marginTop: 24, padding: "13px 26px", borderRadius: 999, background: "var(--sf-accent)", color: "var(--sf-accent-fg)", fontSize: 14, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
              Let&apos;s shop! →
            </a>
          </div>
          {config.heroImageUrl && (
            <div style={{ borderRadius: 24, overflow: "hidden", aspectRatio: "4 / 5" }}>
              <StoreImage src={config.heroImageUrl} alt={config.heroHeadline} monogram={monogram(config.title)} eager style={{ width: "100%", height: "100%" }} />
            </div>
          )}
        </div>
      </section>

      {/* featured */}
      {featured.length > 0 && (
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 32px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: "var(--sf-accent)", marginBottom: 16 }}>✦ Fan favourites</div>
          <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(180px, 1fr)", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
            {featured.map((p, i) => <PlayCard key={p.id} p={p} href={`/s/${slug}/p/${p.id}`} i={i} config={config} slug={slug} />)}
          </div>
        </section>
      )}

      {/* grid */}
      <section id="products" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 72px", scrollMarginTop: 80 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: "var(--sf-accent)", marginBottom: 16 }}>◉ Everything</div>
        {products.length === 0 ? (
          <div style={{ textAlign: "center", color: "#aaa", padding: "40px 0" }}>Nothing here yet 🌱</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="play-grid">
            {products.map((p, i) => <PlayCard key={p.id} p={p} href={`/s/${slug}/p/${p.id}`} i={i} config={config} slug={slug} />)}
          </div>
        )}
      </section>

      {config.showAbout && (
        <section style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px 60px", textAlign: "center" }}>
          <div style={{ background: "var(--sf-accent-soft)", borderRadius: 24, padding: "32px" }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>✦</div>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "#555" }}>{config.about}</p>
          </div>
        </section>
      )}

      <footer style={{ textAlign: "center", padding: "24px 20px", fontSize: 12, color: "#bbb" }}>
        Made with ✦ Mira
      </footer>
    </div>
  );
}
