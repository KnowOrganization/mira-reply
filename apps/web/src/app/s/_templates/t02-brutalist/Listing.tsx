// t02-brutalist — Raw Bauhaus energy. Black borders, zero radius, ALL CAPS type,
// accent-filled header bar, heavy dividers, no shadows, maximum contrast.
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
    background: "#ffffff",
    color: "#111",
    fontFamily: "'helvetica neue', helvetica, arial, sans-serif",
    minHeight: "100vh",
  };
}

function BrutalCard({ p, href, config, slug }: { p: SfProduct; href: string; config: ListingProps["config"]; slug: string }) {
  return (
    <div style={{ border: "3px solid #111", display: "flex", flexDirection: "column" }}>
      <Link href={href} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
        <div style={{ aspectRatio: "1 / 1", overflow: "hidden", background: "var(--sf-accent-soft)", borderBottom: "3px solid #111" }}>
          <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      </Link>
      <div style={{ padding: "10px 10px 12px", background: "#fff" }}>
        <div style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1.2 }}>{p.title}</div>
        {p.priceText && (
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: "var(--sf-accent)" }}>{p.priceText}</div>
        )}
        <div style={{ marginTop: 8 }}>
          <AddToCart product={p} config={config} slug={slug} compact brutal />
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
      {/* nav bar — solid accent bg */}
      <header style={{ background: "var(--sf-accent)", borderBottom: "3px solid #111", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "stretch", gap: 0 }}>
          <div style={{ padding: "14px 0", fontWeight: 900, fontSize: 18, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--sf-accent-fg)", flex: 1 }}>
            {config.title}
          </div>
          <a href="#products" style={{ display: "flex", alignItems: "center", padding: "0 20px", borderLeft: "3px solid #111", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--sf-accent-fg)", textDecoration: "none" }}>
            Shop
          </a>
        </div>
      </header>

      {/* hero — full-width black band */}
      <section style={{ borderBottom: "3px solid #111", padding: "40px 20px", background: "#111", color: "#fff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: config.heroImageUrl ? "1fr 1fr" : "1fr", gap: 40, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--sf-accent)", marginBottom: 12 }}>Now open</div>
            <h1 style={{ fontSize: "clamp(40px, 8vw, 90px)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 0.9, margin: 0 }}>
              {config.heroHeadline}
            </h1>
            {config.heroTagline && <p style={{ marginTop: 18, fontSize: 15, lineHeight: 1.55, color: "#aaa", maxWidth: 400 }}>{config.heroTagline}</p>}
            <a href="#products" style={{ display: "inline-block", marginTop: 28, padding: "12px 24px", background: "var(--sf-accent)", color: "var(--sf-accent-fg)", fontWeight: 900, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", textDecoration: "none" }}>
              Enter shop →
            </a>
          </div>
          {config.heroImageUrl && (
            <div style={{ aspectRatio: "3 / 2", overflow: "hidden", border: "3px solid var(--sf-accent)" }}>
              <StoreImage src={config.heroImageUrl} alt={config.heroHeadline} monogram={monogram(config.title)} eager style={{ width: "100%", height: "100%" }} />
            </div>
          )}
        </div>
      </section>

      {/* featured strip */}
      {featured.length > 0 && (
        <section style={{ borderBottom: "3px solid #111", padding: "24px 20px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16, borderBottom: "3px solid #111", paddingBottom: 8 }}>
              ★ Featured picks
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(featured.length, 4)}, 1fr)`, gap: 0, border: "3px solid #111" }}>
              {featured.map((p, i) => (
                <div key={p.id} style={{ borderRight: i < featured.length - 1 ? "3px solid #111" : undefined }}>
                  <BrutalCard p={p} href={`/s/${slug}/p/${p.id}`} config={config} slug={slug} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* product grid */}
      <section id="products" style={{ padding: "24px 20px 60px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, borderBottom: "3px solid #111", paddingBottom: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase" }}>All products</span>
            <span style={{ fontSize: 10, color: "#666" }}>{products.length} items</span>
          </div>
          {products.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Nothing here yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 0, gridTemplateColumns: "repeat(3, 1fr)", border: "3px solid #111" }}
              className="sf-grid-brutal">
              <style>{`
                @media (max-width: 640px) { .sf-grid-brutal { grid-template-columns: repeat(2, 1fr) !important; } }
                .sf-grid-brutal > * { border-right: 3px solid #111; border-bottom: 3px solid #111; }
                .sf-grid-brutal > *:nth-child(3n) { border-right: none; }
              `}</style>
              {products.map((p) => (
                <BrutalCard key={p.id} p={p} href={`/s/${slug}/p/${p.id}`} config={config} slug={slug} />
              ))}
            </div>
          )}
        </div>
      </section>

      {config.showAbout && (
        <section style={{ borderTop: "3px solid #111", padding: "24px 20px 48px", background: "var(--sf-accent-soft)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 10 }}>About</div>
            <p style={{ fontSize: 15, lineHeight: 1.65, maxWidth: 600 }}>{config.about}</p>
          </div>
        </section>
      )}

      <footer style={{ borderTop: "3px solid #111", background: "#111", color: "#fff", padding: "16px 20px", display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        <span>{config.title}</span>
        <span>Mira</span>
      </footer>
    </div>
  );
}
