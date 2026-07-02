// t05-playful Detail — "The Sticker Shop" product page.
// Sticker-framed gallery (white 8px border, rotated -2deg) beside a Shrikhand
// name with a doodled squiggle underline that draws itself in. Description in
// a rounded cream card, subtitle chips, big "Grab it!" burst CTA, and a "More
// treats" row of small die-cut circle thumbs.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import { Price } from "../_shared/Price";
import { TEMPLATE_FONTS } from "../_shared/fonts";
import { Carousel } from "../../_motion";
import CartLink from "./CartLink";
import type { DetailProps, SfProduct } from "../_shared/types";

const CREAM = "#fff6ec";
const BROWN = "#3a2b20";
const FONTS = TEMPLATE_FONTS["t05-playful"];

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();
const chipsOf = (subtitle: string | null) =>
  subtitle ? subtitle.split("·").map((c) => c.trim()).filter(Boolean) : [];

// deterministic tilts for the "More treats" thumbs
const MORE_TILT = [-5, 4, -3, 6];

export default function Detail({ config, product, more, slug }: DetailProps) {
  const isPreview = slug.startsWith("preview");
  const hrefOf = (p: SfProduct) => `/s/${slug}/p/${p.slug ?? p.id}`;
  const gallery = product.images?.length
    ? product.images
    : product.imageUrl
      ? [product.imageUrl]
      : [];
  const chips = chipsOf(product.subtitle);
  const hasPrice = product.priceMinor != null || !!product.priceText;
  // link-out stores (no checkout) keep the owner's buyLabel; checkout gets the voice
  const canCheckout = config.checkoutEnabled && product.priceMinor != null && product.available;

  return (
    <div
      className={`${FONTS.className} t05-root`}
      style={{
        ["--sf-accent" as string]: config.accent,
        ["--sf-accent-fg" as string]: config.accentFg,
        ["--sf-accent-soft" as string]: `color-mix(in oklch, ${config.accent}, white 72%)`,
        ["--t05-tint" as string]: `color-mix(in oklch, ${config.accent}, white 72%)`,
        ["--t05-mid" as string]: `color-mix(in oklch, ${config.accent}, white 35%)`,
        ["--t05-display" as string]: FONTS.display,
        background: CREAM,
        color: BROWN,
        minHeight: "100vh",
        fontFamily: FONTS.body,
        fontWeight: 600,
        fontSize: 15.5,
        lineHeight: 1.6,
        overflowX: "clip",
      }}
    >
      <style>{`
        .t05-root { -webkit-font-smoothing: antialiased; }
        .t05-root ::selection { background: var(--t05-mid); color: #3a2b20; }

        @keyframes t05-pop { 0% { opacity: 0; scale: .5; } 100% { opacity: 1; scale: 1; } }
        @keyframes t05-wiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }
        @keyframes t05-wobble { 0%, 100% { transform: rotate(-4deg); } 30% { transform: rotate(2deg) scale(1.06); } 65% { transform: rotate(-7deg); } }
        @keyframes t05-drift { 0% { transform: translate(0, 0) rotate(0deg); } 100% { transform: translate(2%, 4%) rotate(6deg); } }
        @keyframes t05-bounce { 0%, 100% { transform: translateY(0); } 45% { transform: translateY(-10px); } }
        @keyframes t05-draw { to { stroke-dashoffset: 0; } }
        .t05-pop { opacity: 0; animation: t05-pop .65s cubic-bezier(.34,1.56,.64,1) forwards; }

        /* ── nav ───────────────────────────────────────────────────────────── */
        .t05-nav { position: sticky; top: 0; z-index: 40; background: color-mix(in srgb, #fff6ec 88%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
        .t05-nav-in { max-width: 1140px; margin: 0 auto; padding: 12px clamp(16px, 3vw, 28px); display: flex; align-items: center; justify-content: space-between; gap: 14px; }
        .t05-back { display: inline-block; max-width: 62vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; background: #fff; border: 2px solid var(--t05-mid); border-radius: 999px; padding: 8px 18px; font-size: 13px; font-weight: 800; color: #3a2b20; text-decoration: none; box-shadow: 0 3px 10px rgba(58,43,32,.1); transition: transform .35s cubic-bezier(.34,1.56,.64,1), background .2s ease; }
        .t05-back:hover { transform: scale(1.06) rotate(-2deg); background: var(--t05-tint); }
        .t05-cart { width: 54px; height: 54px; border-radius: 50%; background: var(--sf-accent); color: var(--sf-accent-fg); border: 4px solid #fff; box-shadow: 0 5px 14px rgba(58,43,32,.24); display: flex; flex-direction: column; align-items: center; justify-content: center; text-decoration: none; transform: rotate(6deg); transition: transform .35s cubic-bezier(.34,1.56,.64,1); flex: 0 0 auto; }
        .t05-cart:hover { transform: rotate(-4deg) scale(1.1); }
        .t05-cart-count { font-family: var(--t05-display); font-size: 15px; line-height: 1.1; }
        .t05-cart-word { font-size: 8.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; line-height: 1; }

        /* ── main ──────────────────────────────────────────────────────────── */
        .t05-main { position: relative; max-width: 1140px; margin: 0 auto; padding: clamp(36px, 6vw, 72px) clamp(18px, 3.5vw, 32px) clamp(56px, 8vw, 104px); display: grid; grid-template-columns: 1.05fr 1fr; gap: clamp(28px, 5vw, 64px); align-items: start; }
        .t05-blob { position: absolute; z-index: 0; animation: t05-drift 16s ease-in-out infinite alternate; }
        @media (max-width: 880px) { .t05-main { grid-template-columns: 1fr; } }

        /* sticker frame around the gallery */
        .t05-frame { position: relative; z-index: 1; background: #fff; border: 8px solid #fff; border-radius: 34px; box-shadow: 0 4px 0 rgba(58,43,32,.05), 0 26px 54px rgba(58,43,32,.18); transform: rotate(-2deg); }
        @media (max-width: 880px) { .t05-frame { max-width: 480px; margin: 0 auto; } }

        /* squiggle underline draws itself in */
        .t05-squiggle { display: block; margin-top: 8px; }
        .t05-squiggle path { stroke-dasharray: 1; stroke-dashoffset: 1; animation: t05-draw .9s cubic-bezier(.5, 0, .3, 1) .35s forwards; }

        .t05-title { font-family: var(--t05-display); font-weight: 400; font-size: clamp(32px, 5.5vw, 58px); line-height: 1.12; letter-spacing: .01em; margin: 0; }
        .t05-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .t05-pill { background: #fff; border: 2px solid var(--t05-mid); color: color-mix(in srgb, var(--sf-accent) 72%, #3a2b20); font-size: 11.5px; font-weight: 800; letter-spacing: .02em; border-radius: 999px; padding: 5px 12px; }
        .t05-price-badge { display: inline-block; align-self: flex-start; background: var(--sf-accent); color: var(--sf-accent-fg); font-family: var(--t05-display); font-weight: 400; font-size: clamp(22px, 3vw, 28px); line-height: 1; border-radius: 16px; padding: 12px 18px 13px; transform: rotate(-4deg); box-shadow: 0 8px 20px rgba(58,43,32,.22); }
        .t05-price-badge:hover { animation: t05-wobble .6s ease-in-out; }
        .t05-desc { background: #fffcf5; border: 3px dashed var(--t05-tint); border-radius: 22px; padding: 20px 22px; font-size: 15.5px; line-height: 1.75; color: color-mix(in srgb, #3a2b20 84%, transparent); margin: 0; }
        .t05-soldout { display: inline-block; align-self: flex-start; transform: rotate(3deg); background: #3a2b20; color: #fff6ec; font-size: 11.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; border-radius: 999px; padding: 6px 14px; }

        /* ── more treats ───────────────────────────────────────────────────── */
        .t05-more-sec { max-width: 1140px; margin: 0 auto; padding: 0 clamp(18px, 3.5vw, 32px) clamp(64px, 9vw, 110px); }
        .t05-h2 { font-family: var(--t05-display); font-weight: 400; font-size: clamp(26px, 4vw, 40px); margin: 0 0 clamp(22px, 3vw, 34px); }
        .t05-more-row { display: flex; flex-wrap: wrap; gap: clamp(20px, 3vw, 36px); }
        .t05-more { display: flex; flex-direction: column; align-items: center; gap: 10px; width: clamp(96px, 13vw, 132px); text-decoration: none; color: inherit; transition: transform .4s cubic-bezier(.34,1.56,.64,1); }
        .t05-more:hover { transform: scale(1.1) rotate(0deg) !important; }
        .t05-more-circle { display: block; width: 100%; aspect-ratio: 1 / 1; border-radius: 50%; border: 5px solid #fff; background: #fff; overflow: hidden; box-shadow: 0 3px 8px rgba(58,43,32,.14), 0 14px 30px rgba(58,43,32,.16); }
        .t05-more-name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; background: #fff; border-radius: 999px; padding: 5px 12px; font-size: 11.5px; font-weight: 800; box-shadow: 0 4px 12px rgba(58,43,32,.14); }

        /* ── footer ────────────────────────────────────────────────────────── */
        .t05-footer { text-align: center; padding: 0 20px 48px; }
        .t05-dots { display: flex; justify-content: center; gap: 10px; margin-bottom: 20px; }
        .t05-dot { width: 13px; height: 13px; border-radius: 50%; animation: t05-bounce 1.3s ease-in-out infinite; }
        .t05-dot:nth-child(1) { background: var(--sf-accent); }
        .t05-dot:nth-child(2) { background: var(--t05-mid); animation-delay: .16s; }
        .t05-dot:nth-child(3) { background: var(--t05-tint); animation-delay: .32s; }
        .t05-footer-mira { font-size: 11px; font-weight: 700; letter-spacing: .08em; color: color-mix(in srgb, #3a2b20 42%, transparent); }

        @media (prefers-reduced-motion: reduce) {
          .t05-pop { animation: none; opacity: 1; }
          .t05-blob, .t05-dot { animation: none; }
          .t05-squiggle path { animation: none; stroke-dashoffset: 0; }
          .t05-price-badge:hover { animation: none; }
          .t05-back, .t05-cart, .t05-more { transition: none; }
        }
      `}</style>

      {/* ── nav ── */}
      <header className="t05-nav">
        <div className="t05-nav-in">
          <Link href={`/s/${slug}`} className="t05-back">← {config.title}</Link>
          {!isPreview && <CartLink slug={slug} />}
        </div>
      </header>

      <main className="t05-main">
        {/* soft accent blobs behind everything */}
        <div className="t05-blob" aria-hidden style={{ left: "-14%", top: "-6%", width: "clamp(220px, 36vw, 480px)", aspectRatio: "1 / 1", background: "var(--t05-tint)", borderRadius: "58% 42% 55% 45% / 45% 52% 48% 55%" }} />
        <div className="t05-blob" aria-hidden style={{ right: "-12%", bottom: "-14%", width: "clamp(200px, 32vw, 440px)", aspectRatio: "1 / 1", background: "var(--t05-mid)", opacity: 0.45, borderRadius: "45% 55% 48% 52% / 55% 42% 58% 45%", animationDelay: "-7s" }} />

        {/* sticker-framed gallery */}
        <div className="t05-frame t05-pop" style={{ animationDelay: "0.05s" }}>
          <Carousel
            images={gallery}
            alt={product.title}
            monogram={monogram(product.title)}
            aspect="1 / 1"
            radius={24}
          />
        </div>

        {/* info column */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h1 className="t05-title">{product.title}</h1>
            <svg className="t05-squiggle" viewBox="0 0 180 14" width="min(46vw, 210px)" height="14" aria-hidden>
              <path
                d="M3 10 Q 18 3, 33 9 T 63 9 T 93 9 T 123 9 T 153 9 T 177 8"
                fill="none"
                stroke="var(--sf-accent)"
                strokeWidth="5"
                strokeLinecap="round"
                pathLength={1}
              />
            </svg>
          </div>

          {chips.length > 0 && (
            <div className="t05-chips">
              {chips.map((c) => (
                <span key={c} className="t05-pill">{c}</span>
              ))}
            </div>
          )}

          {hasPrice && (
            <span className="t05-price-badge">
              <Price minor={product.priceMinor} currency={product.currency} fallback={product.priceText} />
            </span>
          )}

          {!product.available && <span className="t05-soldout">Oops — sold out</span>}

          {product.description && <p className="t05-desc">{product.description}</p>}

          <AddToCart
            product={product}
            config={config}
            slug={slug}
            fx="burst"
            label={canCheckout ? "Grab it!" : undefined}
            addedLabel="Yum! Added ✓"
            style={{
              borderRadius: 999,
              fontWeight: 800,
              fontSize: 16.5,
              padding: "17px 38px",
              fontFamily: "inherit",
              border: "4px solid #fff",
              boxShadow: "0 10px 26px rgba(58,43,32,.24)",
              alignSelf: "flex-start",
            }}
          />
        </div>
      </main>

      {/* ── more treats ── */}
      {more.length > 0 && (
        <section className="t05-more-sec">
          <h2 className="t05-h2">More treats</h2>
          <div className="t05-more-row">
            {more.map((p, i) => (
              <Link
                key={p.id}
                href={hrefOf(p)}
                className="t05-more"
                style={{ transform: `rotate(${MORE_TILT[i % MORE_TILT.length]}deg)` }}
              >
                <span className="t05-more-circle">
                  <StoreImage
                    src={p.imageUrl}
                    alt={p.title}
                    monogram={monogram(p.title)}
                    style={{ width: "100%", height: "100%", display: "block", borderRadius: "50%" }}
                  />
                </span>
                <span className="t05-more-name">{p.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── footer ── */}
      <footer className="t05-footer">
        <div className="t05-dots" aria-hidden>
          <span className="t05-dot" />
          <span className="t05-dot" />
          <span className="t05-dot" />
        </div>
        <div className="t05-footer-mira">{config.title} · Powered by Mira</div>
      </footer>
    </div>
  );
}
