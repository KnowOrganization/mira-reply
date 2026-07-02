// t06-magazine — Editorial magazine grid. First product is the "cover story"
// spanning full width. Secondary items in multi-column editorial layout.
// Serif headlines, running text labels, pull-quote energy.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import type { ListingProps, SfProduct } from "../_shared/types";

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();
const serif = "'georgia', 'times new roman', serif";
const sans = "'helvetica neue', helvetica, arial, sans-serif";

function rootVars(config: ListingProps["config"]): React.CSSProperties {
  return {
    ["--sf-accent" as string]: config.accent,
    ["--sf-accent-fg" as string]: config.accentFg,
    ["--sf-accent-soft" as string]: `${config.accent}18`,
    background: "#fff",
    color: "#0e0e12",
    fontFamily: sans,
    minHeight: "100vh",
  };
}

export default function Listing({ config, products, slug }: ListingProps) {
  const featured = config.showFeatured
    ? config.featuredIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) as SfProduct[]
    : [];

  const hero = featured[0] || products[0] || null;
  const secondary = products.filter((p) => p.id !== hero?.id);

  return (
    <div style={rootVars(config)}>
      <style>{`
        .mag-cover:hover img { transform: scale(1.03); }
        .mag-thumb:hover { opacity: 0.85; }
        @media (max-width: 820px) { .mag-secondary { grid-template-columns: 1fr !important; } }
        @media (max-width: 640px) { .mag-aside { display: none !important; } }
      `}</style>

      {/* masthead */}
      <header style={{ borderBottom: "3px solid #0e0e12" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 24px", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
          <div style={{ fontSize: 10, fontFamily: sans, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#999" }}>
            {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()}
          </div>
          <div style={{ fontFamily: serif, fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 700, letterSpacing: "-0.02em", textAlign: "center" }}>
            {config.title}
          </div>
          <div style={{ textAlign: "right" }}>
            <a href="#shop" style={{ fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#0e0e12", textDecoration: "none" }}>
              Shop
            </a>
          </div>
        </div>
      </header>

      {/* thin accent rule */}
      <div style={{ height: 3, background: "var(--sf-accent)" }} />

      {/* cover story */}
      {hero && (
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ borderBottom: "1px solid #e0e0e0", padding: "32px 0" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32, alignItems: "start" }}>
              {/* big image */}
              <Link href={`/s/${slug}/p/${hero.id}`} style={{ display: "block", textDecoration: "none" }} className="mag-cover">
                <div style={{ aspectRatio: "16 / 9", overflow: "hidden", background: "var(--sf-accent-soft)", position: "relative" }}>
                  <StoreImage src={hero.imageUrl} alt={hero.title} monogram={monogram(hero.title)} eager
                    style={{ width: "100%", height: "100%", transition: "transform .5s ease" }} />
                  <div style={{ position: "absolute", top: 12, left: 12, background: "var(--sf-accent)", color: "var(--sf-accent-fg)", padding: "3px 10px", fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: sans }}>
                    Featured
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontFamily: serif, fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "#0e0e12" }}>{hero.title}</div>
                  {hero.subtitle && <div style={{ fontFamily: sans, fontSize: 13, color: "#666", marginTop: 8, fontStyle: "italic" }}>{hero.subtitle}</div>}
                  {hero.priceText && <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, marginTop: 10, color: "var(--sf-accent)" }}>{hero.priceText}</div>}
                </div>
              </Link>
              {/* sidebar editorial */}
              <aside className="mag-aside" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <div style={{ fontFamily: sans, fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#999", borderBottom: "1px solid #e0e0e0", paddingBottom: 8, marginBottom: 16 }}>In this collection</div>
                {secondary.slice(0, 5).map((p, i) => (
                  <Link key={p.id} href={`/s/${slug}/p/${p.id}`} style={{ display: "grid", gridTemplateColumns: "64px 1fr", gap: 12, padding: "12px 0", borderBottom: "1px solid #f0f0f0", textDecoration: "none", color: "inherit" }} className="mag-thumb">
                    <div style={{ aspectRatio: "1 / 1", overflow: "hidden", background: "#f5f5f5" }}>
                      <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)} style={{ width: "100%", height: "100%" }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: serif, fontSize: 13.5, fontWeight: 400, lineHeight: 1.3 }}>{p.title}</div>
                      {p.priceText && <div style={{ fontFamily: sans, fontSize: 11.5, color: "#888", marginTop: 3 }}>{p.priceText}</div>}
                    </div>
                  </Link>
                ))}
                <div style={{ marginTop: 16 }}>
                  <AddToCart product={hero} config={config} slug={slug} variant="compact" />
                </div>
              </aside>
            </div>
          </div>
        </section>
      )}

      {/* section header */}
      <section id="shop" style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 0", scrollMarginTop: 60 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginBottom: 24 }}>
          <div style={{ height: 1, background: "#e0e0e0" }} />
          <div style={{ fontFamily: sans, fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#999", padding: "0 16px" }}>All items</div>
          <div style={{ height: 1, background: "#e0e0e0" }} />
        </div>

        {/* editorial grid — alternating sizes */}
        {products.length === 0 ? (
          <div style={{ textAlign: "center", color: "#bbb", padding: "40px 0", fontFamily: serif, fontStyle: "italic" }}>Nothing here yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "32px 24px", paddingBottom: 64 }} className="mag-secondary">
            {products.map((p) => (
              <div key={p.id} style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid #f0f0f0", paddingBottom: 24 }}>
                <Link href={`/s/${slug}/p/${p.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
                  <div style={{ aspectRatio: "4 / 3", overflow: "hidden", background: "var(--sf-accent-soft)" }}>
                    <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)} style={{ width: "100%", height: "100%", transition: "opacity .3s ease" }} className="mag-thumb" />
                  </div>
                  <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 400, marginTop: 12, lineHeight: 1.3 }}>{p.title}</div>
                  {p.subtitle && <div style={{ fontFamily: sans, fontSize: 11, color: "#888", marginTop: 4, fontStyle: "italic" }}>{p.subtitle}</div>}
                  {p.priceText && <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, marginTop: 6, color: "var(--sf-accent)" }}>{p.priceText}</div>}
                </Link>
                <div style={{ marginTop: 10 }}>
                  <AddToCart product={p} config={config} slug={slug} variant="compact" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {config.showAbout && (
        <section style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px 64px", borderTop: "1px solid #e0e0e0" }}>
          <div style={{ fontFamily: serif, fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 400, lineHeight: 1.4, color: "#333", fontStyle: "italic" }}>
            "{config.about}"
          </div>
        </section>
      )}

      <footer style={{ borderTop: "3px solid #0e0e12", padding: "14px 24px", display: "flex", justifyContent: "space-between", fontSize: 9, fontFamily: sans, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#999" }}>
        <span>{config.title}</span>
        <span>Powered by Mira</span>
      </footer>
    </div>
  );
}
