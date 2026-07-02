// t03-luxe Detail — "The Vitrine" presentation room. One piece on a dark
// plinth inside an arch mask, slow ken-burns float, huge Cormorant name,
// Jost-caps price under a shimmer hairline. RSC — motion via kit islands.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import { Reveal, SplitText, Magnetic, Carousel } from "../../_motion";
import { TEMPLATE_FONTS } from "../_shared/fonts";
import { Price } from "../_shared/Price";
import type { DetailProps, SfProduct, StorefrontConfig } from "../_shared/types";

const F = TEMPLATE_FONTS["t03-luxe"];
const BG = "#0e0d0b";
const BONE = "#ece7dd";
const BONE_60 = "rgba(236,231,221,.62)";
const BONE_40 = "rgba(236,231,221,.42)";
const HAIR = "1px solid rgba(236,231,221,.14)";
const ARCH = "50% 50% 0 0 / 38% 38% 0 0";

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();

const label: React.CSSProperties = {
  fontFamily: F.body,
  fontSize: 11,
  fontWeight: 400,
  letterSpacing: "0.32em",
  textTransform: "uppercase",
  color: BONE_60,
};

const ghost: React.CSSProperties = {
  background: "transparent",
  color: BONE,
  border: "1px solid rgba(236,231,221,.35)",
  borderRadius: 0,
  textTransform: "uppercase",
  letterSpacing: "0.22em",
  fontSize: 11,
  fontWeight: 400,
  fontFamily: F.body,
  padding: "15px 38px",
};

function rootVars(config: StorefrontConfig): React.CSSProperties {
  return {
    ["--sf-accent" as string]: config.accent,
    ["--sf-accent-fg" as string]: config.accentFg,
    ["--sf-accent-soft" as string]: `color-mix(in srgb, ${config.accent} 13%, #16130e)`,
    background: BG,
    color: BONE,
    fontFamily: F.body,
    minHeight: "100vh",
  };
}

function Rule({ style }: { style?: React.CSSProperties }) {
  return <div aria-hidden className="t03-rule" style={style} />;
}

export default function Detail({ config, product, more, slug }: DetailProps) {
  const isPreview = slug.startsWith("preview");
  const imgs = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];

  return (
    <div className={F.className} style={rootVars(config)}>
      <style>{`
        .t03-rule { height: 1px; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--sf-accent, #c9a227) 85%, #ece7dd) 50%, transparent); background-size: 240% 100%; animation: t03-shimmer 6.5s linear infinite; opacity: .85; }
        @keyframes t03-shimmer { 0% { background-position: 170% 0; } 100% { background-position: -170% 0; } }
        /* slow ken-burns float on the presented piece */
        .t03-plinth img { animation: t03-ken 12s ease-in-out infinite alternate; }
        @keyframes t03-ken { from { transform: scale(1); } to { transform: scale(1.045); } }
        .t03-dname { font-family: ${F.display}; font-weight: 300; font-size: clamp(38px, 7.5vw, 84px); line-height: 1.05; letter-spacing: 0; margin: 0; color: ${BONE}; }
        /* arch monogram inherits Cormorant via wrapper font-family; thin the glyph */
        .t03-arch-img { font-weight: 300 !important; font-size: clamp(52px, 9vw, 110px) !important; transition: transform 1.3s cubic-bezier(.16,1,.3,1); }
        .t03-glintbox { position: relative; overflow: hidden; }
        .t03-glintbox::after { content: ""; position: absolute; inset: 0; background: linear-gradient(112deg, transparent 38%, color-mix(in srgb, var(--sf-accent, #c9a227) 28%, rgba(255,255,255,.55)) 50%, transparent 62%); transform: translateX(-135%); pointer-events: none; }
        @media (hover: hover) {
          .t03-glintbox::after { transition: transform 1.15s cubic-bezier(.16,1,.3,1); }
          a:hover .t03-glintbox::after { transform: translateX(135%); }
          a:hover .t03-glintbox .t03-arch-img { transform: scale(1.05); }
        }
        .t03-cta { transition: border-color .6s ease, color .6s ease; }
        .t03-cta:hover { border-color: color-mix(in srgb, var(--sf-accent, #c9a227) 80%, transparent) !important; color: color-mix(in srgb, var(--sf-accent, #c9a227) 55%, #ece7dd) !important; }
        .t03-more { display: flex; gap: 34px; justify-content: center; flex-wrap: wrap; padding: 0 24px; }
        @media (max-width: 620px) { .t03-more { flex-wrap: nowrap; overflow-x: auto; justify-content: flex-start; scrollbar-width: none; padding: 0 24px 12px; } }
        @media (prefers-reduced-motion: reduce) {
          .t03-rule { animation: none !important; }
          .t03-plinth img { animation: none !important; }
          .t03-glintbox::after { display: none; }
          .t03-arch-img, .t03-cta { transition: none !important; }
        }
      `}</style>

      {/* whisper-thin nav */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "color-mix(in srgb, #0e0d0b 86%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "22px 24px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <Link
            href={`/s/${slug}`}
            style={{ ...label, fontSize: 10, letterSpacing: "0.24em", position: "absolute", left: 24, top: "50%", marginTop: -7, textDecoration: "none" }}
          >
            ← Collection
          </Link>
          <Link href={`/s/${slug}`} style={{ ...label, fontSize: 13, letterSpacing: "0.3em", color: BONE, textDecoration: "none" }}>
            {config.title}
          </Link>
          {!isPreview && (
            <Link
              href={`/s/${slug}/cart`}
              style={{ ...label, fontSize: 10, letterSpacing: "0.24em", position: "absolute", right: 24, top: "50%", marginTop: -7, textDecoration: "none" }}
            >
              Cart
            </Link>
          )}
        </div>
        <Rule />
      </header>

      {/* presentation room — one beam of light over the plinth */}
      <main style={{ position: "relative", overflow: "hidden", padding: "72px 24px 110px", textAlign: "center" }}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(46% 34% at 50% 24%, rgba(236,231,221,.08), transparent 70%), radial-gradient(30% 22% at 50% 30%, color-mix(in srgb, var(--sf-accent) 10%, transparent), transparent 70%)",
          }}
        />

        <div style={{ position: "relative", maxWidth: 440, margin: "0 auto" }}>
          <Reveal duration={1.4} blur scale={1.08}>
            {/* fontFamily here so a missing image renders the monogram in Cormorant */}
            <div className="t03-plinth" style={{ fontFamily: F.display }}>
              <Carousel
                images={imgs}
                alt={product.title}
                monogram={monogram(product.title)}
                aspect="3 / 4"
                radius={ARCH}
              />
            </div>
          </Reveal>
          {/* plinth floor — pool of light with a dark core shadow */}
          <div aria-hidden style={{ position: "relative", height: 48, marginTop: 2 }}>
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                transform: "translateX(-50%)",
                width: "130%",
                height: 84,
                background: "radial-gradient(50% 55% at 50% 26%, rgba(236,231,221,.10), transparent 70%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 8,
                transform: "translateX(-50%)",
                width: "72%",
                height: 26,
                borderRadius: "50%",
                background: "radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,.8), transparent 72%)",
                filter: "blur(7px)",
              }}
            />
          </div>
        </div>

        <div style={{ position: "relative", maxWidth: 760, margin: "0 auto" }}>
          {product.subtitle && (
            <Reveal delay={0.15} duration={1}>
              <div style={{ ...label, fontSize: 10, marginTop: 30, color: "color-mix(in srgb, var(--sf-accent) 78%, #ece7dd)" }}>{product.subtitle}</div>
            </Reveal>
          )}
          <div style={{ marginTop: 16 }}>
            <SplitText by="chars" stagger={0.02} as="h1" className="t03-dname">
              {product.title}
            </SplitText>
          </div>

          <Reveal delay={0.2} duration={1}>
            <Rule style={{ width: 76, margin: "28px auto 0" }} />
            <div style={{ marginTop: 20 }}>
              <Price
                minor={product.priceMinor}
                currency={product.currency}
                fallback={product.priceText}
                style={{ fontFamily: F.body, fontSize: 15, letterSpacing: "0.22em", textTransform: "uppercase", color: BONE }}
              />
            </div>
            {!product.available && (
              <div style={{ ...label, fontSize: 9.5, marginTop: 12, color: BONE_40 }}>Currently reserved</div>
            )}
          </Reveal>

          {product.description && (
            <Reveal delay={0.28} duration={1.1}>
              <p
                style={{
                  fontFamily: F.body,
                  fontWeight: 300,
                  fontSize: 14.5,
                  lineHeight: 2.05,
                  color: BONE_60,
                  maxWidth: "55ch",
                  margin: "30px auto 0",
                  whiteSpace: "pre-line",
                }}
              >
                {product.description}
              </p>
            </Reveal>
          )}

          <Reveal delay={0.36} duration={1.1}>
            <div style={{ marginTop: 40 }}>
              <Magnetic strength={0.2}>
                <AddToCart
                  product={product}
                  config={config}
                  slug={slug}
                  fx="shimmer"
                  label="Add to selection"
                  addedLabel="Added to your selection"
                  className="t03-cta"
                  style={ghost}
                />
              </Magnetic>
            </div>
          </Reveal>
        </div>
      </main>

      {/* other pieces — small arch thumbnails */}
      {more.length > 0 && (
        <section style={{ borderTop: HAIR, padding: "76px 0 120px" }}>
          <Reveal duration={1}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={label}>Other pieces</div>
              <Rule style={{ width: 76, margin: "20px auto 0" }} />
            </div>
          </Reveal>
          <div className="t03-more">
            {more.slice(0, 4).map((p: SfProduct, i) => (
              <Reveal key={p.id} delay={i * 0.08} duration={1} y={24}>
                <Link
                  href={`/s/${slug}/p/${p.slug ?? p.id}`}
                  style={{ textDecoration: "none", color: "inherit", display: "block", width: 158, flex: "0 0 auto" }}
                >
                  <div
                    className="t03-glintbox"
                    style={{ aspectRatio: "3 / 4", borderRadius: ARCH, border: HAIR, background: "var(--sf-accent-soft)", fontFamily: F.display }}
                  >
                    <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)} className="t03-arch-img" style={{ width: "100%", height: "100%" }} />
                  </div>
                  <div style={{ textAlign: "center", marginTop: 14, fontFamily: F.display, fontWeight: 400, fontSize: 16.5, lineHeight: 1.3 }}>{p.title}</div>
                  <div style={{ textAlign: "center", marginTop: 6 }}>
                    <Price
                      minor={p.priceMinor}
                      currency={p.currency}
                      fallback={p.priceText}
                      style={{ fontFamily: F.body, fontSize: 10.5, letterSpacing: "0.16em", color: BONE_40 }}
                    />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* footer */}
      <footer style={{ padding: "0 24px 42px" }}>
        <Rule />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingTop: 32 }}>
          <span style={{ ...label, fontSize: 12, letterSpacing: "0.3em", color: BONE }}>{config.title}</span>
          <span style={{ ...label, fontSize: 8.5, letterSpacing: "0.26em", color: "rgba(236,231,221,.32)" }}>Powered by Mira</span>
        </div>
      </footer>
    </div>
  );
}
