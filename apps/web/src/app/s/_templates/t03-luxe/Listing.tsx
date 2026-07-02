// t03-luxe — Warm serif luxury. Thin dividers, generous whitespace, centered layout.
// Georgia headlines, small-caps labels, understated hover underlines.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import type { ListingProps, SfProduct } from "../_shared/types";

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();

function rootVars(config: ListingProps["config"]): React.CSSProperties {
  return {
    ["--sf-accent" as string]: config.accent,
    ["--sf-accent-fg" as string]: config.accentFg,
    ["--sf-accent-soft" as string]: `${config.accent}18`,
    background: "#f8f6f3",
    color: "#1a1714",
    fontFamily: "'georgia', 'times new roman', serif",
    minHeight: "100vh",
  };
}

const sans: React.CSSProperties = { fontFamily: "'helvetica neue', helvetica, arial, sans-serif" };
const divider: React.CSSProperties = { borderTop: "1px solid #d8d0c5", margin: "0" };
const labelStyle: React.CSSProperties = { ...sans, fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9a8f84" };

function LuxeCard({ p, href, config, slug }: { p: SfProduct; href: string; config: ListingProps["config"]; slug: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Link href={href} style={{ display: "block", width: "100%", textDecoration: "none" }}>
        <div style={{ aspectRatio: "3 / 4", overflow: "hidden", background: "var(--sf-accent-soft)" }}>
          <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)}
            style={{ width: "100%", height: "100%", transition: "transform .6s ease" }}
            className="luxe-img" />
        </div>
      </Link>
      <div style={{ padding: "16px 0 4px", textAlign: "center", width: "100%" }}>
        <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ fontSize: 17, fontWeight: 400, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{p.title}</div>
        </Link>
        {p.subtitle && <div style={{ ...sans, fontSize: 10.5, color: "#9a8f84", marginTop: 4, letterSpacing: "0.04em" }}>{p.subtitle}</div>}
        {p.priceText && <div style={{ ...sans, fontSize: 13, marginTop: 6, color: "#5a5248", fontVariantNumeric: "tabular-nums" }}>{p.priceText}</div>}
        <div style={{ marginTop: 10 }}>
          <AddToCart product={p} config={config} slug={slug} compact luxe />
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
        .luxe-img:hover { transform: scale(1.03); }
        @media (max-width: 680px) { .luxe-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>

      {/* nav — minimal centered */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(248,246,243,0.95)", backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <span style={{ fontSize: 20, fontWeight: 400, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "georgia, serif" }}>{config.title}</span>
          <a href="#products" style={{ ...sans, position: "absolute", right: 24, fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9a8f84", textDecoration: "none" }}>Shop</a>
        </div>
        <div style={divider} />
      </header>

      {/* hero — centered text, minimal */}
      <section style={{ maxWidth: 640, margin: "0 auto", padding: "80px 24px 60px", textAlign: "center" }}>
        <div style={labelStyle}>Collection</div>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.05, margin: "16px 0 0" }}>{config.heroHeadline}</h1>
        {config.heroTagline && <p style={{ ...sans, fontSize: 14, lineHeight: 1.7, color: "#7a7068", marginTop: 18, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>{config.heroTagline}</p>}
        {config.heroImageUrl && (
          <div style={{ marginTop: 36, aspectRatio: "16 / 7", overflow: "hidden" }}>
            <StoreImage src={config.heroImageUrl} alt={config.heroHeadline} monogram={monogram(config.title)} eager style={{ width: "100%", height: "100%" }} />
          </div>
        )}
        <a href="#products" style={{ ...sans, display: "inline-block", marginTop: 32, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#5a5248", textDecoration: "none", borderBottom: "1px solid #5a5248", paddingBottom: 2 }}>View the collection</a>
      </section>

      <div style={divider} />

      {/* featured */}
      {featured.length > 0 && (
        <section style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={labelStyle}>Selected pieces</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(featured.length, 3)}, 1fr)`, gap: 32 }} className="luxe-grid">
            {featured.map((p) => <LuxeCard key={p.id} p={p} href={`/s/${slug}/p/${p.id}`} config={config} slug={slug} />)}
          </div>
        </section>
      )}

      <div style={divider} />

      {/* full grid */}
      <section id="products" style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 72px", scrollMarginTop: 70 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={labelStyle}>The full edit</div>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 400, letterSpacing: "-0.01em", marginTop: 8 }}>All pieces</h2>
        </div>
        {products.length === 0 ? (
          <div style={{ ...sans, textAlign: "center", color: "#9a8f84", padding: "40px 0", fontSize: 13 }}>Nothing here yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "40px 28px" }} className="luxe-grid">
            {products.map((p) => <LuxeCard key={p.id} p={p} href={`/s/${slug}/p/${p.id}`} config={config} slug={slug} />)}
          </div>
        )}
      </section>

      {config.showAbout && (
        <>
          <div style={divider} />
          <section style={{ maxWidth: 560, margin: "0 auto", padding: "56px 24px", textAlign: "center" }}>
            <div style={labelStyle}>Our story</div>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: "#5a5248", marginTop: 18, whiteSpace: "pre-line" }}>{config.about}</p>
            {config.contactUrl && (
              <a href={config.contactUrl} target="_blank" rel="noopener noreferrer nofollow" style={{ ...sans, display: "inline-block", marginTop: 20, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#5a5248", textDecoration: "none", borderBottom: "1px solid #5a5248", paddingBottom: 2 }}>
                Get in touch
              </a>
            )}
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
