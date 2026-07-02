// t05-playful — "The Sticker Shop"
// A candy-counter storefront for food / bakery / candy / snack sellers.
// Cream paper (#fff6ec), warm brown type (#3a2b20); the owner accent IS the
// hero — blobs, badges, buttons, sticker chrome, outline marquee.
// Signature: the Sticker Board — a ~90svh board where the headline words sit
// on tilted white stickers and the products are draggable, flingable die-cut
// stickers that spring home on release (StickerBoard.tsx client island).
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import { Price } from "../_shared/Price";
import { TEMPLATE_FONTS } from "../_shared/fonts";
import { Marquee } from "../../_motion";
import StickerBoard, { type BoardSticker } from "./StickerBoard";
import CartLink from "./CartLink";
import type { ListingProps, SfProduct } from "../_shared/types";

const CREAM = "#fff6ec";
const BROWN = "#3a2b20";
const FONTS = TEMPLATE_FONTS["t05-playful"];

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();
const chipsOf = (subtitle: string | null) =>
  subtitle ? subtitle.split("·").map((c) => c.trim()).filter(Boolean) : [];
const hasPrice = (p: SfProduct) => p.priceMinor != null || !!p.priceText;

// deterministic tilt tables — no Math.random anywhere
const WORD_TILT = [-4, 3, -2, 5, -3, 2, -5, 4];
const CARD_TILT = [-1.2, 0.8, -0.6, 1.1, -0.9, 0.7];

function Wave({ flip }: { flip?: boolean }) {
  return (
    <svg
      className="t05-wave"
      viewBox="0 0 1440 110"
      preserveAspectRatio="none"
      aria-hidden
      style={{ display: "block", width: "100%", height: "clamp(44px, 7vw, 96px)", transform: flip ? "scaleY(-1)" : undefined }}
    >
      <path
        d="M0,70 C160,108 320,26 480,54 C640,82 800,20 960,50 C1120,80 1280,38 1440,62 L1440,110 L0,110 Z"
        fill="var(--t05-tint)"
      />
    </svg>
  );
}

function MenuCard({
  p,
  href,
  i,
  config,
  slug,
  featured,
}: {
  p: SfProduct;
  href: string;
  i: number;
  config: ListingProps["config"];
  slug: string;
  featured: boolean;
}) {
  const chips = chipsOf(p.subtitle);
  // link-out stores (no checkout) keep the owner's buyLabel; checkout gets the voice
  const canCheckout = config.checkoutEnabled && p.priceMinor != null && p.available;
  return (
    <div className="t05-card" style={{ ["--t05-card-tilt" as string]: `${CARD_TILT[i % CARD_TILT.length]}deg` }}>
      {featured && <span className="t05-fave" aria-hidden>★ fan fave</span>}
      <Link href={href} className="t05-card-link">
        <span className="t05-card-img">
          <StoreImage
            src={p.imageUrl}
            alt={p.title}
            monogram={monogram(p.title)}
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </span>
        <span className="t05-card-name">{p.title}</span>
      </Link>
      {chips.length > 0 && (
        <span className="t05-chips">
          {chips.map((c) => (
            <span key={c} className="t05-pill">{c}</span>
          ))}
        </span>
      )}
      <span className="t05-card-row">
        {hasPrice(p) && (
          <span className="t05-price-badge">
            <Price minor={p.priceMinor} currency={p.currency} fallback={p.priceText} />
          </span>
        )}
        <AddToCart
          product={p}
          config={config}
          slug={slug}
          variant="compact"
          fx="burst"
          label={canCheckout ? "Grab" : undefined}
          addedLabel="Yum! ✓"
          className="t05-add"
          style={{ borderRadius: 999, fontWeight: 800, fontSize: 13, padding: "10px 20px", fontFamily: "inherit", boxShadow: "0 6px 16px rgba(58,43,32,.18)" }}
        />
      </span>
    </div>
  );
}

export default function Listing({ config, products, slug }: ListingProps) {
  const isPreview = slug.startsWith("preview");
  const hrefOf = (p: SfProduct) => `/s/${slug}/p/${p.slug ?? p.id}`;
  const featuredSet = new Set(config.showFeatured ? config.featuredIds : []);
  const words = config.heroHeadline.split(/\s+/).filter(Boolean);
  const showMenu = products.length >= 3;
  const bigBoard = products.length > 0 && products.length <= 2;

  // sticker roster — hero image first (when present + not minimal), then
  // products; capped at the slot count inside StickerBoard.
  const stickers: BoardSticker[] = [];
  if (config.heroImageUrl && config.heroLayout !== "minimal") {
    stickers.push({
      id: "__hero",
      href: showMenu ? "#t05-menu" : null,
      label: showMenu ? "the counter" : config.title,
      title: config.title,
      imageUrl: config.heroImageUrl,
      monogram: monogram(config.title),
    });
  }
  for (const p of products) {
    if (stickers.length >= 5) break;
    stickers.push({
      id: p.id,
      href: hrefOf(p),
      label: p.title,
      title: p.title,
      imageUrl: p.imageUrl,
      monogram: monogram(p.title),
    });
  }

  // marquee roster — repeat short catalogs so the belt never looks starved
  let names = products.map((p) => p.title);
  while (names.length > 0 && names.length < 6) names = names.concat(names);
  names = names.slice(0, 8);
  const showMarquee = config.showDiscover && names.length > 0;

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

        /* ── keyframes ─────────────────────────────────────────────────────── */
        /* uses the independent \`scale\` property so it never clobbers the
           inline transform: rotate() tilts on stickers/words */
        @keyframes t05-pop { 0% { opacity: 0; scale: .5; } 100% { opacity: 1; scale: 1; } }
        @keyframes t05-wiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }
        @keyframes t05-wobble { 0%, 100% { transform: rotate(-4deg); } 30% { transform: rotate(2deg) scale(1.06); } 65% { transform: rotate(-7deg); } }
        @keyframes t05-drift { 0% { transform: translate(0, 0) rotate(0deg); } 100% { transform: translate(2%, 4%) rotate(6deg); } }
        @keyframes t05-bounce { 0%, 100% { transform: translateY(0); } 45% { transform: translateY(-10px); } }
        .t05-pop { opacity: 0; animation: t05-pop .65s cubic-bezier(.34,1.56,.64,1) forwards; }

        /* ── nav ───────────────────────────────────────────────────────────── */
        .t05-nav { position: sticky; top: 0; z-index: 40; background: color-mix(in srgb, #fff6ec 88%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
        .t05-nav-in { max-width: 1200px; margin: 0 auto; padding: 12px clamp(16px, 3vw, 28px); display: flex; align-items: center; gap: 14px; }
        .t05-brand { font-family: var(--t05-display); font-size: clamp(20px, 3vw, 27px); color: var(--sf-accent); text-decoration: none; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; }
        .t05-brand:hover { animation: t05-wiggle .5s ease-in-out; }
        .t05-navpill { font-size: 12.5px; font-weight: 800; letter-spacing: .04em; color: #3a2b20; text-decoration: none; background: #fff; border: 2px solid var(--t05-mid); border-radius: 999px; padding: 7px 16px; box-shadow: 0 3px 10px rgba(58,43,32,.1); transition: transform .35s cubic-bezier(.34,1.56,.64,1), background .2s ease; }
        .t05-navpill:hover { transform: scale(1.08) rotate(-2deg); background: var(--t05-tint); }
        .t05-cart { width: 54px; height: 54px; border-radius: 50%; background: var(--sf-accent); color: var(--sf-accent-fg); border: 4px solid #fff; box-shadow: 0 5px 14px rgba(58,43,32,.24); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; text-decoration: none; transform: rotate(6deg); transition: transform .35s cubic-bezier(.34,1.56,.64,1); flex: 0 0 auto; }
        .t05-cart:hover { transform: rotate(-4deg) scale(1.1); }
        .t05-cart-count { font-family: var(--t05-display); font-size: 15px; line-height: 1.1; }
        .t05-cart-word { font-size: 8.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; line-height: 1; }

        /* ── sticker board hero ────────────────────────────────────────────── */
        .t05-hero { position: relative; min-height: 90svh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: clamp(56px, 9vh, 110px) 20px; overflow: hidden; }
        .t05-blob { position: absolute; z-index: 0; animation: t05-drift 16s ease-in-out infinite alternate; }
        .t05-hero-h1 { position: relative; z-index: 2; font-family: var(--t05-display); font-weight: 400; font-size: clamp(38px, 9vw, 110px); line-height: 1.14; letter-spacing: .01em; margin: 0; max-width: 14ch; }
        .t05-word { display: inline-block; background: #fff; color: var(--sf-accent); border: .09em solid #fff; border-radius: .24em; padding: 0 .18em; margin: .07em .12em; box-shadow: 0 3px 0 rgba(58,43,32,.06), 0 14px 34px rgba(58,43,32,.16); }
        .t05-hero-tag { position: relative; z-index: 2; margin: clamp(18px, 3vh, 30px) auto 0; max-width: 44ch; font-size: clamp(15px, 2vw, 18px); line-height: 1.65; color: color-mix(in srgb, #3a2b20 78%, transparent); }
        .t05-hero-cta { position: relative; z-index: 2; display: inline-block; margin-top: clamp(20px, 3.5vh, 34px); background: var(--sf-accent); color: var(--sf-accent-fg); font-weight: 800; font-size: 14.5px; text-decoration: none; border: 4px solid #fff; border-radius: 999px; padding: 13px 28px; box-shadow: 0 8px 22px rgba(58,43,32,.22); transition: transform .4s cubic-bezier(.34,1.56,.64,1); }
        .t05-hero-cta:hover { transform: scale(1.07) rotate(-2deg); }
        .t05-nametag { display: inline-block; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; background: #fff; color: #3a2b20; font-family: inherit; font-size: 12px; font-weight: 800; text-decoration: none; border-radius: 999px; padding: 6px 14px; box-shadow: 0 4px 12px rgba(58,43,32,.16); transition: transform .35s cubic-bezier(.34,1.56,.64,1), background .2s ease, color .2s ease; }
        a.t05-nametag:hover { background: var(--sf-accent); color: var(--sf-accent-fg); transform: scale(1.1) rotate(0deg) !important; }
        @media (max-width: 640px) {
          .t05-hero { min-height: 88svh; }
          .t05-nametag { max-width: 118px; font-size: 10.5px; padding: 5px 10px; }
        }

        /* ── menu board ────────────────────────────────────────────────────── */
        .t05-menu-sec { background: var(--t05-tint); padding: clamp(18px, 3vw, 40px) 0 clamp(56px, 7vw, 96px); scroll-margin-top: 84px; }
        .t05-shell { max-width: 1200px; margin: 0 auto; padding: 0 clamp(18px, 3.5vw, 32px); }
        .t05-h2 { font-family: var(--t05-display); font-weight: 400; font-size: clamp(30px, 5vw, 52px); margin: 0; color: #3a2b20; }
        .t05-h2-badge { display: inline-block; vertical-align: middle; margin-left: 14px; transform: rotate(4deg); background: var(--sf-accent); color: var(--sf-accent-fg); font-family: var(--font-quicksand), system-ui, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; border-radius: 999px; padding: 5px 13px; box-shadow: 0 4px 10px rgba(58,43,32,.18); }
        .t05-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 258px), 1fr)); gap: clamp(18px, 2.5vw, 28px); margin-top: clamp(24px, 4vw, 44px); }
        .t05-card { position: relative; background: #fff; border: 3px dashed var(--t05-mid); border-radius: 24px; padding: 14px 14px 18px; display: flex; flex-direction: column; gap: 11px; transition: transform .45s cubic-bezier(.34,1.56,.64,1), box-shadow .45s cubic-bezier(.34,1.56,.64,1); transform: rotate(0deg); }
        .t05-card:hover { transform: scale(1.04) rotate(var(--t05-card-tilt, 1deg)); box-shadow: 0 22px 44px rgba(58,43,32,.16); }
        .t05-card-link { text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 12px; }
        .t05-card-img { display: block; aspect-ratio: 1 / 1; border-radius: 20px; overflow: hidden; background: var(--t05-tint); }
        .t05-card-name { font-family: var(--t05-display); font-weight: 400; font-size: 22px; line-height: 1.2; }
        .t05-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .t05-pill { background: var(--t05-tint); color: color-mix(in srgb, var(--sf-accent) 72%, #3a2b20); font-size: 11px; font-weight: 800; letter-spacing: .02em; border-radius: 999px; padding: 4px 11px; }
        .t05-card-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 2px; }
        .t05-price-badge { display: inline-block; background: var(--sf-accent); color: var(--sf-accent-fg); font-family: var(--t05-display); font-weight: 400; font-size: 19px; line-height: 1; border-radius: 14px; padding: 9px 14px 10px; transform: rotate(-4deg); box-shadow: 0 5px 14px rgba(58,43,32,.2); }
        .t05-card:hover .t05-price-badge { animation: t05-wobble .6s ease-in-out; }
        .t05-fave { position: absolute; top: -13px; right: 16px; z-index: 2; transform: rotate(7deg); background: #fff; color: var(--sf-accent); border: 2px solid var(--sf-accent); font-size: 10.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; border-radius: 999px; padding: 4px 11px; box-shadow: 0 4px 10px rgba(58,43,32,.14); }
        .t05-empty { font-family: var(--t05-display); font-size: clamp(20px, 3vw, 28px); color: color-mix(in srgb, #3a2b20 62%, transparent); text-align: center; padding: 48px 0; }

        /* ── marquee ───────────────────────────────────────────────────────── */
        .t05-mq-sec { padding: clamp(48px, 7vw, 96px) 0 clamp(40px, 6vw, 80px); overflow: hidden; }
        .t05-mq-label { display: table; margin: 0 auto clamp(20px, 3vw, 34px); transform: rotate(-2deg); background: #fff; border: 2px solid var(--t05-mid); border-radius: 999px; padding: 7px 18px; font-size: 11.5px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--sf-accent); box-shadow: 0 4px 12px rgba(58,43,32,.1); }
        .t05-mq-name { font-family: var(--t05-display); font-weight: 400; font-size: clamp(44px, 7vw, 96px); line-height: 1.1; color: transparent; -webkit-text-stroke: 2px var(--sf-accent); white-space: nowrap; }
        .t05-mq-star { font-size: clamp(26px, 4vw, 52px); color: var(--sf-accent); align-self: center; }

        /* ── about (speech bubble) ─────────────────────────────────────────── */
        .t05-about-sec { padding: clamp(20px, 3vw, 48px) 20px clamp(64px, 9vw, 120px); scroll-margin-top: 84px; }
        .t05-bubble { position: relative; max-width: 620px; margin: 0 auto; background: #fff; border-radius: 30px; padding: clamp(28px, 4vw, 42px); box-shadow: 0 16px 40px rgba(58,43,32,.12); }
        .t05-bubble::after { content: ""; position: absolute; bottom: -19px; left: 66px; width: 0; height: 0; border-style: solid; border-width: 20px 26px 0 0; border-color: #fff transparent transparent transparent; }
        .t05-bubble-kicker { display: inline-block; transform: rotate(-2deg); background: var(--t05-tint); color: color-mix(in srgb, var(--sf-accent) 72%, #3a2b20); font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; border-radius: 999px; padding: 5px 13px; margin-bottom: 16px; }
        .t05-bubble-text { margin: 0; font-size: 16px; line-height: 1.75; color: color-mix(in srgb, #3a2b20 86%, transparent); }
        .t05-sayhi { display: inline-block; margin: 34px 0 0 66px; background: var(--sf-accent); color: var(--sf-accent-fg); font-weight: 800; font-size: 14px; text-decoration: none; border: 4px solid #fff; border-radius: 999px; padding: 11px 24px; box-shadow: 0 8px 20px rgba(58,43,32,.2); transition: transform .4s cubic-bezier(.34,1.56,.64,1); }
        .t05-sayhi:hover { transform: scale(1.08) rotate(2deg); }

        /* ── footer ────────────────────────────────────────────────────────── */
        .t05-footer { text-align: center; padding: clamp(40px, 6vw, 64px) 20px 48px; }
        .t05-dots { display: flex; justify-content: center; gap: 10px; margin-bottom: 20px; }
        .t05-dot { width: 13px; height: 13px; border-radius: 50%; animation: t05-bounce 1.3s ease-in-out infinite; }
        .t05-dot:nth-child(1) { background: var(--sf-accent); }
        .t05-dot:nth-child(2) { background: var(--t05-mid); animation-delay: .16s; }
        .t05-dot:nth-child(3) { background: var(--t05-tint); animation-delay: .32s; }
        .t05-footer-name { font-family: var(--t05-display); font-size: 19px; color: #3a2b20; }
        .t05-footer-mira { margin-top: 8px; font-size: 11px; font-weight: 700; letter-spacing: .08em; color: color-mix(in srgb, #3a2b20 42%, transparent); }

        /* ── reduced motion: every keyframe off, everything visible ───────── */
        @media (prefers-reduced-motion: reduce) {
          .t05-pop { animation: none; opacity: 1; }
          .t05-blob { animation: none; }
          .t05-dot { animation: none; }
          .t05-brand:hover, .t05-card:hover .t05-price-badge { animation: none; }
          .t05-card, .t05-navpill, .t05-cart, .t05-hero-cta, .t05-sayhi, .t05-nametag { transition: none; }
          .t05-card:hover { transform: none; }
        }
      `}</style>

      {/* ── bouncy nav ── */}
      <header className="t05-nav">
        <div className="t05-nav-in">
          <Link href={`/s/${slug}`} className="t05-brand">{config.title}</Link>
          {showMenu && <a className="t05-navpill" href="#t05-menu">Menu</a>}
          {config.showAbout && <a className="t05-navpill" href="#t05-about">About</a>}
          {!isPreview && <CartLink slug={slug} />}
        </div>
      </header>

      <main>
        {/* ── signature: the sticker board ── */}
        <section className="t05-hero">
          {/* soft accent blobs */}
          <div className="t05-blob" aria-hidden style={{ left: "-9%", top: "-8%", width: "clamp(240px, 42vw, 560px)", aspectRatio: "1 / 1", background: "var(--t05-tint)", borderRadius: "58% 42% 55% 45% / 45% 52% 48% 55%" }} />
          <div className="t05-blob" aria-hidden style={{ right: "-11%", bottom: "-10%", width: "clamp(280px, 48vw, 640px)", aspectRatio: "1 / 1", background: "var(--t05-mid)", opacity: 0.5, borderRadius: "45% 55% 48% 52% / 55% 42% 58% 45%", animationDelay: "-6s" }} />
          <div className="t05-blob" aria-hidden style={{ left: "26%", bottom: "-16%", width: "clamp(170px, 30vw, 420px)", aspectRatio: "1 / 1", background: "var(--t05-tint)", opacity: 0.8, borderRadius: "52% 48% 60% 40% / 48% 55% 45% 52%", animationDelay: "-11s" }} />

          <h1 className="t05-hero-h1">
            {words.map((w, i) => (
              <span
                key={`${w}-${i}`}
                className="t05-word t05-pop"
                style={{ transform: `rotate(${WORD_TILT[i % WORD_TILT.length]}deg)`, animationDelay: `${0.08 + i * 0.12}s` }}
              >
                {w}
              </span>
            ))}
          </h1>
          {config.heroTagline && <p className="t05-hero-tag">{config.heroTagline}</p>}
          {showMenu && (
            <a className="t05-hero-cta t05-pop" href="#t05-menu" style={{ animationDelay: "0.5s" }}>
              See the menu ↓
            </a>
          )}

          {/* draggable die-cut product stickers */}
          {stickers.length > 0 && <StickerBoard stickers={stickers} big={bigBoard} />}
        </section>

        {/* ── menu board ── */}
        {showMenu ? (
          <>
            <Wave />
            <section className="t05-menu-sec" id="t05-menu">
              <div className="t05-shell">
                <h2 className="t05-h2">
                  The menu
                  <span className="t05-h2-badge">made fresh</span>
                </h2>
                <div className="t05-grid">
                  {products.map((p, i) => (
                    <MenuCard
                      key={p.id}
                      p={p}
                      href={hrefOf(p)}
                      i={i}
                      config={config}
                      slug={slug}
                      featured={featuredSet.has(p.id)}
                    />
                  ))}
                </div>
              </div>
            </section>
            <Wave flip />
          </>
        ) : products.length === 0 ? (
          <section className="t05-shell" style={{ paddingBottom: 24 }}>
            <p className="t05-empty">The counter is restocking — sweet things landing soon! 🍬</p>
          </section>
        ) : null}

        {/* ── fresh today marquee ── */}
        {showMarquee && (
          <section className="t05-mq-sec">
            <span className="t05-mq-label">★ fresh today ★</span>
            <Marquee speed="30s" pauseOnHover gap="2.5rem" label={`Fresh today: ${products.map((p) => p.title).join(", ")}`}>
              {names.map((n, i) => (
                <span key={`${n}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: "2.5rem" }}>
                  <span className="t05-mq-name">{n}</span>
                  <span className="t05-mq-star" aria-hidden>★</span>
                </span>
              ))}
            </Marquee>
          </section>
        )}

        {/* ── about: speech bubble ── */}
        {config.showAbout && (
          <section className="t05-about-sec" id="t05-about">
            <div style={{ maxWidth: 620, margin: "0 auto" }}>
              <div className="t05-bubble">
                <span className="t05-bubble-kicker">From the counter</span>
                <p className="t05-bubble-text">{config.about}</p>
              </div>
              {config.contactUrl && (
                <a className="t05-sayhi" href={config.contactUrl} target="_blank" rel="noopener noreferrer nofollow">
                  Say hi! 👋
                </a>
              )}
            </div>
          </section>
        )}
      </main>

      {/* ── footer: bouncing dots ── */}
      <footer className="t05-footer">
        <div className="t05-dots" aria-hidden>
          <span className="t05-dot" />
          <span className="t05-dot" />
          <span className="t05-dot" />
        </div>
        <div className="t05-footer-name">{config.title}</div>
        <div className="t05-footer-mira">Powered by Mira · {config.currency}</div>
      </footer>
    </div>
  );
}
