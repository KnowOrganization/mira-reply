// t07-drop Detail — mobile-first drop page. Full-bleed image with the name
// slamming over its edge, a sticky bottom buy-bar (fx="secured" stamp), tight
// spec copy. RSC; Carousel + AddToCart are the only islands.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import Carousel from "../../_motion/Carousel";
import { Price } from "../_shared/Price";
import { TEMPLATE_FONTS } from "../_shared/fonts";
import type { DetailProps, SfProduct, StorefrontConfig } from "../_shared/types";

const F = TEMPLATE_FONTS["t07-drop"];
const INK = "#050505";
const WHITE = "#f4f4f4";
const HAIR = "1px solid rgba(255,255,255,.13)";

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();
const isHttps = (u: string | null | undefined): u is string => !!u && /^https:\/\//i.test(u);

function rootVars(config: StorefrontConfig): React.CSSProperties {
  return {
    ["--sf-accent" as string]: config.accent,
    ["--sf-accent-fg" as string]: config.accentFg,
    ["--sf-accent-soft" as string]: `color-mix(in srgb, ${config.accent} 16%, #0b0b0b)`,
    background: INK,
    color: WHITE,
    fontFamily: F.body,
    minHeight: "100vh",
    overflowX: "clip",
  };
}

export default function Detail({ config, product, more, slug }: DetailProps) {
  const href = (p: SfProduct) => `/s/${slug}/p/${p.slug ?? p.id}`;
  const gallery = product.images?.length
    ? product.images
    : isHttps(product.imageUrl)
      ? [product.imageUrl]
      : [];
  const specs = (product.subtitle ?? "").split("·").map((s) => s.trim()).filter(Boolean);

  return (
    <div className={`${F.className} t07d-root`} style={rootVars(config)}>
      <style>{`
        .t07d-root { -webkit-font-smoothing: antialiased; }
        .t07d-name { font-family: ${F.display}; font-size: clamp(48px, 13vw, 150px); line-height: .82; text-transform: uppercase; letter-spacing: -.01em; margin: -.42em 0 0; padding: 0 16px 8px; position: relative; z-index: 3; mix-blend-mode: difference; color: #fff; overflow-wrap: anywhere; }
        .t07d-spec { font-family: ${F.body}; font-weight: 800; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; border: 1px solid rgba(255,255,255,.24); padding: 6px 10px; }
        .t07d-buybar { position: sticky; bottom: 0; z-index: 20; display: flex; align-items: center; gap: 14px; padding: 14px 20px; background: rgba(5,5,5,.92); backdrop-filter: blur(10px); border-top: 1px solid var(--sf-accent); }
        .t07d-mini { display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: center; padding: 18px 20px; border-bottom: ${HAIR}; text-decoration: none; color: inherit; }
        .t07d-mini-num { font-family: ${F.display}; font-size: clamp(24px, 6vw, 48px); color: transparent; -webkit-text-stroke: 1px rgba(255,255,255,.3); line-height: 1; }
        .t07d-mini-name { font-family: ${F.display}; font-size: clamp(20px, 5vw, 38px); text-transform: uppercase; line-height: .95; }
        @media (hover: hover) and (pointer: fine) {
          .t07d-mini:hover .t07d-mini-name { color: var(--sf-accent); }
          .t07d-mini:hover .t07d-mini-num { -webkit-text-stroke-color: var(--sf-accent); }
        }
      `}</style>

      {/* nav */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 20px",
          background: "rgba(5,5,5,.9)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Link
          href={`/s/${slug}`}
          style={{ fontFamily: F.body, fontWeight: 800, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: WHITE, textDecoration: "none" }}
        >
          ← {config.title}
        </Link>
        <span style={{ marginLeft: "auto", fontFamily: F.body, fontWeight: 800, fontSize: 10, letterSpacing: ".2em", color: "var(--sf-accent)" }}>
          DROP 001
        </span>
      </header>

      {/* full-bleed image + name overlap */}
      <section style={{ position: "relative", isolation: "isolate" }}>
        <div style={{ position: "relative", background: "#0a0a0a" }}>
          {gallery.length ? (
            <Carousel images={gallery} alt={product.title} monogram={monogram(product.title)} aspect="4 / 5" />
          ) : (
            <div style={{ aspectRatio: "4 / 5" }}>
              <StoreImage src={product.imageUrl} alt={product.title} monogram={monogram(product.title)} eager style={{ width: "100%", height: "100%" }} />
            </div>
          )}
          <div
            aria-hidden
            style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", background: "linear-gradient(to top, rgba(5,5,5,.9), transparent 40%)" }}
          />
        </div>
        <h1 className="t07d-name">{product.title}</h1>
      </section>

      {/* body copy */}
      <section style={{ padding: "6px 20px 28px" }}>
        {specs.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
            {specs.map((s, i) => (
              <span key={i} className="t07d-spec">{s}</span>
            ))}
          </div>
        ) : null}

        <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--sf-accent)", marginBottom: 12 }}>
          IN THIS DROP
        </div>
        {product.description ? (
          <p style={{ fontFamily: F.body, fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,.72)", maxWidth: "56ch", margin: 0, whiteSpace: "pre-line" }}>
            {product.description}
          </p>
        ) : null}
      </section>

      {/* also in this drop */}
      {more.length > 0 && (
        <section style={{ paddingBottom: 96 }}>
          <div style={{ padding: "0 20px 8px", fontFamily: F.body, fontWeight: 800, fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(255,255,255,.5)", borderBottom: HAIR }}>
            ALSO IN THIS DROP
          </div>
          {more.map((p, i) => (
            <Link key={p.id} href={href(p)} className="t07d-mini">
              <span className="t07d-mini-num" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
              <span className="t07d-mini-name">{p.title}</span>
              <Price
                minor={p.priceMinor}
                currency={p.currency}
                fallback={p.priceText}
                style={{ fontFamily: F.body, fontWeight: 800, fontSize: 14, letterSpacing: ".04em" }}
              />
            </Link>
          ))}
        </section>
      )}

      {/* sticky buy bar */}
      <div className="t07d-buybar">
        <Price
          minor={product.priceMinor}
          currency={product.currency}
          fallback={product.priceText}
          style={{ fontFamily: F.display, fontSize: 24, letterSpacing: ".02em", lineHeight: 1, whiteSpace: "nowrap" }}
        />
        <div style={{ marginLeft: "auto", flex: "0 1 auto" }}>
          <AddToCart
            product={product}
            config={config}
            slug={slug}
            fx="secured"
            label={`${config.buyLabel.toUpperCase()} NOW`}
            style={{
              background: "var(--sf-accent)",
              color: "var(--sf-accent-fg)",
              borderRadius: 2,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 800,
              fontFamily: F.body,
              padding: "15px 30px",
              fontSize: 14,
            }}
          />
        </div>
      </div>
    </div>
  );
}
