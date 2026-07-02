// t08-market — Dense marketplace grid. Amazon/Flipkart feel: light grey bg,
// 4-column compact cards with thumbnail, name, price, "Add" inline.
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
    background: "#f0f2f5",
    color: "#0f1111",
    fontFamily: "'helvetica neue', helvetica, arial, sans-serif",
    minHeight: "100vh",
  };
}

const card: React.CSSProperties = { background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.10)", display: "flex", flexDirection: "column" };

function MarketCard({ p, href, config, slug }: { p: SfProduct; href: string; config: ListingProps["config"]; slug: string }) {
  return (
    <div style={card}>
      <Link href={href} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
        <div style={{ aspectRatio: "1 / 1", overflow: "hidden", background: "#f7f8fa" }}>
          <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)} className="mkt-img"
            style={{ width: "100%", height: "100%", transition: "transform .3s ease" }} />
        </div>
        <div style={{ padding: "8px 10px 4px" }}>
          <div style={{ fontSize: 13, lineHeight: 1.35, color: "#0f1111", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>{p.title}</div>
          {p.priceText && <div style={{ fontSize: 17, fontWeight: 700, color: "#0f1111", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{p.priceText}</div>}
          {/* star placeholder */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 4 }}>
            {[1,2,3,4,5].map(n => <span key={n} style={{ fontSize: 10, color: n <= 4 ? "#e47911" : "#ddd" }}>★</span>)}
            <span style={{ fontSize: 10, color: "#888", marginLeft: 3 }}>(24)</span>
          </div>
        </div>
      </Link>
      <div style={{ padding: "4px 10px 10px" }}>
        <AddToCart product={p} config={config} slug={slug} compact market />
      </div>
    </div>
  );
}

export default function Listing({ config, products, slug }: ListingProps) {
  return (
    <div style={rootVars(config)}>
      <style>{`
        .mkt-img:hover { transform: scale(1.04); }
        @media (max-width: 820px) { .mkt-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px) { .mkt-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>

      {/* header */}
      <header style={{ background: "var(--sf-accent)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/s/${slug}`} style={{ fontSize: 18, fontWeight: 800, color: "var(--sf-accent-fg)", textDecoration: "none", letterSpacing: "-0.01em" }}>{config.title}</Link>
          <div style={{ flex: 1, background: "#fff", borderRadius: 4, padding: "7px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#aaa" }}>Search {config.title}…</span>
          </div>
        </div>
      </header>

      {/* filter bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e8e8", padding: "8px 16px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Sort:</span>
          {["Relevance", "Price: Low–High", "Newest"].map(f => (
            <span key={f} style={{ fontSize: 12, color: "#555", cursor: "default", padding: "3px 8px", borderRadius: 4, background: f === "Relevance" ? "var(--sf-accent-soft)" : "transparent" }}>{f}</span>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#888" }}>{products.length} results</span>
        </div>
      </div>

      {/* hero banner */}
      {config.heroImageUrl && (
        <div style={{ background: "var(--sf-accent-soft)", borderBottom: "1px solid #e0e0e0" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center", gap: 20 }}>
            <div style={{ padding: "20px 0" }}>
              <h1 style={{ fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 8px" }}>{config.heroHeadline}</h1>
              {config.heroTagline && <p style={{ fontSize: 13, color: "#555", margin: 0 }}>{config.heroTagline}</p>}
            </div>
            <div style={{ aspectRatio: "16 / 7", overflow: "hidden" }}>
              <StoreImage src={config.heroImageUrl} alt={config.heroHeadline} monogram={monogram(config.title)} eager style={{ width: "100%", height: "100%" }} />
            </div>
          </div>
        </div>
      )}

      {/* product grid */}
      <section id="products" style={{ maxWidth: 1280, margin: "0 auto", padding: "16px" }}>
        {products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#888", fontSize: 14 }}>Nothing here yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }} className="mkt-grid">
            {products.map((p) => <MarketCard key={p.id} p={p} href={`/s/${slug}/p/${p.id}`} config={config} slug={slug} />)}
          </div>
        )}
      </section>

      {config.showAbout && (
        <section style={{ maxWidth: 1280, margin: "16px auto", background: "#fff", borderRadius: 8, padding: "20px 20px" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>About {config.title}</div>
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "#555", margin: 0 }}>{config.about}</p>
        </section>
      )}

      <footer style={{ background: "var(--sf-accent)", marginTop: 16, padding: "14px 16px", textAlign: "center", fontSize: 11, color: "var(--sf-accent-fg)", opacity: 0.85 }}>
        Powered by Mira
      </footer>
    </div>
  );
}
