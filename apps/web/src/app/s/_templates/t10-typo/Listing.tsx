// t10-typo — "The Index"
// Home goods / ceramics / studio objects. The flagship NO-IMAGE template:
// typography IS the product photography. Anybody VARIABLE (its width axis is
// the signature — font-variation-settings "wdth" 50–150) set against
// Newsreader italic annotations, on bone paper with near-black ink.
// Signature: the Type Index — products are full-width text rows; the active
// row floods with the owner accent from the left, the name stretches wide on
// its width axis, and an image plate wipes open beside it.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import { Price } from "../_shared/Price";
import { TEMPLATE_FONTS } from "../_shared/fonts";
import { Marquee, Reveal } from "../../_motion";
import CartLink from "./CartLink";
import type { ListingProps, SfProduct } from "../_shared/types";

const BONE = "#f2efe9";
const INK = "#171512";
const FONTS = TEMPLATE_FONTS["t10-typo"];

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();
const indexNo = (i: number) => String(i + 1).padStart(2, "0");

export default function Listing({ config, products, slug }: ListingProps) {
  const isPreview = slug.startsWith("preview");
  const hrefOf = (p: SfProduct) => `/s/${slug}/p/${p.slug ?? p.id}`;
  const featuredSet = new Set(config.showFeatured ? config.featuredIds : []);
  const count = products.length;
  const solo = count === 1 ? products[0] : null;

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

        /* ── nav: a thin index line ─────────────────────────────────────── */
        .t10-nav { position: sticky; top: 0; z-index: 40; border-top: 2px solid #171512; border-bottom: 1px solid rgba(23,21,18,.3); background: color-mix(in srgb, #f2efe9 90%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
        .t10-nav-in { display: flex; align-items: baseline; justify-content: space-between; gap: 18px; padding: 11px clamp(14px, 3vw, 32px); }
        .t10-nav-meta { font-family: var(--t10-body); font-style: italic; font-size: 13.5px; color: rgba(23,21,18,.72); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .t10-nav-links { display: flex; gap: 18px; flex: 0 0 auto; }
        .t10-navlink { font-family: var(--t10-display); font-variation-settings: "wdth" 110; font-size: 10.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: inherit; text-decoration: none; transition: color .25s ease, font-variation-settings .4s ease; }
        .t10-navlink:hover { color: var(--sf-accent); font-variation-settings: "wdth" 140; }

        /* ── hero: the title at full stretch ────────────────────────────── */
        .t10-hero { padding: clamp(44px, 8vw, 96px) clamp(10px, 2vw, 26px) clamp(26px, 4vw, 52px); }
        .t10-hero-title { margin: 0; font-family: var(--t10-display); font-weight: 800; font-variation-settings: "wdth" 150; font-size: clamp(44px, 12vw, 150px); line-height: .92; letter-spacing: -0.015em; text-transform: uppercase; animation: t10-hero-in 1.15s cubic-bezier(.16,1,.3,1) both; }
        @keyframes t10-hero-in {
          from { font-variation-settings: "wdth" 60; opacity: 0; }
          to   { font-variation-settings: "wdth" 150; opacity: 1; }
        }
        .t10-hero-tag { font-family: var(--t10-body); font-style: italic; font-size: clamp(16px, 2.1vw, 21px); line-height: 1.55; color: rgba(23,21,18,.75); max-width: 46ch; margin: clamp(16px, 2.5vw, 28px) 0 0; }
        .t10-hero-cta { display: inline-block; margin-top: 18px; font-family: var(--t10-body); font-style: italic; font-size: 14.5px; color: inherit; text-decoration: underline; text-decoration-color: var(--sf-accent); text-decoration-thickness: 1px; text-underline-offset: 5px; transition: color .25s ease; }
        .t10-hero-cta:hover { color: var(--sf-accent); }

        /* ── outline marquee: stroked type, width axis oscillating ──────── */
        .t10-marq-sec { border-top: 1px solid rgba(23,21,18,.26); border-bottom: 1px solid rgba(23,21,18,.26); padding: clamp(16px, 3vw, 30px) 0; }
        .t10-marq-item { display: inline-block; font-family: var(--t10-display); font-weight: 800; font-size: clamp(44px, 8vw, 120px); line-height: 1.05; text-transform: uppercase; white-space: nowrap; color: transparent; -webkit-text-stroke: 1.5px var(--sf-accent); animation: t10-osc 4s ease-in-out infinite alternate; }
        @keyframes t10-osc {
          from { font-variation-settings: "wdth" 75; }
          to   { font-variation-settings: "wdth" 125; }
        }

        /* ── the Type Index (signature) ─────────────────────────────────── */
        .t10-index-head { display: flex; align-items: baseline; gap: 16px; padding: clamp(30px, 5vw, 60px) clamp(14px, 3vw, 32px) clamp(14px, 2vw, 22px); }
        .t10-label { font-family: var(--t10-display); font-variation-settings: "wdth" 120; font-size: 11px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: rgba(23,21,18,.62); }
        .t10-head-rule { flex: 1; align-self: center; height: 1px; background: var(--sf-accent); opacity: .5; }
        .t10-head-count { font-family: var(--t10-body); font-style: italic; font-size: 13.5px; color: var(--sf-accent); white-space: nowrap; }

        .t10-rowwrap { border-top: 1px solid rgba(23,21,18,.24); position: relative; z-index: 1; }
        .t10-row { position: relative; display: grid; grid-template-columns: clamp(44px, 7vw, 96px) minmax(0, 1fr) auto; align-items: center; column-gap: clamp(10px, 2.4vw, 28px); padding: clamp(20px, 3.4vw, 38px) clamp(14px, 3vw, 32px); text-decoration: none; color: inherit; overflow: hidden; }
        .t10-row::before { content: ""; position: absolute; inset: 0; background: var(--sf-accent); transform: scaleX(0); transform-origin: left center; transition: transform .35s cubic-bezier(.16,1,.3,1); }
        .t10-row > * { position: relative; z-index: 1; }

        .t10-no { font-family: var(--t10-body); font-style: italic; font-size: clamp(13px, 1.6vw, 17px); color: rgba(23,21,18,.55); transition: color .3s ease; }
        .t10-name { display: block; font-family: var(--t10-display); font-weight: 800; font-variation-settings: "wdth" 100; font-size: clamp(28px, 7vw, 110px); line-height: .95; letter-spacing: -0.01em; text-transform: uppercase; transition: font-variation-settings .5s cubic-bezier(.16,1,.3,1), color .3s ease; animation: t10-name-in .9s ease-out backwards; }
        @keyframes t10-name-in {
          from { font-variation-settings: "wdth" 60; }
          to   { font-variation-settings: "wdth" 100; }
        }
        .t10-star { color: var(--sf-accent); font-size: .32em; vertical-align: super; letter-spacing: 0; transition: color .3s ease; }
        .t10-ann { display: block; margin-top: 7px; font-family: var(--t10-body); font-style: italic; font-size: clamp(13px, 1.7vw, 16px); line-height: 1.5; color: rgba(23,21,18,.6); transition: color .3s ease; }
        .t10-price { justify-self: end; font-family: var(--t10-body); font-style: italic; font-size: clamp(15px, 2.2vw, 26px); white-space: nowrap; color: rgba(23,21,18,.85); transition: color .3s ease; }

        /* image plate — wipes open beside the name on hover (desktop) */
        .t10-plate { position: absolute; z-index: 2; top: 50%; right: clamp(120px, 18vw, 280px); width: 140px; height: 172px; transform: translateY(-50%) rotate(-2deg); padding: 6px; background: #fffdf7; border: 1px solid rgba(23,21,18,.35); box-shadow: 0 16px 36px rgba(23,21,18,.24); clip-path: inset(0 100% 0 0); transition: clip-path .45s cubic-bezier(.16,1,.3,1); pointer-events: none; }

        @media (hover: hover) and (pointer: fine) {
          .t10-row:hover::before { transform: scaleX(1); }
          .t10-row:hover .t10-name { font-variation-settings: "wdth" 122; color: var(--sf-accent-fg); }
          .t10-row:hover .t10-no, .t10-row:hover .t10-ann, .t10-row:hover .t10-price, .t10-row:hover .t10-star { color: var(--sf-accent-fg); }
          .t10-row:hover .t10-plate { clip-path: inset(0 0 0 0); }
        }
        .t10-row:focus-visible::before { transform: scaleX(1); }
        .t10-row:focus-visible .t10-name { font-variation-settings: "wdth" 122; color: var(--sf-accent-fg); }
        .t10-row:focus-visible .t10-no, .t10-row:focus-visible .t10-ann, .t10-row:focus-visible .t10-price, .t10-row:focus-visible .t10-star { color: var(--sf-accent-fg); }
        .t10-row:focus-visible .t10-plate { clip-path: inset(0 0 0 0); }

        /* mobile: no hover — small always-visible thumbnail on the right */
        @media (max-width: 767px) {
          .t10-row { grid-template-columns: minmax(0, 1fr) 48px; grid-template-areas: "no plate" "main plate" "price plate"; row-gap: 6px; column-gap: 16px; }
          .t10-row--flat { grid-template-columns: minmax(0, 1fr); grid-template-areas: "no" "main" "price"; }
          .t10-no { grid-area: no; }
          .t10-main { grid-area: main; }
          .t10-price { grid-area: price; justify-self: start; }
          .t10-plate { grid-area: plate; position: static; width: 48px; height: 48px; transform: none; clip-path: none; padding: 2px; box-shadow: none; align-self: center; }
        }

        /* ghost pattern — a single object echoes as faint outline lines */
        .t10-ghost { position: absolute; inset: 0; overflow: hidden; pointer-events: none; display: flex; flex-direction: column; justify-content: center; gap: 0; opacity: .08; z-index: 0; }
        .t10-ghost span { font-family: var(--t10-display); font-weight: 800; font-variation-settings: "wdth" 150; font-size: clamp(64px, 17vw, 240px); line-height: .92; text-transform: uppercase; white-space: nowrap; color: transparent; -webkit-text-stroke: 1.5px #171512; }
        .t10-ghost span:nth-child(2) { margin-left: -6vw; }
        .t10-ghost span:nth-child(3) { margin-left: 4vw; }

        /* empty state — designed for it */
        .t10-empty { padding: clamp(48px, 8vw, 96px) clamp(14px, 3vw, 32px) clamp(64px, 10vw, 120px); border-top: 1px solid rgba(23,21,18,.24); }
        .t10-empty-big { font-family: var(--t10-display); font-weight: 800; font-variation-settings: "wdth" 150; font-size: clamp(56px, 16vw, 200px); line-height: .92; text-transform: uppercase; color: transparent; -webkit-text-stroke: 1.5px var(--sf-accent); margin: 0; }
        .t10-empty-note { font-family: var(--t10-body); font-style: italic; font-size: clamp(16px, 2vw, 20px); color: rgba(23,21,18,.65); margin: 20px 0 0; max-width: 44ch; }

        /* ── studio note ────────────────────────────────────────────────── */
        .t10-note-sec { padding: clamp(56px, 9vw, 110px) clamp(14px, 3vw, 32px); border-top: 1px solid rgba(23,21,18,.24); scroll-margin-top: 64px; }
        .t10-note-lead { font-family: var(--t10-body); font-style: italic; font-weight: 420; font-size: clamp(22px, 3.4vw, 34px); line-height: 1.4; letter-spacing: -0.005em; max-width: 34ch; margin: 18px 0 0; }
        .t10-note-rest { font-size: 16px; line-height: 1.7; color: rgba(23,21,18,.78); max-width: 60ch; margin: 18px 0 0; white-space: pre-line; }
        .t10-note-contact { display: inline-block; margin-top: 24px; font-family: var(--t10-body); font-style: italic; font-size: 15px; color: inherit; text-decoration: underline; text-decoration-color: var(--sf-accent); text-decoration-thickness: 1px; text-underline-offset: 5px; transition: color .25s ease; }
        .t10-note-contact:hover { color: var(--sf-accent); }

        /* ── colophon ───────────────────────────────────────────────────── */
        .t10-colophon { border-top: 1px solid rgba(23,21,18,.24); padding: 18px clamp(14px, 3vw, 32px) 28px; display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; font-family: var(--t10-body); font-style: italic; font-size: 12.5px; color: rgba(23,21,18,.55); }

        @media (prefers-reduced-motion: reduce) {
          .t10-hero-title, .t10-name, .t10-marq-item { animation: none !important; }
          .t10-row::before, .t10-name, .t10-plate, .t10-navlink, .t10-no, .t10-ann, .t10-price, .t10-star, .t10-hero-cta, .t10-note-contact { transition: none !important; }
        }
      `}</style>

      {/* ── 1 · index line nav ── */}
      <header className="t10-nav">
        <div className="t10-nav-in">
          <span className="t10-nav-meta">
            {config.title} · {count} object{count === 1 ? "" : "s"} · {config.currency}
          </span>
          <nav className="t10-nav-links" aria-label="Store">
            <a className="t10-navlink" href="#t10-index">Index</a>
            {config.showAbout && <a className="t10-navlink" href="#t10-note">Note</a>}
            {config.contactUrl && (
              <a className="t10-navlink" href={config.contactUrl} target="_blank" rel="noopener noreferrer nofollow">Contact</a>
            )}
            {!isPreview && <CartLink slug={slug} className="t10-navlink" />}
          </nav>
        </div>
      </header>

      <main>
        {/* ── 2 · hero: title at maximum stretch ── */}
        <section className="t10-hero">
          <h1 className="t10-hero-title">{config.title}</h1>
          {config.heroTagline && (
            <Reveal delay={0.45} y={16}>
              <p className="t10-hero-tag">{config.heroTagline}</p>
            </Reveal>
          )}
          <Reveal delay={0.6} y={12}>
            <a className="t10-hero-cta" href="#t10-index">Browse the index ↓</a>
          </Reveal>
        </section>

        {/* ── 3 · outline marquee, width axis oscillating as it travels ── */}
        {config.showDiscover && (
          <section className="t10-marq-sec" aria-hidden>
            <Marquee speed="34s" gap="0px" label={config.heroHeadline}>
              {[0, 1, 2].map((i) => (
                <span key={i} className="t10-marq-item" style={{ animationDelay: `${i * -1.33}s` }}>
                  {config.heroHeadline}&nbsp;—&nbsp;
                </span>
              ))}
            </Marquee>
          </section>
        )}

        {/* ── 4 · the Type Index (signature) ── */}
        <section id="t10-index" style={{ position: "relative", scrollMarginTop: 64 }}>
          <div className="t10-index-head">
            <span className="t10-label">The Index</span>
            <span className="t10-head-rule" aria-hidden />
            <span className="t10-head-count">
              {count === 0 ? "between firings" : `${indexNo(count - 1)} entries`}
            </span>
          </div>

          {/* single object → its name repeats as a faint outline pattern */}
          {solo && (
            <div className="t10-ghost" aria-hidden>
              <span>{solo.title}</span>
              <span>{solo.title}</span>
              <span>{solo.title}</span>
            </div>
          )}

          {count === 0 ? (
            <div className="t10-empty">
              <p className="t10-empty-big">Soon</p>
              <p className="t10-empty-note">
                The index is empty — the next firing is still in the kiln. Come back shortly.
              </p>
            </div>
          ) : (
            products.map((p, i) => (
              <Reveal key={p.id} className="t10-rowwrap" y={20} duration={0.75} delay={Math.min(i * 0.06, 0.42)}>
                <Link
                  href={hrefOf(p)}
                  className={`t10-row${p.imageUrl ? "" : " t10-row--flat"}`}
                >
                  <span className="t10-no">{indexNo(i)}</span>
                  <span className="t10-main">
                    <span className="t10-name" style={{ animationDelay: `${0.1 + Math.min(i, 8) * 0.08}s` }}>
                      {p.title}
                      {featuredSet.has(p.id) && <span className="t10-star" title="Studio pick"> ✳</span>}
                    </span>
                    {!p.imageUrl && p.subtitle && <span className="t10-ann">{p.subtitle}</span>}
                  </span>
                  <Price minor={p.priceMinor} currency={p.currency} fallback={p.priceText} className="t10-price" />
                  {p.imageUrl && (
                    <span className="t10-plate" aria-hidden>
                      <StoreImage
                        src={p.imageUrl}
                        alt=""
                        monogram={monogram(p.title)}
                        style={{ width: "100%", height: "100%", display: "block", fontSize: 22 }}
                      />
                    </span>
                  )}
                </Link>
              </Reveal>
            ))
          )}
        </section>

        {/* ── 6 · studio note ── */}
        {config.showAbout && (
          <section className="t10-note-sec" id="t10-note">
            <span className="t10-label">Studio Note</span>
            <Reveal y={18}>
              <NoteBody about={config.about} />
            </Reveal>
            {config.contactUrl && (
              <Reveal delay={0.12} y={10}>
                <a className="t10-note-contact" href={config.contactUrl} target="_blank" rel="noopener noreferrer nofollow">
                  Write to the studio →
                </a>
              </Reveal>
            )}
          </section>
        )}
      </main>

      {/* ── 7 · colophon ── */}
      <footer className="t10-colophon">
        <span>
          Set in Anybody &amp; Newsreader · {config.title} · {config.currency}
        </span>
        <span>Powered by Mira</span>
      </footer>
    </div>
  );
}

// Letterpress split — first sentence oversized italic, the rest at 16px.
function NoteBody({ about }: { about: string }) {
  const first = (about.match(/^[^.!?]+[.!?]?/)?.[0] ?? about).trim();
  const rest = about.slice(first.length).trim();
  return (
    <>
      <p className="t10-note-lead">{first}</p>
      {rest && <p className="t10-note-rest">{rest}</p>}
    </>
  );
}
