// t01-editorial — faithful refactor of the original Storefront.tsx.
// Keeps all sections: sticky nav, split/minimal hero, featured rail,
// product grid, discover bento, about. Uses same --sf-* CSS vars.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import type { ListingProps, SfProduct } from "../_shared/types";

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();
const colsFor = (n: number) => (n < 4 ? 2 : n < 13 ? 3 : 4);

function rootVars(config: ListingProps["config"]): React.CSSProperties {
  return {
    ["--sf-accent" as string]: config.accent,
    ["--sf-accent-fg" as string]: config.accentFg,
    ["--sf-accent-soft" as string]: `${config.accent}1f`,
    background: "var(--bg-frame)",
    color: "var(--text)",
    minHeight: "100vh",
  };
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--sf-accent)" }}>
      {children}
    </div>
  );
}

function SectionLabel({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "2px 0 0" }}>{title}</h2>
    </div>
  );
}

function ProductCard({ p, href, eager, config, slug }: { p: SfProduct; href?: string; eager?: boolean; config: ListingProps["config"]; slug: string }) {
  const body = (
    <>
      <div style={{ aspectRatio: "4 / 5", overflow: "hidden", background: "var(--bg-inset)", position: "relative" }}>
        <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)} eager={eager}
          className="sf-card-img" style={{ width: "100%", height: "100%", display: "block", transition: "transform .4s ease" }} />
      </div>
      <div style={{ padding: "12px 4px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.25 }}>{p.title}</span>
          {p.priceText && <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{p.priceText}</span>}
        </div>
        {p.subtitle && <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{p.subtitle}</span>}
        <AddToCart product={p} config={config} slug={slug} variant="compact" />
      </div>
    </>
  );
  const style: React.CSSProperties = { display: "block", textDecoration: "none", color: "inherit" };
  return href
    ? <Link href={href} className="sf-card" style={style}>{body}</Link>
    : <div className="sf-card" style={style}>{body}</div>;
}

export default function Listing({ config, products, slug }: ListingProps) {
  const hrefOf = (p: SfProduct) => `/s/${slug}/p/${p.id}`;
  const featured = config.showFeatured
    ? config.featuredIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) as SfProduct[]
    : [];
  const imaged = products.filter((p) => p.imageUrl && /^https:\/\//i.test(p.imageUrl));
  const showDiscover = config.showDiscover && imaged.length >= 4;
  const cols = colsFor(products.length);
  const minimal = config.heroLayout === "minimal" || !config.heroImageUrl;
  const heroH1: React.CSSProperties = { fontSize: "clamp(38px, 6vw, 68px)", fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.0, margin: "10px 0 0" };
  const heroTag: React.CSSProperties = { fontSize: "clamp(15px, 2vw, 18px)", color: "var(--text-muted)", lineHeight: 1.55, margin: "16px 0 0", maxWidth: 460 };
  const ctaBtn: React.CSSProperties = { display: "inline-block", marginTop: 26, padding: "12px 22px", borderRadius: 999, background: "var(--sf-accent)", color: "var(--sf-accent-fg)", fontSize: 14, fontWeight: 600, textDecoration: "none" };

  return (
    <div style={rootVars(config)}>
      <style>{`
        .sf-card:hover .sf-card-img { transform: scale(1.04); }
        .sf-rail::-webkit-scrollbar { height: 0; }
        @media (max-width: 820px) { .sf-hero-t01 { grid-template-columns: 1fr !important; } }
        @media (max-width: 640px) { .sf-grid-t01 { grid-template-columns: repeat(2, minmax(0,1fr)) !important; } }
      `}</style>

      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "color-mix(in srgb, var(--bg) 86%, transparent)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-flex", width: 8, height: 8, borderRadius: 999, background: "var(--sf-accent)" }} />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>{config.title}</span>
          <a href="#products" style={{ marginLeft: "auto", fontSize: 13, fontWeight: 500, color: "var(--text-muted)", textDecoration: "none" }}>Shop</a>
        </div>
      </header>

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "0 20px" }}>
        {/* hero */}
        {minimal ? (
          <section style={{ padding: "72px 0 40px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
            <Eyebrow>Welcome</Eyebrow>
            <h1 style={heroH1}>{config.heroHeadline}</h1>
            {config.heroTagline && <p style={heroTag}>{config.heroTagline}</p>}
            <a href="#products" style={ctaBtn}>View products →</a>
          </section>
        ) : (
          <section style={{ padding: "40px 0 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }} className="sf-hero-t01">
            <div>
              <Eyebrow>Welcome</Eyebrow>
              <h1 style={heroH1}>{config.heroHeadline}</h1>
              {config.heroTagline && <p style={heroTag}>{config.heroTagline}</p>}
              <a href="#products" style={ctaBtn}>View products →</a>
            </div>
            <div style={{ aspectRatio: "4 / 5", borderRadius: 18, overflow: "hidden", background: "var(--sf-accent-soft)" }}>
              <StoreImage src={config.heroImageUrl} alt={config.heroHeadline} monogram={monogram(config.title)} eager style={{ width: "100%", height: "100%" }} />
            </div>
          </section>
        )}

        {/* featured rail */}
        {featured.length > 0 && (
          <section style={{ padding: "8px 0 24px" }}>
            <SectionLabel eyebrow="Featured" title="Picked for you" />
            <div className="sf-rail" style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(220px, 1fr)", gap: 18, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 6 }}>
              {featured.map((p) => (
                <div key={p.id} style={{ scrollSnapAlign: "start" }}>
                  <ProductCard p={p} href={hrefOf(p)} config={config} slug={slug} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* grid */}
        <section id="products" style={{ padding: "24px 0 40px", scrollMarginTop: 70 }}>
          <SectionLabel eyebrow="The shop" title="All products" />
          {products.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-subtle)", fontSize: 14 }}>Nothing here yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 22, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} className="sf-grid-t01">
              {products.map((p, i) => <ProductCard key={p.id} p={p} href={hrefOf(p)} eager={i < 4} config={config} slug={slug} />)}
            </div>
          )}
        </section>

        {/* discover bento */}
        {showDiscover && (
          <section style={{ padding: "16px 0 48px" }}>
            <SectionLabel eyebrow="Discover" title="The latest" />
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, 1fr)" }}>
              {imaged.slice(0, 6).map((p, i) => (
                <Link key={p.id} href={hrefOf(p)} style={{ display: "block", gridColumn: i === 0 ? "span 2" : undefined, textDecoration: "none" }}>
                  <div style={{ aspectRatio: i === 0 ? "2 / 1" : "1 / 1", borderRadius: 14, overflow: "hidden", background: "var(--bg-inset)" }}>
                    <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)} style={{ width: "100%", height: "100%" }} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* about */}
        {config.showAbout && (
          <section style={{ padding: "16px 0 56px", maxWidth: 640 }}>
            <SectionLabel eyebrow="About" title={config.title} />
            <p style={{ fontSize: 15, lineHeight: 1.65, color: "var(--text-muted)", whiteSpace: "pre-line" }}>{config.about}</p>
            {config.contactUrl && (
              <a href={config.contactUrl} target="_blank" rel="noopener noreferrer nofollow" style={{ display: "inline-block", marginTop: 14, fontSize: 13.5, fontWeight: 600, color: "var(--sf-accent)" }}>
                Get in touch →
              </a>
            )}
          </section>
        )}
      </main>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "28px 20px", textAlign: "center", fontSize: 11.5, color: "var(--text-subtle)" }}>
        Powered by Mira
      </footer>
    </div>
  );
}
