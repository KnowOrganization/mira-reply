// t01-editorial — "The Print Room"
// A Taschen-monograph storefront for art / print / photography sellers.
// Warm paper (#f6f2ea), ink type (#1c1a17); the owner accent appears ONLY as
// thin rules, plate numbers and link underlines — like an edition stamp.
// Signature: the Gallery Wall — a pinned horizontal wall of framed plates
// (native horizontal scroll on mobile / reduced motion).
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import { Price } from "../_shared/Price";
import { TEMPLATE_FONTS } from "../_shared/fonts";
import { Parallax, Reveal, SplitText, StickyHero } from "../../_motion";
import CartLink from "./CartLink";
import type { ListingProps, SfProduct } from "../_shared/types";

const PAPER = "#f6f2ea";
const INK = "#1c1a17";
const FONTS = TEMPLATE_FONTS["t01-editorial"];

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();
const plateNo = (i: number) => String(i + 1).padStart(2, "0");
const priced = (p: SfProduct) => p.priceMinor != null || !!p.priceText;

const caps: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

function Caption({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 30 }}>
      <span style={{ ...caps, color: "rgba(28,26,23,.62)" }}>{children}</span>
      <span aria-hidden style={{ flex: 1, alignSelf: "center", height: 1, background: "var(--sf-accent)", opacity: 0.5 }} />
      {right != null && <span style={{ ...caps, color: "var(--sf-accent)" }}>{right}</span>}
    </div>
  );
}

export default function Listing({ config, products, slug }: ListingProps) {
  const isPreview = slug.startsWith("preview");
  const hrefOf = (p: SfProduct) => `/s/${slug}/p/${p.slug ?? p.id}`;
  const featuredSet = new Set(config.showFeatured ? config.featuredIds : []);
  const plates = products.slice(0, 10);
  const showHeroImage = !!config.heroImageUrl && config.heroLayout !== "minimal";
  const quote =
    config.heroTagline ||
    (config.about ? (config.about.match(/^[^.!?]+[.!?]?/)?.[0] ?? "").trim() : "");

  return (
    <div
      className={`${FONTS.className} t01-root`}
      style={{
        ["--sf-accent" as string]: config.accent,
        ["--sf-accent-fg" as string]: config.accentFg,
        ["--sf-accent-soft" as string]: `color-mix(in srgb, ${config.accent} 12%, ${PAPER})`,
        ["--t01-display" as string]: FONTS.display,
        background: PAPER,
        color: INK,
        minHeight: "100vh",
        fontFamily: FONTS.body,
        fontSize: 15,
        lineHeight: 1.6,
      }}
    >
      <style>{`
        .t01-root { -webkit-font-smoothing: antialiased; }
        .t01-root ::selection { background: var(--sf-accent-soft); }

        /* ── masthead ─────────────────────────────────────────────────────── */
        .t01-mast { position: sticky; top: 0; z-index: 40; background: color-mix(in srgb, #f6f2ea 92%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-top: 2px solid #1c1a17; border-bottom: 1px solid rgba(28,26,23,.25); }
        .t01-mast-in { max-width: 1200px; margin: 0 auto; padding: 13px clamp(16px, 3vw, 28px); display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 14px; }
        .t01-mast-title { font-family: var(--t01-display); font-size: clamp(17px, 2.4vw, 22px); font-weight: 620; letter-spacing: -0.015em; text-align: center; margin: 0; white-space: nowrap; overflow: hidden; }
        .t01-mast-left { display: flex; gap: 20px; }
        .t01-mast-right { display: flex; gap: 20px; justify-content: flex-end; }
        .t01-navlink { font-size: 10.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: inherit; text-decoration: none; padding-bottom: 2px; background-image: linear-gradient(var(--sf-accent), var(--sf-accent)); background-size: 0% 1px; background-repeat: no-repeat; background-position: 0 100%; transition: background-size .35s cubic-bezier(.16,1,.3,1); }
        .t01-navlink:hover { background-size: 100% 1px; }
        @media (max-width: 640px) {
          .t01-mast-left { display: none; }
          .t01-mast-in { grid-template-columns: auto 1fr; }
          .t01-mast-title { text-align: left; max-width: 48vw; text-overflow: ellipsis; }
        }

        /* ── shell ────────────────────────────────────────────────────────── */
        .t01-shell { max-width: 1200px; margin: 0 auto; padding: 0 clamp(20px, 4vw, 48px); }

        /* ── hero ─────────────────────────────────────────────────────────── */
        .t01-hero { padding: clamp(44px, 7vw, 96px) 0 clamp(40px, 6vw, 88px); }
        .t01-hero-eyebrow { display: flex; align-items: baseline; gap: 16px; }
        .t01-hero-h1 { font-family: var(--t01-display); font-size: clamp(48px, 11vw, 150px); font-weight: 560; letter-spacing: -0.03em; line-height: .96; margin: clamp(14px, 2vw, 26px) 0 0; max-width: 11ch; }
        .t01-hero-lower { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 440px); gap: clamp(28px, 5vw, 76px); align-items: start; margin-top: clamp(28px, 4vw, 56px); }
        .t01-hero-lower--solo { grid-template-columns: minmax(0, 640px); }
        .t01-hero-tag { font-family: var(--t01-display); font-style: italic; font-size: clamp(18px, 2.4vw, 26px); line-height: 1.45; color: rgba(28,26,23,.78); max-width: 32ch; margin: 0; }
        .t01-hero-platewrap { margin-top: clamp(-110px, -7vw, -12px); }
        .t01-hero-plate { transform: rotate(-2deg); background: #fffdf6; padding: clamp(10px, 1.8vw, 18px); border: 1px solid #e2dbc9; box-shadow: 0 3px 10px rgba(28,26,23,.10), 0 26px 52px rgba(28,26,23,.17); }
        .t01-hero-img { aspect-ratio: 4 / 3; overflow: hidden; border: 1px solid #e6e0d1; }
        .t01-hero-figcap { margin: 14px 2px 4px; text-align: center; font-size: 10.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: rgba(28,26,23,.55); }
        @media (max-width: 860px) {
          .t01-hero-lower { grid-template-columns: 1fr; }
          .t01-hero-platewrap { margin: 16px auto 0; max-width: 420px; width: 100%; }
        }

        /* ── gallery wall (signature) ─────────────────────────────────────── */
        .t01-wall-sec { border-top: 1px solid rgba(28,26,23,.2); border-bottom: 1px solid rgba(28,26,23,.2); background: #f1ebdd; overflow: hidden; }
        .t01-wall-row { display: flex; align-items: center; gap: clamp(32px, 5vw, 88px); padding: clamp(56px, 10vh, 110px) clamp(24px, 6vw, 96px); min-height: 100vh; width: max-content; }
        .t01-wall-intro { width: clamp(230px, 30vw, 380px); flex: 0 0 auto; display: flex; flex-direction: column; gap: 16px; }
        .t01-wall-intro-h { font-family: var(--t01-display); font-style: italic; font-size: clamp(28px, 3.8vw, 54px); font-weight: 500; line-height: 1.08; letter-spacing: -0.02em; }
        .t01-wall-hint { font-size: 10.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: rgba(28,26,23,.5); }
        .t01-wall-item { flex: 0 0 auto; width: clamp(210px, 24vw, 330px); transform: translateY(calc(var(--sf-pin, 0) * -18px)); }
        .t01-wall-item:nth-child(3n)   { width: clamp(180px, 20vw, 280px); margin-top: 72px; transform: translateY(calc(var(--sf-pin, 0) * -54px)); }
        .t01-wall-item:nth-child(3n+1) { margin-top: -52px; transform: translateY(calc(var(--sf-pin, 0) * -34px)); }
        .t01-plate-link { display: block; text-decoration: none; color: inherit; }
        .t01-plate-frame { background: #fffdf6; border: 6px solid #1c1a17; padding: clamp(10px, 1.4vw, 18px); box-shadow: 0 2px 6px rgba(28,26,23,.12), 0 18px 38px rgba(28,26,23,.16); transition: transform .5s cubic-bezier(.16,1,.3,1), box-shadow .5s cubic-bezier(.16,1,.3,1); }
        .t01-plate-link:hover .t01-plate-frame { transform: rotate(1.5deg); box-shadow: 0 6px 14px rgba(28,26,23,.16), 0 34px 64px rgba(28,26,23,.25); }
        .t01-plate-img { aspect-ratio: 4 / 5; overflow: hidden; border: 1px solid #ded6c3; }
        .t01-wall-item:nth-child(3n) .t01-plate-img { aspect-ratio: 1 / 1; }
        .t01-wall-item:nth-child(3n+1) .t01-plate-img { aspect-ratio: 3 / 4; }
        .t01-plate-cap { margin: 14px 2px 0; font-size: 12.5px; line-height: 1.55; color: rgba(28,26,23,.82); }
        .t01-plate-price { font-variant-numeric: tabular-nums; }
        @media (max-width: 767px) {
          .t01-wall-row { min-height: 0; padding: 44px 20px 52px; gap: 28px; }
          .t01-wall-item { width: 224px; }
          .t01-wall-item:nth-child(3n) { width: 190px; margin-top: 40px; }
          .t01-wall-item:nth-child(3n+1) { margin-top: -12px; }
          .t01-wall-intro { width: 236px; }
        }

        /* plate number — the edition stamp */
        .t01-no { font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--sf-accent); white-space: nowrap; }

        /* no-image plates: double-border ornate frame around the monogram tile */
        .t01-plate-img.t01-ornate, .t01-thumb.t01-ornate { border: 5px double rgba(28,26,23,.85); padding: 8px; background: #fffdf6; }

        /* ── pull-quote ───────────────────────────────────────────────────── */
        .t01-quote-sec { padding: clamp(64px, 10vw, 128px) 0; text-align: center; }
        .t01-quote { font-family: var(--t01-display); font-style: italic; font-weight: 480; font-size: clamp(28px, 5vw, 56px); line-height: 1.14; letter-spacing: -0.02em; margin: 0 auto; max-width: 24ch; }
        .t01-quote-rule { width: 72px; height: 1px; background: var(--sf-accent); margin: 26px auto 0; }

        /* ── index of plates ──────────────────────────────────────────────── */
        .t01-index-sec { padding: clamp(24px, 4vw, 56px) 0 clamp(48px, 6vw, 80px); scroll-margin-top: 76px; }
        .t01-index-row { display: grid; grid-template-columns: 78px minmax(0, 1fr) auto 64px; align-items: center; gap: clamp(12px, 2.5vw, 28px); padding: 22px 0; border-bottom: 1px solid rgba(28,26,23,.16); text-decoration: none; color: inherit; }
        .t01-index-title { font-family: var(--t01-display); font-size: clamp(20px, 3vw, 28px); font-weight: 560; letter-spacing: -0.015em; line-height: 1.18; padding-bottom: 3px; background-image: linear-gradient(var(--sf-accent), var(--sf-accent)); background-size: 0% 2px; background-repeat: no-repeat; background-position: 0% 100%; transition: background-size .5s cubic-bezier(.16,1,.3,1); }
        .t01-index-row:hover .t01-index-title { background-size: 100% 2px; }
        .t01-index-pick { display: inline-block; vertical-align: middle; transform: rotate(-2deg); border: 1px solid var(--sf-accent); color: var(--sf-accent); font-family: inherit; font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; padding: 2px 7px; margin-left: 12px; }
        .t01-index-sub { display: block; font-size: 12.5px; color: rgba(28,26,23,.6); margin-top: 4px; }
        .t01-index-price { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .t01-thumb { display: block; width: 64px; height: 64px; padding: 4px; background: #fffdf6; border: 1px solid #1c1a17; box-shadow: 0 2px 6px rgba(28,26,23,.14); overflow: hidden; }
        @media (max-width: 620px) {
          .t01-index-row { grid-template-columns: minmax(0, 1fr) 56px; grid-template-areas: "no thumb" "main thumb" "price thumb"; row-gap: 5px; column-gap: 16px; }
          .t01-index-no { grid-area: no; }
          .t01-index-main { grid-area: main; }
          .t01-index-price { grid-area: price; }
          .t01-thumb { grid-area: thumb; width: 56px; height: 56px; align-self: center; }
        }

        /* ── colophon ─────────────────────────────────────────────────────── */
        .t01-colophon { padding: clamp(24px, 4vw, 56px) 0 clamp(56px, 7vw, 96px); scroll-margin-top: 76px; }
        .t01-colophon-text { text-align: justify; hyphens: auto; line-height: 1.8; font-size: 15.5px; max-width: 62ch; margin: 0; white-space: pre-line; }
        .t01-dropcap::first-letter { font-family: var(--t01-display); font-size: 3.2em; font-weight: 620; float: left; line-height: .82; padding: .06em .14em 0 0; }
        .t01-contact { display: inline-block; margin-top: 22px; font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: inherit; text-decoration: underline; text-decoration-color: var(--sf-accent); text-decoration-thickness: 1px; text-underline-offset: 5px; }

        /* ── footer imprint ───────────────────────────────────────────────── */
        .t01-footer { text-align: center; padding: clamp(48px, 6vw, 72px) 20px 44px; border-top: 1px solid rgba(28,26,23,.16); }
        .t01-footer-rule { width: 72px; height: 1px; background: var(--sf-accent); margin: 0 auto 26px; }
        .t01-footer-title { font-size: 12px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; }
        .t01-footer-note { margin-top: 10px; font-family: var(--t01-display); font-style: italic; font-size: 13px; color: rgba(28,26,23,.55); }
        .t01-footer-mira { margin-top: 20px; font-size: 10.5px; letter-spacing: .08em; color: rgba(28,26,23,.4); }

        @media (prefers-reduced-motion: reduce) {
          .t01-plate-frame, .t01-index-title, .t01-navlink, .t01-mini-frame { transition: none !important; }
          .t01-wall-item { transform: none !important; }
        }
      `}</style>

      {/* ── masthead ── */}
      <header className="t01-mast">
        <div className="t01-mast-in">
          <nav className="t01-mast-left" aria-label="Catalogue">
            <a className="t01-navlink" href="#t01-index">Index</a>
            {plates.length > 0 && <a className="t01-navlink" href="#t01-wall">Gallery</a>}
          </nav>
          <SplitText as="div" by="chars" stagger={0.025} className="t01-mast-title">
            {config.title}
          </SplitText>
          <nav className="t01-mast-right" aria-label="Store">
            {config.showAbout && <a className="t01-navlink" href="#t01-about">About</a>}
            {config.contactUrl && (
              <a className="t01-navlink" href={config.contactUrl} target="_blank" rel="noopener noreferrer nofollow">Contact</a>
            )}
            {!isPreview && <CartLink slug={slug} className="t01-navlink" />}
          </nav>
        </div>
      </header>

      <main>
        {/* ── hero ── */}
        <section className="t01-shell t01-hero">
          <div className="t01-hero-eyebrow">
            <span style={{ ...caps, color: "rgba(28,26,23,.62)" }}>A catalogue of editions</span>
            <span aria-hidden style={{ flex: 1, alignSelf: "center", height: 1, background: "var(--sf-accent)", opacity: 0.5 }} />
            <span style={{ ...caps, color: "var(--sf-accent)" }}>№ 01</span>
          </div>
          <SplitText as="h1" by="words" stagger={0.07} className="t01-hero-h1">
            {config.heroHeadline}
          </SplitText>
          <div className={`t01-hero-lower${showHeroImage ? "" : " t01-hero-lower--solo"}`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 26, paddingTop: 6 }}>
              {config.heroTagline && (
                <Reveal delay={0.35} y={20}>
                  <p className="t01-hero-tag">{config.heroTagline}</p>
                </Reveal>
              )}
              <Reveal delay={0.5} y={14}>
                <a className="t01-navlink" href="#t01-index" style={{ alignSelf: "flex-start" }}>
                  Browse the index ↓
                </a>
              </Reveal>
            </div>
            {showHeroImage && (
              <Parallax speed={8} className="t01-hero-platewrap">
                <Reveal scale={1.06} duration={1.2} y={20}>
                  <figure className="t01-hero-plate" style={{ margin: 0 }}>
                    <div className="t01-hero-img">
                      <StoreImage
                        src={config.heroImageUrl}
                        alt={config.heroHeadline}
                        monogram={monogram(config.title)}
                        eager
                        style={{ width: "100%", height: "100%", display: "block" }}
                      />
                    </div>
                    <figcaption className="t01-hero-figcap">Plate No. 00 — Frontispiece</figcaption>
                  </figure>
                </Reveal>
              </Parallax>
            )}
          </div>
        </section>

        {/* ── signature: the gallery wall ── */}
        {plates.length > 0 && (
          <section className="t01-wall-sec" id="t01-wall">
            <StickyHero horizontal desktopOnly>
              <div
                className="t01-wall-row"
                style={plates.length < 3 ? { justifyContent: "center", minHeight: "70vh" } : undefined}
              >
                <div className="t01-wall-intro">
                  <span style={{ ...caps, color: "var(--sf-accent)" }}>The gallery wall</span>
                  <div className="t01-wall-intro-h">Every plate, hung at eye level.</div>
                  <span className="t01-wall-hint">Scroll to walk the wall →</span>
                </div>
                {plates.map((p, i) => (
                  <div key={p.id} className="t01-wall-item">
                    <Link href={hrefOf(p)} className="t01-plate-link">
                      <div className="t01-plate-frame">
                        <div className={`t01-plate-img${p.imageUrl ? "" : " t01-ornate"}`}>
                          <StoreImage
                            src={p.imageUrl}
                            alt={p.title}
                            monogram={monogram(p.title)}
                            style={{ width: "100%", height: "100%", display: "block" }}
                          />
                        </div>
                      </div>
                      <p className="t01-plate-cap">
                        <span className="t01-no">Plate No. {plateNo(i)}</span>
                        {" — "}
                        {p.title}
                        {priced(p) && (
                          <>
                            {" — "}
                            <Price minor={p.priceMinor} currency={p.currency} fallback={p.priceText} className="t01-plate-price" />
                          </>
                        )}
                      </p>
                    </Link>
                  </div>
                ))}
              </div>
            </StickyHero>
          </section>
        )}

        {/* ── pull-quote ── */}
        {config.showDiscover && quote && (
          <section className="t01-shell t01-quote-sec">
            <Reveal blur y={22} duration={1.1}>
              <p className="t01-quote">“{quote}”</p>
              <div className="t01-quote-rule" aria-hidden />
            </Reveal>
          </section>
        )}

        {/* ── index of plates ── */}
        <section className="t01-shell t01-index-sec" id="t01-index">
          <Caption right={`${products.length} plate${products.length === 1 ? "" : "s"}`}>Index of plates</Caption>
          {products.length === 0 ? (
            <p style={{ fontFamily: "var(--t01-display)", fontStyle: "italic", fontSize: 20, color: "rgba(28,26,23,.6)", padding: "40px 0" }}>
              The press is between editions — new plates are being proofed.
            </p>
          ) : (
            products.map((p, i) => (
              <Reveal key={p.id} delay={Math.min((i % 6) * 0.05, 0.3)} y={16} duration={0.7}>
                <Link href={hrefOf(p)} className="t01-index-row">
                  <span className="t01-no t01-index-no">No. {plateNo(i)}</span>
                  <span className="t01-index-main">
                    <span className="t01-index-title">
                      {p.title}
                      {featuredSet.has(p.id) && <span className="t01-index-pick">Selected</span>}
                    </span>
                    {p.subtitle && <span className="t01-index-sub">{p.subtitle}</span>}
                  </span>
                  <Price minor={p.priceMinor} currency={p.currency} fallback={p.priceText} className="t01-index-price" />
                  <span className={`t01-thumb${p.imageUrl ? "" : " t01-ornate"}`}>
                    <StoreImage
                      src={p.imageUrl}
                      alt={p.title}
                      monogram={monogram(p.title)}
                      style={{ width: "100%", height: "100%", display: "block" }}
                    />
                  </span>
                </Link>
              </Reveal>
            ))
          )}
        </section>

        {/* ── colophon ── */}
        {config.showAbout && (
          <section className="t01-shell t01-colophon" id="t01-about">
            <Caption right="§">Colophon</Caption>
            <Reveal y={20}>
              <p className="t01-colophon-text t01-dropcap">{config.about}</p>
            </Reveal>
            {config.contactUrl && (
              <Reveal delay={0.15} y={12}>
                <a className="t01-contact" href={config.contactUrl} target="_blank" rel="noopener noreferrer nofollow">
                  Correspondence →
                </a>
              </Reveal>
            )}
          </section>
        )}
      </main>

      {/* ── footer imprint ── */}
      <footer className="t01-footer">
        <div className="t01-footer-rule" aria-hidden />
        <div className="t01-footer-title">{config.title}</div>
        <div className="t01-footer-note">Printed digitally · {config.currency}</div>
        <div className="t01-footer-mira">Powered by Mira</div>
      </footer>
    </div>
  );
}
