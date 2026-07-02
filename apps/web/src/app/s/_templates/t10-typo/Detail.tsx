// t10-typo Detail — "The Index" specimen page.
// The product NAME is the hero: full-viewport-width Anybody at "wdth" 130,
// edge to edge, wrapping freely. Below, a modest "specimen plate" image
// (figure + Newsreader italic caption) sits beside a wide-measure Newsreader
// description and an oversized italic price. Ink-block AddToCart (fx scatter).
import Link from "next/link";
import AddToCart from "../../_components/AddToCart";
import { Price } from "../_shared/Price";
import { TEMPLATE_FONTS } from "../_shared/fonts";
import { Carousel, Reveal } from "../../_motion";
import CartLink from "./CartLink";
import type { DetailProps, SfProduct } from "../_shared/types";

const BONE = "#f2efe9";
const INK = "#171512";
const FONTS = TEMPLATE_FONTS["t10-typo"];

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();
const indexNo = (i: number) => String(i + 1).padStart(2, "0");

export default function Detail({ config, product, more, slug }: DetailProps) {
  const isPreview = slug.startsWith("preview");
  const hrefOf = (p: SfProduct) => `/s/${slug}/p/${p.slug ?? p.id}`;
  const gallery = product.images?.length
    ? product.images
    : product.imageUrl
      ? [product.imageUrl]
      : [];
  const canCheckout = config.checkoutEnabled && product.priceMinor != null && product.available;
  const showEnquire = !canCheckout && !product.ctaUrl && !!config.contactUrl;

  return (
    <div
      className={`${FONTS.className} t10-root`}
      style={{
        ["--sf-accent" as string]: config.accent,
        ["--sf-accent-fg" as string]: config.accentFg,
        ["--sf-accent-soft" as string]: `color-mix(in srgb, ${config.accent} 12%, ${BONE})`,
        ["--t10-display" as string]: FONTS.display,
        ["--t10-body" as string]: FONTS.body,
        background: BONE,
        color: INK,
        minHeight: "100vh",
        fontFamily: FONTS.body,
        fontSize: 16,
        lineHeight: 1.65,
      }}
    >
      <style>{`
        .t10-root { -webkit-font-smoothing: antialiased; }
        .t10-root ::selection { background: var(--sf-accent); color: var(--sf-accent-fg); }

        .t10-dnav { position: sticky; top: 0; z-index: 40; border-top: 2px solid #171512; border-bottom: 1px solid rgba(23,21,18,.3); background: color-mix(in srgb, #f2efe9 90%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
        .t10-dnav-in { display: flex; align-items: baseline; justify-content: space-between; gap: 18px; padding: 11px clamp(14px, 3vw, 32px); }
        .t10-dnav-back { font-family: var(--t10-body); font-style: italic; font-size: 13.5px; color: inherit; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color .25s ease; }
        .t10-dnav-back:hover { color: var(--sf-accent); }
        .t10-navlink { font-family: var(--t10-display); font-variation-settings: "wdth" 110; font-size: 10.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: inherit; text-decoration: none; transition: color .25s ease, font-variation-settings .4s ease; }
        .t10-navlink:hover { color: var(--sf-accent); font-variation-settings: "wdth" 140; }

        /* ── hero: the name, edge to edge ───────────────────────────────── */
        .t10-dhero { padding: clamp(36px, 6vw, 80px) clamp(10px, 2vw, 26px) clamp(22px, 4vw, 44px); }
        .t10-dtitle { margin: 0; font-family: var(--t10-display); font-weight: 800; font-variation-settings: "wdth" 130; font-size: clamp(48px, 14vw, 180px); line-height: .9; letter-spacing: -0.015em; text-transform: uppercase; overflow-wrap: break-word; animation: t10-dhero-in 1.15s cubic-bezier(.16,1,.3,1) both; }
        @keyframes t10-dhero-in {
          from { font-variation-settings: "wdth" 60; opacity: 0; }
          to   { font-variation-settings: "wdth" 130; opacity: 1; }
        }
        .t10-dsub { display: flex; align-items: baseline; gap: 16px; margin-top: clamp(14px, 2.5vw, 24px); }
        .t10-dsub-text { font-family: var(--t10-body); font-style: italic; font-size: clamp(14px, 1.8vw, 18px); color: rgba(23,21,18,.68); }
        .t10-dsub-rule { flex: 1; align-self: center; height: 1px; background: var(--sf-accent); opacity: .5; }
        .t10-dsub-no { font-family: var(--t10-display); font-variation-settings: "wdth" 120; font-size: 11px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: var(--sf-accent); white-space: nowrap; }

        /* ── two columns: specimen plate + reading column ───────────────── */
        .t10-dmain { display: grid; grid-template-columns: minmax(280px, 440px) minmax(0, 1fr); gap: clamp(30px, 6vw, 88px); align-items: start; padding: clamp(10px, 2vw, 28px) clamp(14px, 3vw, 32px) clamp(56px, 8vw, 100px); border-top: 1px solid rgba(23,21,18,.24); }
        .t10-dfig { margin: 0; max-width: 440px; }
        .t10-dplate { padding: 8px; background: #fffdf7; border: 1px solid rgba(23,21,18,.4); box-shadow: 0 18px 44px rgba(23,21,18,.14); }
        .t10-dcap { margin-top: 12px; font-family: var(--t10-body); font-style: italic; font-size: 13.5px; color: rgba(23,21,18,.6); }
        .t10-ddesc { font-family: var(--t10-body); font-size: clamp(16px, 1.9vw, 18px); line-height: 1.7; color: rgba(23,21,18,.85); max-width: 58ch; margin: 0; white-space: pre-line; }
        .t10-dprice { display: block; font-family: var(--t10-body); font-style: italic; font-size: clamp(28px, 3.5vw, 44px); line-height: 1.15; color: #171512; margin: clamp(20px, 3vw, 30px) 0 0; }
        .t10-dmeta { font-family: var(--t10-body); font-style: italic; font-size: 13.5px; color: rgba(23,21,18,.55); margin: 10px 0 0; }
        .t10-dsold { font-family: var(--t10-body); font-style: italic; font-size: 15px; color: var(--sf-accent); margin: 18px 0 0; }
        .t10-dcart { margin-top: clamp(22px, 3vw, 32px); }
        .t10-denquire { display: inline-block; margin-top: 22px; font-family: var(--t10-body); font-style: italic; font-size: 15px; color: inherit; text-decoration: underline; text-decoration-color: var(--sf-accent); text-decoration-thickness: 1px; text-underline-offset: 5px; transition: color .25s ease; }
        .t10-denquire:hover { color: var(--sf-accent); }
        @media (max-width: 820px) {
          .t10-dmain { grid-template-columns: 1fr; gap: 34px; }
        }

        /* ── also in the index: mini text rows, no images ───────────────── */
        .t10-more-sec { border-top: 1px solid rgba(23,21,18,.24); padding-bottom: clamp(40px, 6vw, 72px); }
        .t10-more-head { display: flex; align-items: baseline; gap: 16px; padding: clamp(26px, 4vw, 48px) clamp(14px, 3vw, 32px) clamp(12px, 2vw, 20px); }
        .t10-label { font-family: var(--t10-display); font-variation-settings: "wdth" 120; font-size: 11px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: rgba(23,21,18,.62); }
        .t10-more-rule { flex: 1; align-self: center; height: 1px; background: var(--sf-accent); opacity: .5; }
        .t10-mrow { display: grid; grid-template-columns: clamp(38px, 5vw, 72px) minmax(0, 1fr) auto; align-items: baseline; column-gap: clamp(10px, 2.4vw, 28px); padding: clamp(14px, 2.4vw, 24px) clamp(14px, 3vw, 32px); text-decoration: none; color: inherit; border-top: 1px solid rgba(23,21,18,.2); }
        .t10-mno { font-family: var(--t10-body); font-style: italic; font-size: 13.5px; color: rgba(23,21,18,.55); }
        .t10-mname { font-family: var(--t10-display); font-weight: 800; font-variation-settings: "wdth" 100; font-size: clamp(20px, 4.5vw, 52px); line-height: 1; letter-spacing: -0.01em; text-transform: uppercase; transition: font-variation-settings .45s cubic-bezier(.16,1,.3,1), color .25s ease; }
        .t10-mprice { font-family: var(--t10-body); font-style: italic; font-size: clamp(14px, 1.9vw, 20px); white-space: nowrap; color: rgba(23,21,18,.8); }
        @media (hover: hover) and (pointer: fine) {
          .t10-mrow:hover .t10-mname { font-variation-settings: "wdth" 125; color: var(--sf-accent); }
        }
        .t10-mrow:focus-visible .t10-mname { font-variation-settings: "wdth" 125; color: var(--sf-accent); }
        @media (max-width: 640px) {
          .t10-mrow { grid-template-columns: minmax(0, 1fr); row-gap: 4px; }
          .t10-mno { display: none; }
        }

        .t10-colophon { border-top: 1px solid rgba(23,21,18,.24); padding: 18px clamp(14px, 3vw, 32px) 28px; display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; font-family: var(--t10-body); font-style: italic; font-size: 12.5px; color: rgba(23,21,18,.55); }

        @media (prefers-reduced-motion: reduce) {
          .t10-dtitle { animation: none !important; }
          .t10-mname, .t10-navlink, .t10-dnav-back, .t10-denquire { transition: none !important; }
        }
      `}</style>

      {/* ── index line nav ── */}
      <header className="t10-dnav">
        <div className="t10-dnav-in">
          <Link href={`/s/${slug}`} className="t10-dnav-back">
            ← {config.title} — the index
          </Link>
          <nav style={{ display: "flex", gap: 18, flex: "0 0 auto" }} aria-label="Store">
            {config.contactUrl && (
              <a className="t10-navlink" href={config.contactUrl} target="_blank" rel="noopener noreferrer nofollow">Contact</a>
            )}
            {!isPreview && <CartLink slug={slug} className="t10-navlink" />}
          </nav>
        </div>
      </header>

      <main>
        {/* ── the name IS the hero ── */}
        <section className="t10-dhero">
          <h1 className="t10-dtitle">{product.title}</h1>
          <div className="t10-dsub">
            {product.subtitle && <span className="t10-dsub-text">{product.subtitle}</span>}
            <span className="t10-dsub-rule" aria-hidden />
            <span className="t10-dsub-no">Object · {config.currency}</span>
          </div>
        </section>

        {/* ── specimen plate + reading column ── */}
        <section className="t10-dmain">
          <Reveal y={22} scale={1.03} duration={1}>
            <figure className="t10-dfig">
              <div className="t10-dplate">
                <Carousel
                  images={gallery}
                  alt={product.title}
                  monogram={monogram(product.title)}
                  aspect="1 / 1"
                  radius={0}
                />
              </div>
              <figcaption className="t10-dcap">Fig. 1 — {product.title}</figcaption>
            </figure>
          </Reveal>

          <div>
            {product.description && (
              <Reveal y={18} delay={0.1}>
                <p className="t10-ddesc">{product.description}</p>
              </Reveal>
            )}
            <Reveal y={14} delay={0.2}>
              <Price
                minor={product.priceMinor}
                currency={product.currency}
                fallback={product.priceText}
                className="t10-dprice"
              />
              <p className="t10-dmeta">Ships from the studio · {config.currency}</p>
              {!product.available && <p className="t10-dsold">Sold — this object has left the studio.</p>}
            </Reveal>
            <Reveal y={12} delay={0.3}>
              <div className="t10-dcart">
                <AddToCart
                  product={product}
                  config={config}
                  slug={slug}
                  fx="scatter"
                  label={canCheckout ? "Add — object" : undefined}
                  addedLabel="Added — object ✓"
                  style={{
                    background: INK,
                    color: BONE,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    borderRadius: 0,
                    width: "100%",
                    padding: "16px 20px",
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: FONTS.display,
                    fontVariationSettings: '"wdth" 115',
                  }}
                />
                {showEnquire && (
                  <a
                    className="t10-denquire"
                    href={config.contactUrl!}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    Enquire about this object →
                  </a>
                )}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── also in the index ── */}
        {more.length > 0 && (
          <section className="t10-more-sec">
            <div className="t10-more-head">
              <span className="t10-label">Also in the Index</span>
              <span className="t10-more-rule" aria-hidden />
            </div>
            {more.map((p, i) => (
              <Reveal key={p.id} y={14} duration={0.65} delay={Math.min(i * 0.06, 0.3)}>
                <Link href={hrefOf(p)} className="t10-mrow">
                  <span className="t10-mno">{indexNo(i)}</span>
                  <span className="t10-mname">{p.title}</span>
                  <Price minor={p.priceMinor} currency={p.currency} fallback={p.priceText} className="t10-mprice" />
                </Link>
              </Reveal>
            ))}
          </section>
        )}
      </main>

      {/* ── colophon ── */}
      <footer className="t10-colophon">
        <span>
          Set in Anybody &amp; Newsreader · {config.title} · {config.currency}
        </span>
        <span>Powered by Mira</span>
      </footer>
    </div>
  );
}
