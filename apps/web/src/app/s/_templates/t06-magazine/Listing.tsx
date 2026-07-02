// t06-magazine — "The Issue". Contemporary fashion & apparel storefront staged
// as a magazine issue: full-viewport cover (Bodoni masthead, coverlines), then
// the SIGNATURE page-turn scroll — Contents + feature spreads sticky-stacked so
// each incoming page slides over the pinned previous one (pure CSS) — then a
// Stockists grid, an Editor's Letter, and a black back cover with a CSS barcode.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import { Price } from "../_shared/Price";
import { TEMPLATE_FONTS } from "../_shared/fonts";
import { Reveal, Parallax, SplitText } from "../../_motion";
import type { ListingProps, SfProduct } from "../_shared/types";

const F = TEMPLATE_FONTS["t06-magazine"];
const PAPER = "#fbfaf8";
const INK = "#141310";
const TOC_CAP = 10; // keeps the Contents page inside one 100svh sticky panel

const monogram = (s: string) => (s.trim()[0] || "M").toUpperCase();
const pad2 = (n: number) => String(n).padStart(2, "0");

/** description → standfirst excerpt, capped at ~30 words */
function excerpt(s: string | null, max = 30): string | null {
  if (!s) return null;
  const w = s.replace(/\s+/g, " ").trim().split(" ");
  if (w.length <= max) return w.join(" ");
  return w.slice(0, max).join(" ").replace(/[,;:]$/, "") + " …";
}

/** heroTagline → 2–3 coverline fragments (sentence split, word-chunk fallback) */
function coverlines(tagline: string): string[] {
  const t = tagline.replace(/\s+/g, " ").trim();
  if (!t) return [];
  const parts = t.split(/[.!?;]+\s*/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, 3);
  const w = t.replace(/[.!?]+$/, "").split(" ");
  if (w.length < 6) return [w.join(" ")];
  const cut = Math.ceil(w.length / 2);
  return [w.slice(0, cut).join(" "), w.slice(cut).join(" ")];
}

export default function Listing({ config, products, slug }: ListingProps) {
  const isPreview = slug.startsWith("preview");
  const showCart = !isPreview && config.checkoutEnabled;

  // feature spreads — featuredIds order first (when set), topped up to 3
  const byFeatured = config.featuredIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is SfProduct => Boolean(p));
  const pool = [...byFeatured, ...products.filter((p) => !byFeatured.some((f) => f.id === p.id))];
  const features = config.showFeatured ? pool.slice(0, Math.min(3, products.length)) : [];
  const featureIds = new Set(features.map((p) => p.id));
  const rest = products.filter((p) => !featureIds.has(p.id));

  const folio = (p: SfProduct) => pad2(products.findIndex((x) => x.id === p.id) + 1);
  const toc = products.slice(0, TOC_CAP);
  const tocHidden = products.length - toc.length;
  const showContents = products.length >= 3;

  const lines = coverlines(config.heroTagline || "");
  const chip = lines.length === 3 ? lines[2] : null;
  const bodyLines = chip ? lines.slice(0, 2) : lines;
  const hasCoverShot = Boolean(config.heroImageUrl);
  const hasStack = showContents || features.length > 0;

  return (
    <div
      className={`${F.className} t06-root`}
      style={{
        ["--sf-accent" as string]: config.accent,
        ["--sf-accent-fg" as string]: config.accentFg,
        ["--sf-accent-soft" as string]: `color-mix(in srgb, ${config.accent} 9%, ${PAPER})`,
        background: PAPER,
        color: INK,
        fontFamily: F.body,
        minHeight: "100vh",
      }}
    >
      <style>{`
        .t06-root { -webkit-font-smoothing: antialiased; }
        .t06-root a { color: inherit; }
        .t06-display { font-family: var(--font-bodoni), 'Didot', Georgia, serif; }
        .t06-kicker { font-size: 10.5px; font-weight: 600; letter-spacing: .24em; text-transform: uppercase; }
        .t06-accent { color: var(--sf-accent); }

        /* accent underline draw (background-size 0% -> 100%) */
        .t06-u { background-image: linear-gradient(var(--sf-accent), var(--sf-accent)); background-size: 0% 2px; background-repeat: no-repeat; background-position: 0 100%; padding-bottom: 2px; transition: background-size .38s cubic-bezier(.16,1,.3,1); }
        a:hover .t06-u, a:focus-visible .t06-u, .t06-ulink:hover, .t06-ulink:focus-visible { background-size: 100% 2px; }
        .t06-ulink { background-image: linear-gradient(var(--sf-accent), var(--sf-accent)); background-size: 0% 2px; background-repeat: no-repeat; background-position: 0 100%; padding-bottom: 2px; transition: background-size .38s cubic-bezier(.16,1,.3,1); text-decoration: none; }

        /* ── cover ─────────────────────────────────────────────────────────── */
        .t06-cover { position: relative; min-height: 100svh; overflow: hidden; display: flex; flex-direction: column; padding: 16px clamp(16px, 4vw, 48px) 24px; background: #fbfaf8; }
        .t06-cover-top { position: relative; z-index: 3; display: flex; justify-content: space-between; align-items: baseline; gap: 16px; border-bottom: 1px solid #141310; padding-bottom: 10px; }
        .t06-masthead { position: relative; z-index: 2; font-family: var(--font-bodoni), 'Didot', Georgia, serif; font-size: clamp(52px, 13vw, 170px); font-weight: 500; letter-spacing: -.015em; line-height: .92; text-transform: uppercase; margin: clamp(10px, 2.5vh, 26px) 0 0; }
        .t06-subhead { position: relative; z-index: 2; font-family: var(--font-bodoni), Georgia, serif; font-style: italic; font-size: clamp(17px, 2.4vw, 27px); margin-top: 10px; max-width: 30ch; }
        .t06-cover-img { position: absolute; z-index: 1; top: 13svh; bottom: 0; right: -4vw; width: 56vw; overflow: hidden; }
        .t06-covlines { position: relative; z-index: 2; display: flex; flex-direction: column; gap: clamp(14px, 3vh, 28px); margin-top: clamp(24px, 6vh, 64px); max-width: 40vw; }
        .t06-covline { display: flex; align-items: baseline; gap: 10px; font-size: 11.5px; font-weight: 600; letter-spacing: .22em; text-transform: uppercase; line-height: 1.8; max-width: 32ch; }
        .t06-covlines > div:nth-child(2) .t06-covline { margin-left: clamp(0px, 6vw, 88px); }
        .t06-covdot { flex: none; width: 7px; height: 7px; background: var(--sf-accent); transform: translateY(-1px); }
        .t06-covchip { position: absolute; z-index: 2; right: clamp(12px, 4vw, 48px); bottom: 13svh; background: #fbfaf8; padding: 12px 16px; max-width: min(30ch, 60vw); box-shadow: 0 1px 0 #141310; }
        .t06-stamp { position: absolute; z-index: 3; top: clamp(64px, 10vh, 96px); right: clamp(16px, 4vw, 48px); width: 92px; height: 92px; border: 1.5px solid var(--sf-accent); border-radius: 50%; color: var(--sf-accent); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; background: color-mix(in srgb, #fbfaf8 72%, transparent); animation: t06-drift 7s ease-in-out infinite; }
        .t06-cover-foot { position: relative; z-index: 2; margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; padding-top: 28px; }
        .t06-hint-arrow { display: inline-block; animation: t06-nudge 2.2s ease-in-out infinite; }
        @keyframes t06-drift { 0%, 100% { transform: rotate(-8deg) translateY(0); } 50% { transform: rotate(-8deg) translateY(-7px); } }
        @keyframes t06-nudge { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(5px); } }

        /* pure-type cover (no hero image) — the Bodoni flex */
        .t06-cover--type .t06-masthead { font-size: clamp(56px, 16vw, 210px); }
        .t06-cover--type .t06-covlines { max-width: 44ch; }
        .t06-cover--type .t06-covline { font-family: var(--font-bodoni), Georgia, serif; font-style: italic; text-transform: none; letter-spacing: 0; font-weight: 500; font-size: clamp(20px, 3.4vw, 34px); line-height: 1.25; max-width: 26ch; }
        .t06-cover--type .t06-covdot { width: 9px; height: 9px; }

        /* ── signature: sticky page-turn stack ─────────────────────────────── */
        .t06-stack { position: relative; }
        .t06-page { position: sticky; top: 0; min-height: 100svh; display: flex; flex-direction: column; box-shadow: 0 -26px 60px rgba(22, 17, 8, .16); }

        /* contents */
        .t06-contents-in { flex: 1; display: flex; flex-direction: column; padding: clamp(20px, 4vw, 56px) clamp(16px, 4vw, 48px) clamp(28px, 5vh, 64px); }
        .t06-contents-title { font-family: var(--font-bodoni), Georgia, serif; font-style: italic; font-weight: 500; font-size: clamp(44px, 8vw, 108px); line-height: .95; margin: 12px 0 clamp(18px, 4vh, 44px); }
        .t06-toc { columns: 2; column-gap: clamp(36px, 6vw, 96px); list-style: none; margin: 0; padding: 0; }
        .t06-toc li { break-inside: avoid; }
        .t06-toc-row { display: grid; grid-template-columns: 34px 1fr auto; align-items: baseline; gap: 14px; padding: 13px 0; border-bottom: 1px solid rgba(20, 19, 16, .16); text-decoration: none; }
        .t06-toc-title { font-family: var(--font-bodoni), Georgia, serif; font-size: clamp(17px, 1.8vw, 24px); line-height: 1.12; }
        .t06-toc-row:hover .t06-toc-title { font-style: italic; }
        .t06-toc-price { font-size: 12px; color: rgba(20, 19, 16, .62); letter-spacing: .04em; }

        /* feature spreads */
        .t06-spread-in { flex: 1; display: grid; grid-template-columns: 55fr 45fr; }
        .t06-spread--flip .t06-spread-media { order: 2; }
        .t06-spread--flip .t06-spread-txt { order: 1; }
        .t06-spread-media { position: relative; overflow: hidden; min-height: 100svh; }
        .t06-spread-txt { display: flex; flex-direction: column; justify-content: center; padding: clamp(28px, 5vw, 76px) clamp(20px, 4.5vw, 72px); }
        .t06-headline { font-family: var(--font-bodoni), Georgia, serif; font-size: clamp(34px, 5vw, 72px); font-weight: 500; line-height: .98; letter-spacing: -.015em; margin: 14px 0 16px; }
        .t06-standfirst { font-size: 14.5px; line-height: 1.78; color: rgba(20, 19, 16, .8); max-width: 46ch; margin: 6px 0 0; }
        .t06-standfirst::first-letter { font-family: var(--font-bodoni), Georgia, serif; font-weight: 500; font-size: 3.1em; line-height: .78; float: left; padding: .06em .14em 0 0; color: #141310; }
        .t06-spread-cta { display: flex; align-items: baseline; flex-wrap: wrap; gap: 12px 26px; margin-top: 28px; }
        .t06-spread-price { font-family: var(--font-bodoni), Georgia, serif; font-style: italic; font-size: 21px; }
        .t06-typeblock { min-height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 22px; padding: clamp(24px, 4vw, 64px); border-right: 1px solid rgba(20, 19, 16, .18); }
        .t06-typeblock-title { font-family: var(--font-bodoni), Georgia, serif; font-style: italic; font-weight: 500; font-size: clamp(40px, 6.5vw, 96px); line-height: .96; }
        .t06-typeblock-rule { width: 64px; height: 2px; background: var(--sf-accent); }

        /* stockists */
        .t06-stockists { position: relative; background: #fbfaf8; border-top: 1px solid #141310; padding: clamp(28px, 5vw, 72px) clamp(16px, 4vw, 48px) clamp(48px, 7vw, 96px); }
        .t06-secthead { display: flex; align-items: baseline; gap: 18px; margin-bottom: clamp(20px, 3.5vw, 40px); }
        .t06-secthead-rule { flex: 1; height: 1px; background: rgba(20, 19, 16, .22); }
        .t06-stock-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(22px, 3.5vw, 44px) clamp(14px, 2.4vw, 28px); }
        .t06-stock-card { display: block; text-decoration: none; }
        .t06-stock-imgwrap { aspect-ratio: 3 / 4; overflow: hidden; background: var(--sf-accent-soft); }
        .t06-stock-imgwrap img { width: 100%; height: 100%; transition: transform .65s cubic-bezier(.16,1,.3,1); }
        .t06-stock-card:hover .t06-stock-imgwrap img { transform: scale(1.045); }
        .t06-stock-cap { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-top: 10px; font-size: 12px; letter-spacing: .05em; }
        .t06-stock-card:hover .t06-stock-name { font-style: italic; }
        .t06-stock-type { aspect-ratio: 3 / 4; border: 1px solid rgba(20, 19, 16, .3); display: flex; flex-direction: column; justify-content: space-between; padding: 16px; background: #fbfaf8; }
        .t06-stock-type-title { font-family: var(--font-bodoni), Georgia, serif; font-style: italic; font-weight: 500; font-size: clamp(22px, 3vw, 34px); line-height: 1.02; }

        /* editor's letter */
        .t06-editor { background: #fbfaf8; border-top: 1px solid rgba(20, 19, 16, .22); padding: clamp(52px, 10vh, 120px) clamp(16px, 4vw, 48px); }
        .t06-editor-in { max-width: 620px; margin: 0 auto; }
        .t06-letter { font-family: var(--font-bodoni), Georgia, serif; font-style: italic; font-size: 20px; line-height: 1.75; margin: 18px 0 0; }
        .t06-sig-rule { width: 56px; height: 2px; background: var(--sf-accent); margin: 30px 0 12px; }
        .t06-sig { font-family: var(--font-bodoni), Georgia, serif; font-style: italic; font-size: 26px; }

        /* back cover */
        .t06-back { background: #12100d; color: #fbfaf8; padding: clamp(44px, 9vh, 104px) clamp(16px, 4vw, 48px) clamp(24px, 5vh, 52px); display: flex; flex-direction: column; gap: clamp(40px, 9vh, 96px); }
        .t06-back-title { font-family: var(--font-bodoni), 'Didot', Georgia, serif; font-size: clamp(40px, 9vw, 120px); font-weight: 500; text-transform: uppercase; line-height: .9; letter-spacing: -.01em; }
        .t06-back-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; flex-wrap: wrap; }
        .t06-barcode { width: 122px; height: 48px; background: repeating-linear-gradient(90deg, #fbfaf8 0 2px, transparent 2px 4px, #fbfaf8 4px 7px, transparent 7px 9px, #fbfaf8 9px 10px, transparent 10px 14px); }
        .t06-back a { color: #fbfaf8; }

        /* empty issue */
        .t06-empty { min-height: 46svh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; border-top: 1px solid rgba(20, 19, 16, .22); padding: 48px 20px; text-align: center; }

        /* ── 390px / mobile ────────────────────────────────────────────────── */
        @media (max-width: 880px) {
          .t06-cover-top { order: 0; }
          .t06-masthead { order: 1; }
          .t06-subhead { order: 2; }
          .t06-cover-img { order: 3; position: relative; inset: auto; top: auto; right: auto; width: calc(100% + 32px); margin: 18px -16px 0; height: 46svh; z-index: 1; }
          .t06-covchip { order: 4; position: relative; right: auto; bottom: auto; align-self: flex-start; margin: -30px 0 0 10px; }
          .t06-covlines { order: 5; max-width: none; margin-top: 22px; }
          .t06-cover-foot { order: 6; }
          .t06-stamp { top: 21svh; width: 78px; height: 78px; }
          .t06-spread-in { grid-template-columns: 1fr; }
          .t06-spread-media, .t06-spread--flip .t06-spread-media { order: 0; min-height: 38svh; height: 38svh; }
          .t06-spread-txt, .t06-spread--flip .t06-spread-txt { order: 1; justify-content: flex-start; padding: 22px 18px 36px; }
          .t06-standfirst { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
          .t06-typeblock { border-right: none; border-bottom: 1px solid rgba(20, 19, 16, .18); min-height: 38svh; }
          .t06-toc { columns: 1; }
          .t06-toc-row { padding: 10px 0; }
          .t06-stock-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (prefers-reduced-motion: reduce) {
          .t06-stamp, .t06-hint-arrow { animation: none; }
          .t06-root * { transition-duration: .01ms !important; }
          .t06-stock-card:hover .t06-stock-imgwrap img { transform: none; }
        }
      `}</style>

      {/* ── 1 · COVER ──────────────────────────────────────────────────────── */}
      <section className={`t06-cover${hasCoverShot ? "" : " t06-cover--type"}`}>
        <div className="t06-cover-top">
          <span className="t06-kicker t06-accent">Issue 001 — The Collection</span>
          {showCart ? (
            <Link href={`/s/${slug}/cart`} className="t06-kicker t06-ulink">Bag</Link>
          ) : (
            <span className="t06-kicker" style={{ color: "rgba(20,19,16,.55)" }}>Digital edition</span>
          )}
        </div>

        <div className="t06-stamp" aria-hidden>
          <span style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: ".3em", textTransform: "uppercase" }}>The Issue</span>
          <span className="t06-display" style={{ fontSize: 26, lineHeight: 1 }}>001</span>
        </div>

        <SplitText by="chars" as="h1" className="t06-masthead" stagger={0.035}>
          {config.title}
        </SplitText>
        {config.heroHeadline && config.heroHeadline !== config.title ? (
          <Reveal delay={0.35} y={16}>
            <div className="t06-subhead">{config.heroHeadline}</div>
          </Reveal>
        ) : null}

        {hasCoverShot ? (
          <div className="t06-cover-img">
            <StoreImage src={config.heroImageUrl} alt={config.title} monogram={monogram(config.title)} eager style={{ width: "100%", height: "100%" }} />
          </div>
        ) : null}

        {bodyLines.length > 0 ? (
          <div className="t06-covlines">
            {bodyLines.map((l, i) => (
              <Reveal key={l} delay={0.5 + i * 0.14} y={18}>
                <div className="t06-covline">
                  <span className="t06-covdot" aria-hidden />
                  <span>{l}</span>
                </div>
              </Reveal>
            ))}
          </div>
        ) : null}
        {chip ? (
          <div className="t06-covchip">
            <div className="t06-covline">
              <span className="t06-covdot" aria-hidden />
              <span>{chip}</span>
            </div>
          </div>
        ) : null}

        <div className="t06-cover-foot">
          <span className="t06-kicker" style={{ color: "rgba(20,19,16,.6)" }}>
            Turn the page <span className="t06-hint-arrow" aria-hidden>↓</span>
          </span>
          {products.length > 0 ? (
            <span className="t06-kicker t06-accent">{pad2(products.length)} pieces inside</span>
          ) : null}
        </div>
      </section>

      {/* ── 2 · SIGNATURE — sticky page-turn stack ─────────────────────────── */}
      {hasStack ? (
        <div className="t06-stack">
          {/* 3 · contents page */}
          {showContents ? (
            <section className="t06-page" style={{ background: PAPER, zIndex: 1 }} aria-label="Contents">
              <div className="t06-contents-in">
                <Reveal y={14}>
                  <span className="t06-kicker t06-accent">Contents — Issue 001</span>
                </Reveal>
                <h2 className="t06-contents-title">
                  <SplitText by="words" as="span">Contents</SplitText>
                </h2>
                <ol className="t06-toc">
                  {toc.map((p) => (
                    <li key={p.id}>
                      <Link href={`/s/${slug}/p/${p.slug ?? p.id}`} className="t06-toc-row">
                        <span className="t06-kicker t06-accent" style={{ letterSpacing: ".18em" }}>{folio(p)}</span>
                        <span className="t06-toc-title t06-u">{p.title}</span>
                        <Price minor={p.priceMinor} currency={p.currency} fallback={p.priceText} className="t06-toc-price" />
                      </Link>
                    </li>
                  ))}
                </ol>
                {tocHidden > 0 ? (
                  <div className="t06-kicker" style={{ marginTop: 18, color: "rgba(20,19,16,.55)" }}>
                    + {tocHidden} more — see stockists
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* 4 · feature spreads */}
          {features.map((p, i) => {
            const hasImg = Boolean(p.imageUrl || p.images?.length);
            const shot = p.images?.[0] ?? p.imageUrl;
            const stand = excerpt(p.description);
            return (
              <section
                key={p.id}
                className={`t06-page t06-spread${i % 2 === 1 ? " t06-spread--flip" : ""}`}
                style={{ background: i % 2 === 0 ? "#f5f2ec" : PAPER, zIndex: i + 2 }}
                aria-label={`Feature — ${p.title}`}
              >
                <div className="t06-spread-in">
                  <div className="t06-spread-media">
                    {hasImg ? (
                      <Link href={`/s/${slug}/p/${p.slug ?? p.id}`} aria-label={p.title}>
                        <Parallax speed={8} style={{ position: "absolute", inset: "-10% 0" }}>
                          <StoreImage src={shot} alt={p.title} monogram={monogram(p.title)} style={{ width: "100%", height: "100%" }} />
                        </Parallax>
                      </Link>
                    ) : (
                      // empty-state: text-only feature — giant italic Bodoni on a full block
                      <div className="t06-typeblock">
                        <span className="t06-kicker t06-accent">Not yet photographed</span>
                        <div className="t06-typeblock-title">{p.title}</div>
                        <div className="t06-typeblock-rule" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="t06-spread-txt">
                    <Reveal y={14}>
                      <span className="t06-kicker t06-accent">Feature — No. {folio(p)}</span>
                    </Reveal>
                    <h2 className="t06-headline">
                      <SplitText by="words" as="span">{p.title}</SplitText>
                    </h2>
                    {p.subtitle ? (
                      <Reveal delay={0.1} y={12}>
                        <div className="t06-display" style={{ fontStyle: "italic", fontSize: 16, color: "rgba(20,19,16,.72)" }}>{p.subtitle}</div>
                      </Reveal>
                    ) : null}
                    {stand ? (
                      <Reveal delay={0.16} y={14}>
                        <p className="t06-standfirst">{stand}</p>
                      </Reveal>
                    ) : null}
                    <Reveal delay={0.22} y={12}>
                      <div className="t06-spread-cta">
                        <Price minor={p.priceMinor} currency={p.currency} fallback={p.priceText} className="t06-spread-price" />
                        <AddToCart
                          product={p}
                          config={config}
                          slug={slug}
                          variant="compact"
                          fx="stamp"
                          label={config.buyLabel}
                          addedLabel={`Added — No. ${folio(p)}`}
                          style={{
                            background: "transparent",
                            color: INK,
                            borderRadius: 0,
                            padding: "8px 2px",
                            fontSize: 11.5,
                            fontWeight: 600,
                            letterSpacing: ".18em",
                            textTransform: "uppercase",
                            fontFamily: F.body,
                            boxShadow: "inset 0 -2px 0 var(--sf-accent)",
                          }}
                        />
                        <Link href={`/s/${slug}/p/${p.slug ?? p.id}`} className="t06-kicker t06-ulink" style={{ color: "rgba(20,19,16,.6)" }}>
                          See the piece →
                        </Link>
                      </div>
                    </Reveal>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      {/* ── 5 · STOCKISTS (ends the sticky stack, normal scroll) ───────────── */}
      {config.showDiscover && rest.length > 0 ? (
        <section className="t06-stockists" aria-label="Stockists">
          <div className="t06-secthead">
            <span className="t06-kicker t06-accent">Stockists</span>
            <div className="t06-secthead-rule" aria-hidden />
            <span className="t06-kicker" style={{ color: "rgba(20,19,16,.5)" }}>{pad2(rest.length)} pieces</span>
          </div>
          <div className="t06-stock-grid">
            {rest.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 0.08} y={22}>
                <Link href={`/s/${slug}/p/${p.slug ?? p.id}`} className="t06-stock-card">
                  {p.imageUrl || p.images?.length ? (
                    <div className="t06-stock-imgwrap">
                      <StoreImage src={p.images?.[0] ?? p.imageUrl} alt={p.title} monogram={monogram(p.title)} style={{ width: "100%", height: "100%" }} />
                    </div>
                  ) : (
                    // empty-state: text-only tile
                    <div className="t06-stock-type">
                      <span className="t06-kicker t06-accent">No. {folio(p)}</span>
                      <span className="t06-stock-type-title">{p.title}</span>
                      <span className="t06-kicker" style={{ color: "rgba(20,19,16,.5)" }}>Text only — this issue</span>
                    </div>
                  )}
                  <div className="t06-stock-cap">
                    <span className="t06-stock-name t06-u" style={{ fontWeight: 500 }}>{p.title}</span>
                    <Price minor={p.priceMinor} currency={p.currency} fallback={p.priceText} style={{ color: "rgba(20,19,16,.62)", flex: "none" }} />
                  </div>
                  {p.subtitle ? (
                    <div style={{ fontSize: 11, color: "rgba(20,19,16,.5)", marginTop: 3, letterSpacing: ".04em" }}>{p.subtitle}</div>
                  ) : null}
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {products.length === 0 ? (
        <div className="t06-empty">
          <span className="t06-kicker t06-accent">Issue 001 — In production</span>
          <div className="t06-display" style={{ fontStyle: "italic", fontSize: "clamp(24px, 5vw, 40px)" }}>
            This issue is still at the printers.
          </div>
        </div>
      ) : null}

      {/* ── 6 · EDITOR'S LETTER ────────────────────────────────────────────── */}
      {config.showAbout && config.about ? (
        <section className="t06-editor" aria-label="Editor's letter">
          <div className="t06-editor-in">
            <Reveal y={16}>
              <span className="t06-kicker t06-accent">From the editor</span>
            </Reveal>
            <Reveal delay={0.08} y={18}>
              <p className="t06-letter">{config.about}</p>
            </Reveal>
            <Reveal delay={0.16} y={14}>
              <div>
                <div className="t06-sig-rule" aria-hidden />
                <div className="t06-sig">{config.title}</div>
                {config.contactUrl ? (
                  <div style={{ marginTop: 16 }}>
                    <a href={config.contactUrl} target="_blank" rel="noopener noreferrer" className="t06-kicker t06-ulink t06-accent">
                      Write to the editor
                    </a>
                  </div>
                ) : null}
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* ── 7 · BACK COVER ─────────────────────────────────────────────────── */}
      <footer className="t06-back">
        <div className="t06-back-title">{config.title}</div>
        <div className="t06-back-row">
          <div>
            <div className="t06-barcode" aria-hidden />
            <div className="t06-kicker" style={{ marginTop: 10, color: "rgba(251,250,248,.72)" }}>
              Published digitally · Issue 001
            </div>
          </div>
          <div style={{ display: "flex", gap: 26, alignItems: "baseline" }}>
            {showCart ? (
              <Link href={`/s/${slug}/cart`} className="t06-kicker t06-ulink">Bag</Link>
            ) : null}
            <span className="t06-kicker" style={{ color: "rgba(251,250,248,.45)" }}>Powered by Mira</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
