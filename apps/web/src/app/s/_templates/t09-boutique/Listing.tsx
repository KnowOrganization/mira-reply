// t09-boutique — Curated, artisanal. Maximum whitespace, large square images,
// 2 columns, minimal chrome. Product name large below image. Very little text.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import type { ListingProps, SfProduct } from "../_shared/types";

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();
const sans: React.CSSProperties = { fontFamily: "'helvetica neue', helvetica, arial, sans-serif" };

function rootVars(config: ListingProps["config"]): React.CSSProperties {
  return {
    ["--sf-accent" as string]: config.accent,
    ["--sf-accent-fg" as string]: config.accentFg,
    ["--sf-accent-soft" as string]: `${config.accent}14`,
    background: "#ffffff",
    color: "#111",
    fontFamily: "'helvetica neue', helvetica, arial, sans-serif",
    minHeight: "100vh",
  };
}

function BoutiqueCard({ p, href, config, slug }: { p: SfProduct; href: string; config: ListingProps["config"]; slug: string }) {
  return (
    <div>
      <Link href={href} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
        <div style={{ aspectRatio: "1 / 1", overflow: "hidden", background: "var(--sf-accent-soft)" }} className="bout-img-wrap">
          <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)}
            className="bout-img" style={{ width: "100%", height: "100%", transition: "transform .7s ease" }} />
        </div>
      </Link>
      <div style={{ paddingTop: 20, paddingBottom: 32 }}>
        <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
          <h3 style={{ fontSize: "clamp(18px, 2.5vw, 26px)", fontWeight: 400, letterSpacing: "-0.01em", lineHeight: 1.2, margin: "0 0 8px" }}>{p.title}</h3>
        </Link>
        {p.subtitle && <div style={{ ...sans, fontSize: 12.5, color: "#888", marginBottom: 6 }}>{p.subtitle}</div>}
        {p.priceText && <div style={{ ...sans, fontSize: 14, color: "#555", fontVariantNumeric: "tabular-nums" }}>{p.priceText}</div>}
        <div style={{ marginTop: 12 }}>
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
        .bout-img:hover { transform: scale(1.04); }
        @media (max-width: 640px) { .bout-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* minimal centered nav */}
      <header style={{ padding: "28px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 8, height: 8, borderRadius: 999, background: "var(--sf-accent)" }} />
        <span style={{ fontSize: 15, fontWeight: 400, letterSpacing: "0.12em", textTransform: "uppercase" }}>{config.title}</span>
        <a href="#products" style={{ ...sans, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", textDecoration: "none" }}>Shop</a>
      </header>

      {/* hero — centered type only */}
      <section style={{ maxWidth: 700, margin: "0 auto", padding: "60px 40px 80px", textAlign: "center" }}>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 58px)", fontWeight: 300, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 20px" }}>{config.heroHeadline}</h1>
        {config.heroTagline && <p style={{ ...sans, fontSize: 14, lineHeight: 1.7, color: "#888", margin: 0 }}>{config.heroTagline}</p>}
        {config.heroImageUrl && (
          <div style={{ marginTop: 40, aspectRatio: "16 / 9", overflow: "hidden" }}>
            <StoreImage src={config.heroImageUrl} alt={config.heroHeadline} monogram={monogram(config.title)} eager style={{ width: "100%", height: "100%" }} />
          </div>
        )}
        <a href="#products" style={{ ...sans, display: "inline-block", marginTop: 32, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#111", textDecoration: "none", borderBottom: "1px solid #111", paddingBottom: 3 }}>
          View pieces
        </a>
      </section>

      {/* thin rule */}
      <div style={{ height: 1, background: "#ebebeb", margin: "0 40px" }} />

      {/* featured */}
      {featured.length > 0 && (
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 40px" }}>
          <div style={{ ...sans, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#aaa", marginBottom: 40, textAlign: "center" }}>Selected pieces</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0 56px" }} className="bout-grid">
            {featured.slice(0, 4).map((p) => <BoutiqueCard key={p.id} p={p} href={`/s/${slug}/p/${p.id}`} config={config} slug={slug} />)}
          </div>
        </section>
      )}

      <div style={{ height: 1, background: "#ebebeb", margin: "0 40px" }} />

      {/* full grid */}
      <section id="products" style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 40px 80px", scrollMarginTop: 80 }}>
        <div style={{ ...sans, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#aaa", marginBottom: 40, textAlign: "center" }}>The full collection</div>
        {products.length === 0 ? (
          <div style={{ textAlign: "center", color: "#ccc", fontSize: 14, padding: "40px 0" }}>Nothing here yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0 56px" }} className="bout-grid">
            {products.map((p) => <BoutiqueCard key={p.id} p={p} href={`/s/${slug}/p/${p.id}`} config={config} slug={slug} />)}
          </div>
        )}
      </section>

      {config.showAbout && (
        <>
          <div style={{ height: 1, background: "#ebebeb", margin: "0 40px" }} />
          <section style={{ maxWidth: 500, margin: "0 auto", padding: "64px 40px", textAlign: "center" }}>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#666", margin: 0, whiteSpace: "pre-line" }}>{config.about}</p>
            {config.contactUrl && (
              <a href={config.contactUrl} target="_blank" rel="noopener noreferrer nofollow" style={{ ...sans, display: "inline-block", marginTop: 20, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#111", textDecoration: "none", borderBottom: "1px solid #111", paddingBottom: 2 }}>
                Contact
              </a>
            )}
          </section>
        </>
      )}

      <footer style={{ borderTop: "1px solid #ebebeb", padding: "20px 40px", display: "flex", justifyContent: "space-between", ...sans, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#ccc" }}>
        <span>{config.title}</span><span>Mira</span>
      </footer>
    </div>
  );
}
