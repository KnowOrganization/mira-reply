// t02-brutalist — "The Schematic". Declassified spec-sheet for tech/gadget
// sellers: concrete ground, exposed 1px grid lines, Archivo Black type slabs,
// Space Mono data, accent used only as warning marks. RSC; motion via islands.
import type { ListingProps } from "../_shared/types";
import { TEMPLATE_FONTS } from "../_shared/fonts";
import { Price } from "../_shared/Price";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import Reveal from "../../_motion/Reveal";
import ScrambleText from "../../_motion/ScrambleText";
import Clock from "./Clock";
import Blueprint from "./Blueprint";

const INK = "#0a0a0a";
const BG = "#e8e6e1";

const monogram = (s: string) => (s.trim()[0] || "S").toUpperCase();
const sku = (id: string) => `SKU-${id.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() || "000000"}`;

export default function Listing({ config, products, slug }: ListingProps) {
  const fonts = TEMPLATE_FONTS["t02-brutalist"];
  const isPreview = slug.startsWith("preview");
  const mono = monogram(config.title);

  return (
    <div
      className={`t02-root ${fonts.className}`}
      style={{
        background: BG,
        color: INK,
        minHeight: "100dvh",
        fontFamily: fonts.body,
        ["--sf-accent" as string]: config.accent,
        ["--sf-accent-fg" as string]: config.accentFg,
        ["--sf-accent-soft" as string]: `color-mix(in srgb, ${config.accent} 14%, ${BG})`,
      }}
    >
      {/* ── fixed top bar ── */}
      <header className="t02-bar">
        <span className="t02-bar-name">{config.title}</span>
        <span className="t02-cross" aria-hidden>✛</span>
        <span className="t02-bar-clock"><Clock /></span>
        {!isPreview && (
          <a href={`/s/${slug}/cart`} className="t02-bar-cart">[CART]</a>
        )}
      </header>

      {/* ── hero: type slab + metadata column ── */}
      <section className="t02-hero">
        <div className="t02-hero-type">
          {(config.heroHeadline || config.title).split(" ").map((w, i) => (
            <div key={i} className="t02-hero-word" style={{ animationDelay: `${0.15 + i * 0.09}s` }}>
              {w}
            </div>
          ))}
        </div>
        <div className="t02-hero-meta">
          <div className="t02-meta-line"><ScrambleText text={`PRODUCTS: ${String(products.length).padStart(2, "0")}`} /></div>
          <div className="t02-meta-line"><ScrambleText text={`CURRENCY: ${config.currency}`} delay={120} /></div>
          <div className="t02-meta-line"><ScrambleText text={`STATUS: ${config.checkoutEnabled ? "LIVE" : "CATALOG"}`} delay={240} /></div>
          <div className="t02-meta-line"><ScrambleText text="INDEX: T02-SCHEMATIC" delay={360} /></div>
          {config.heroTagline ? <p className="t02-meta-tag">{config.heroTagline}</p> : null}
        </div>
      </section>

      {/* ── blueprint grid ── */}
      <section className="t02-grid">
        {products.map((p, i) => (
          <Reveal key={p.id} duration={0.35} y={12} delay={(i % 3) * 0.05}>
            <div className="t02-cell">
              <a href={`/s/${slug}/p/${p.slug ?? p.id}`} className="t02-cell-link">
                <div className="t02-cell-img">
                  {p.imageUrl ? (
                    <StoreImage src={p.imageUrl} alt={p.title} monogram={mono} style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <div className="t02-novisual">
                      <span className="t02-novisual-mark">{mono}</span>
                      <span className="t02-novisual-label">NO VISUAL AVAILABLE</span>
                    </div>
                  )}
                  <Blueprint />
                </div>
                <span className="t02-cell-sku"><ScrambleText text={sku(p.id)} speed={20} /></span>
                <span className="t02-cell-title">{p.title}</span>
                {p.subtitle ? <span className="t02-cell-sub">{p.subtitle}</span> : null}
              </a>
              <div className="t02-cell-buy">
                <Price minor={p.priceMinor} fallback={p.priceText} currency={p.currency} />
                <AddToCart
                  product={p}
                  config={config}
                  slug={slug}
                  variant="compact"
                  fx="scramble"
                  style={{ background: "var(--sf-accent)", color: "var(--sf-accent-fg)", borderRadius: 0, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, fontFamily: fonts.body, fontSize: 11 }}
                />
              </div>
            </div>
          </Reveal>
        ))}
      </section>

      {/* ── spec table ── */}
      <section className="t02-tablewrap">
        <div className="t02-section-label">FULL INVENTORY</div>
        <div className="t02-tablescroll">
          <table className="t02-table">
            <thead>
              <tr><th>ID</th><th>NAME</th><th>PRICE</th><th>AVAIL</th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{sku(p.id)}</td>
                  <td><a href={`/s/${slug}/p/${p.slug ?? p.id}`}>{p.title.toUpperCase()}</a></td>
                  <td><Price minor={p.priceMinor} fallback={p.priceText} currency={p.currency} /></td>
                  <td className="t02-avail">{p.available ? "✓" : "✗"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── dossier ── */}
      {config.showAbout && config.about ? (
        <section className="t02-dossier">
          <div className="t02-section-label" style={{ paddingLeft: 0, borderBottom: "none" }}>DOSSIER</div>
          <Reveal duration={0.35} y={10}>
            <p className="t02-dossier-text">
              {config.about.split(" ").map((w, i) =>
                i % 7 === 3 ? (
                  <span key={i} className="t02-redact">
                    <span aria-hidden className="t02-redact-bar" />
                    {w}{" "}
                  </span>
                ) : (
                  <span key={i}>{w} </span>
                ),
              )}
            </p>
          </Reveal>
          {config.contactUrl ? (
            <a className="t02-contact" href={config.contactUrl} target="_blank" rel="noopener noreferrer nofollow">
              TRANSMIT INQUIRY →
            </a>
          ) : null}
        </section>
      ) : null}

      {/* ── cropped giant footer ── */}
      <footer className="t02-footer">
        <div className="t02-footer-giant" aria-hidden>{config.title.toUpperCase()}</div>
        <div className="t02-footer-line">{config.title} · SCHEMATIC EDITION · {config.currency}</div>
      </footer>

      <style>{`
        .t02-root { -webkit-font-smoothing: antialiased; }
        .t02-bar { position: sticky; top: 0; z-index: 40; display: flex; align-items: center; gap: 14px; padding: 10px 16px; background: ${BG}; border-bottom: 1px solid ${INK}; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; }
        .t02-bar-name { font-weight: 700; }
        .t02-cross { color: var(--sf-accent); font-size: 14px; }
        .t02-bar-clock { margin-left: auto; }
        .t02-bar-cart { color: ${INK}; text-decoration: none; }
        .t02-bar-cart:hover { color: var(--sf-accent); }

        .t02-hero { display: grid; grid-template-columns: 1fr; border-bottom: 1px solid ${INK}; }
        @media (min-width: 900px) { .t02-hero { grid-template-columns: 2fr 1fr; } .t02-hero-type { border-right: 1px solid ${INK}; } }
        .t02-hero-type { padding: 28px 16px 22px; font-family: ${fonts.display}; font-size: clamp(40px, 12vw, 160px); line-height: 0.85; text-transform: uppercase; letter-spacing: -0.01em; overflow: hidden; border-bottom: 1px solid ${INK}; }
        @media (min-width: 900px) { .t02-hero-type { border-bottom: none; } }
        .t02-hero-word { animation: t02-stamp 0.28s steps(2) both; }
        .t02-hero-meta { padding: 24px 16px; display: flex; flex-direction: column; gap: 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; }
        .t02-meta-line { border-bottom: 1px solid ${INK}; padding-bottom: 8px; }
        .t02-meta-tag { margin: 12px 0 0; font-size: 13px; text-transform: none; letter-spacing: 0; line-height: 1.5; }

        .t02-grid { display: grid; grid-template-columns: repeat(2, 1fr); border-bottom: 1px solid ${INK}; }
        @media (min-width: 900px) { .t02-grid { grid-template-columns: repeat(3, 1fr); } }
        .t02-cell { border-right: 1px solid ${INK}; border-bottom: 1px solid ${INK}; padding: 12px; }
        .t02-cell:hover, .t02-cell:active { background: ${INK}; color: ${BG}; }
        .t02-cell-link { display: flex; flex-direction: column; gap: 5px; color: inherit; text-decoration: none; }
        .t02-cell-img { position: relative; aspect-ratio: 1 / 1; overflow: hidden; border: 1px solid currentColor; margin-bottom: 5px; }
        .t02-cell-sku { font-size: 10.5px; letter-spacing: 0.08em; color: var(--sf-accent); }
        .t02-cell-title { font-family: ${fonts.display}; font-size: 17px; text-transform: uppercase; line-height: 1.05; }
        .t02-cell-sub { font-size: 11.5px; opacity: 0.75; }
        .t02-cell-buy { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; font-size: 13px; font-weight: 700; }
        svg[data-bp] .t02-bp-line { stroke-dasharray: 60; stroke-dashoffset: 60; transition: stroke-dashoffset .3s ease; }
        svg[data-bp] .t02-bp-text { opacity: 0; transition: opacity .25s ease .15s; }
        .t02-cell:hover svg[data-bp="hover"] .t02-bp-line, svg[data-bp="on"] .t02-bp-line { stroke-dashoffset: 0; }
        .t02-cell:hover svg[data-bp="hover"] .t02-bp-text, svg[data-bp="on"] .t02-bp-text { opacity: 1; }
        .t02-novisual { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: repeating-linear-gradient(45deg, transparent, transparent 6px, color-mix(in srgb, currentColor 12%, transparent) 6px, color-mix(in srgb, currentColor 12%, transparent) 7px); }
        .t02-novisual-mark { font-family: ${fonts.display}; font-size: 42px; }
        .t02-novisual-label { font-size: 10px; letter-spacing: 0.14em; }

        .t02-section-label { padding: 10px 16px; font-size: 11px; letter-spacing: 0.14em; border-bottom: 1px solid ${INK}; color: var(--sf-accent); font-weight: 700; }
        .t02-tablewrap { border-bottom: 1px solid ${INK}; }
        .t02-tablescroll { overflow-x: auto; }
        .t02-table { width: 100%; min-width: 560px; border-collapse: collapse; font-size: 12.5px; }
        .t02-table th, .t02-table td { text-align: left; padding: 10px 16px; border-bottom: 1px solid ${INK}; border-right: 1px solid ${INK}; text-transform: uppercase; letter-spacing: 0.04em; }
        .t02-table th { font-size: 10.5px; letter-spacing: 0.14em; }
        .t02-table a { color: inherit; text-decoration: none; font-weight: 700; }
        .t02-table tr:hover td { background: ${INK}; color: ${BG}; }
        .t02-table tr:hover a { color: ${BG}; }
        .t02-avail { color: var(--sf-accent); font-weight: 700; }

        .t02-dossier { padding: 26px 16px 34px; border-bottom: 1px solid ${INK}; }
        .t02-dossier-text { max-width: 68ch; font-size: 14.5px; line-height: 1.75; margin: 10px 0 0; }
        .t02-redact { position: relative; display: inline-block; }
        .t02-redact-bar { position: absolute; inset: 0.1em 0.2em 0.05em 0; background: ${INK}; transform-origin: left; animation: t02-unredact 0.6s ease 1.1s both; }
        .t02-contact { display: inline-block; margin-top: 18px; color: var(--sf-accent); font-weight: 700; font-size: 13px; letter-spacing: 0.08em; text-decoration: none; border-bottom: 2px solid var(--sf-accent); padding-bottom: 2px; }

        .t02-footer { overflow: hidden; }
        .t02-footer-giant { font-family: ${fonts.display}; font-size: 20vw; line-height: 0.8; white-space: nowrap; letter-spacing: -0.02em; margin: 20px -2vw -1vw; opacity: 0.92; }
        .t02-footer-line { border-top: 1px solid ${INK}; padding: 12px 16px 20px; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; }

        @keyframes t02-stamp { from { transform: translateY(60%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes t02-unredact { to { transform: scaleX(0); } }
        @media (prefers-reduced-motion: reduce) {
          .t02-hero-word { animation: none; }
          .t02-redact-bar { animation: none; transform: scaleX(0); }
          svg[data-bp] .t02-bp-line { stroke-dashoffset: 0; transition: none; }
          svg[data-bp] .t02-bp-text { opacity: 1; transition: none; }
        }
      `}</style>
    </div>
  );
}
