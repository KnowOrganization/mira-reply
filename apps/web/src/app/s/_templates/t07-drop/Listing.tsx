// t07-drop — Hypebeast single-product drop. Full-bleed hero (~60vh) with cinematic
// overlay and massive title. Remaining products in a tight horizontal strip below.
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
    background: "#0a0a0a",
    color: "#f5f5f5",
    fontFamily: "'helvetica neue', helvetica, arial, sans-serif",
    minHeight: "100vh",
  };
}

export default function Listing({ config, products, slug }: ListingProps) {
  const featured = config.showFeatured
    ? config.featuredIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) as SfProduct[]
    : [];
  const hero = featured[0] || products[0] || null;
  const strip = products.filter((p) => p.id !== hero?.id);

  return (
    <div style={rootVars(config)}>
      <style>{`
        .drop-strip-scroll::-webkit-scrollbar { display: none; }
        .drop-strip-item:hover { opacity: 0.8; }
      `}</style>

      {/* minimal floating nav */}
      <header style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 30, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)" }}>
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#fff" }}>{config.title}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ background: "var(--sf-accent)", color: "var(--sf-accent-fg)", fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 2 }}>Drop live</span>
        </div>
      </header>

      {/* hero — full-bleed cinematic */}
      {hero ? (
        <section style={{ position: "relative", height: "60vh", minHeight: 400, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <StoreImage src={hero.imageUrl || config.heroImageUrl} alt={hero.title} monogram={monogram(hero.title)} eager style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          {/* gradient overlay */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.3) 60%, transparent 100%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 28px 32px" }}>
            <Link href={`/s/${slug}/p/${hero.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <h1 style={{ fontSize: "clamp(40px, 8vw, 100px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.9, textTransform: "uppercase", margin: "0 0 12px", maxWidth: "80vw" }}>{hero.title}</h1>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              {hero.priceText && <span style={{ fontSize: 18, fontWeight: 700, color: "var(--sf-accent)" }}>{hero.priceText}</span>}
              <AddToCart product={hero} config={config} slug={slug} drop />
            </div>
          </div>
        </section>
      ) : (
        <section style={{ height: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <h1 style={{ fontSize: "clamp(40px, 8vw, 80px)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.04em", opacity: 0.3 }}>{config.title}</h1>
        </section>
      )}

      {/* tagline bar */}
      {config.heroTagline && (
        <div style={{ padding: "20px 28px", borderTop: "1px solid rgba(255,255,255,0.1)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <p style={{ fontSize: 14, color: "#888", margin: 0, maxWidth: 600 }}>{config.heroTagline}</p>
        </div>
      )}

      {/* strip — horizontal scroll for remaining products */}
      {strip.length > 0 && (
        <section style={{ padding: "32px 28px 40px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#555", marginBottom: 16 }}>
            Also available
          </div>
          <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }} className="drop-strip-scroll">
            {strip.map((p) => (
              <Link key={p.id} href={`/s/${slug}/p/${p.id}`} style={{ flex: "0 0 200px", textDecoration: "none", color: "inherit" }} className="drop-strip-item">
                <div style={{ aspectRatio: "1 / 1", overflow: "hidden", background: "#1a1a1a", borderRadius: 4 }}>
                  <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)} style={{ width: "100%", height: "100%" }} />
                </div>
                <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em" }}>{p.title}</div>
                {p.priceText && <div style={{ fontSize: 13, color: "var(--sf-accent)", marginTop: 3 }}>{p.priceText}</div>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {config.showAbout && (
        <section style={{ padding: "0 28px 48px", maxWidth: 560 }}>
          <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "#666" }}>{config.about}</p>
        </section>
      )}

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "16px 28px", fontSize: 10, color: "#444", letterSpacing: "0.12em", textTransform: "uppercase", display: "flex", justifyContent: "space-between" }}>
        <span>{config.title}</span><span>Mira</span>
      </footer>
    </div>
  );
}
