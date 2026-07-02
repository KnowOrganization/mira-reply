// t02-brutalist Detail — measured spec-sheet: permanent blueprint dimension
// lines, sentence-split SPEC table, giant mono price, scramble ATC.
import type { DetailProps } from "../_shared/types";
import { TEMPLATE_FONTS } from "../_shared/fonts";
import { Price } from "../_shared/Price";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import Reveal from "../../_motion/Reveal";
import ScrambleText from "../../_motion/ScrambleText";
import Carousel from "../../_motion/Carousel";
import Blueprint from "./Blueprint";

const INK = "#0a0a0a";
const BG = "#e8e6e1";

const monogram = (s: string) => (s.trim()[0] || "S").toUpperCase();
const sku = (id: string) => `SKU-${id.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() || "000000"}`;

export default function Detail({ config, product, more, slug }: DetailProps) {
  const fonts = TEMPLATE_FONTS["t02-brutalist"];
  const mono = monogram(config.title);
  const gallery = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const specs = (product.description ?? "")
    .split(". ")
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean);

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
      <header className="t02d-bar">
        <a href={`/s/${slug}`} className="t02d-back">← INDEX</a>
        <span className="t02d-sku"><ScrambleText text={sku(product.id)} /></span>
      </header>

      <main className="t02d-main">
        {/* measured image frame */}
        <div className="t02d-imgcol">
          <div className="t02d-frame">
            {gallery.length ? (
              <Carousel images={gallery} alt={product.title} monogram={mono} aspect="1 / 1" />
            ) : (
              <div className="t02d-novisual">
                <span className="t02d-novisual-mark">{mono}</span>
                <span className="t02d-novisual-label">NO VISUAL AVAILABLE</span>
              </div>
            )}
            <Blueprint always label="UNIT 01 — MEASURED" />
          </div>
        </div>

        {/* data column */}
        <div className="t02d-data">
          <Reveal duration={0.3} y={10}>
            <h1 className="t02d-title">{product.title}</h1>
          </Reveal>
          {product.subtitle ? <p className="t02d-sub">{product.subtitle}</p> : null}

          <div className="t02d-price">
            <Price minor={product.priceMinor} fallback={product.priceText} currency={product.currency} />
            <span className="t02d-price-code">{product.currency}</span>
          </div>

          <AddToCart
            product={product}
            config={config}
            slug={slug}
            fx="scramble"
            label={`${config.buyLabel.toUpperCase()} NOW`}
            addedLabel="ADDED_OK"
            style={{ background: "var(--sf-accent)", color: "var(--sf-accent-fg)", borderRadius: 0, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, fontFamily: fonts.body, width: "100%", padding: "16px 24px", fontSize: 14 }}
          />

          {specs.length ? (
            <table className="t02d-specs">
              <tbody>
                {specs.map((s, i) => (
                  <tr key={i}>
                    <td className="t02d-spec-key">SPEC-{String(i + 1).padStart(2, "0")}</td>
                    <td>{s}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          <div className="t02d-status">
            STATUS: {product.available ? "IN STOCK" : "OUT OF STOCK"} <span className="t02d-dot" aria-hidden>●</span>
          </div>
        </div>
      </main>

      {more.length ? (
        <section className="t02d-related">
          <div className="t02d-related-label">RELATED UNITS</div>
          <div className="t02d-related-grid">
            {more.map((p) => (
              <a key={p.id} href={`/s/${slug}/p/${p.slug ?? p.id}`} className="t02d-rel">
                <div className="t02d-rel-img">
                  <StoreImage src={p.imageUrl} alt={p.title} monogram={mono} style={{ width: "100%", height: "100%" }} />
                </div>
                <span className="t02d-rel-sku">{sku(p.id)}</span>
                <span className="t02d-rel-title">{p.title}</span>
                <Price minor={p.priceMinor} fallback={p.priceText} currency={p.currency} className="t02d-rel-price" />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <style>{`
        .t02d-bar { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid ${INK}; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
        .t02d-back { color: ${INK}; text-decoration: none; font-weight: 700; }
        .t02d-back:hover { color: var(--sf-accent); }
        .t02d-sku { color: var(--sf-accent); }

        .t02d-main { display: grid; grid-template-columns: 1fr; }
        @media (min-width: 900px) { .t02d-main { grid-template-columns: 1.2fr 1fr; } .t02d-imgcol { border-right: 1px solid ${INK}; border-bottom: none; } }
        .t02d-imgcol { padding: 22px; border-bottom: 1px solid ${INK}; }
        .t02d-frame { position: relative; border: 1px solid ${INK}; padding: 14px; }
        .t02d-novisual { aspect-ratio: 1 / 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; background: repeating-linear-gradient(45deg, transparent, transparent 6px, color-mix(in srgb, ${INK} 12%, transparent) 6px, color-mix(in srgb, ${INK} 12%, transparent) 7px); }
        .t02d-novisual-mark { font-family: ${fonts.display}; font-size: 64px; }
        .t02d-novisual-label { font-size: 11px; letter-spacing: 0.14em; }

        .t02d-data { padding: 26px 22px 34px; display: flex; flex-direction: column; gap: 18px; }
        .t02d-title { font-family: ${fonts.display}; font-size: clamp(30px, 6vw, 64px); line-height: 0.92; text-transform: uppercase; margin: 0; }
        .t02d-sub { margin: -8px 0 0; font-size: 13px; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.06em; }
        .t02d-price { font-size: clamp(40px, 7vw, 80px); font-weight: 700; line-height: 1; display: flex; align-items: baseline; gap: 10px; }
        .t02d-price-code { font-size: 13px; letter-spacing: 0.14em; color: var(--sf-accent); }
        .t02d-specs { border-collapse: collapse; font-size: 13px; width: 100%; }
        .t02d-specs td { border: 1px solid ${INK}; padding: 9px 12px; }
        .t02d-spec-key { width: 88px; color: var(--sf-accent); font-weight: 700; letter-spacing: 0.08em; white-space: nowrap; }
        .t02d-status { font-size: 12px; letter-spacing: 0.12em; font-weight: 700; }
        .t02d-dot { color: var(--sf-accent); animation: t02d-blink 1.6s steps(2) infinite; }

        .t02d-related { border-top: 1px solid ${INK}; }
        .t02d-related-label { padding: 10px 16px; font-size: 11px; letter-spacing: 0.14em; color: var(--sf-accent); font-weight: 700; border-bottom: 1px solid ${INK}; }
        .t02d-related-grid { display: grid; grid-template-columns: repeat(2, 1fr); }
        @media (min-width: 900px) { .t02d-related-grid { grid-template-columns: repeat(4, 1fr); } }
        .t02d-rel { display: flex; flex-direction: column; gap: 5px; padding: 12px; border-right: 1px solid ${INK}; border-bottom: 1px solid ${INK}; color: inherit; text-decoration: none; font-size: 12px; }
        .t02d-rel:hover { background: ${INK}; color: ${BG}; }
        .t02d-rel-img { aspect-ratio: 1 / 1; overflow: hidden; border: 1px solid currentColor; }
        .t02d-rel-sku { color: var(--sf-accent); font-size: 10px; letter-spacing: 0.08em; }
        .t02d-rel-title { font-family: ${fonts.display}; text-transform: uppercase; font-size: 13px; }
        .t02d-rel-price { font-weight: 700; }

        @keyframes t02d-blink { 50% { opacity: 0.2; } }
        @media (prefers-reduced-motion: reduce) { .t02d-dot { animation: none; } }
      `}</style>
    </div>
  );
}
