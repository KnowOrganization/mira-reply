// t01-editorial Detail — "The Print Room" plate page.
// Two-column monograph spread: the plate (framed Carousel with a gentle
// parallax drift) on the left; edition caption, Fraunces title, confident
// small price, drop-cap description and an ink-block stamp button on the
// right. "More from the press" shows related plates as small framed prints.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import { Price } from "../_shared/Price";
import { TEMPLATE_FONTS } from "../_shared/fonts";
import { Carousel, Parallax, Reveal } from "../../_motion";
import CartLink from "./CartLink";
import type { DetailProps, SfProduct } from "../_shared/types";

const PAPER = "#f6f2ea";
const INK = "#1c1a17";
const FONTS = TEMPLATE_FONTS["t01-editorial"];

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
};

const caps: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

export default function Detail({ config, product, more, slug }: DetailProps) {
  const isPreview = slug.startsWith("preview");
  const hrefOf = (p: SfProduct) => `/s/${slug}/p/${p.slug ?? p.id}`;
  const images = product.images?.length
    ? product.images
    : product.imageUrl
      ? [product.imageUrl]
      : [];
  const canCheckout = config.checkoutEnabled && product.priceMinor != null && product.available;
  const isLinkOut = !canCheckout && !!product.ctaUrl;
  const purchasable = canCheckout || !!product.ctaUrl;

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

        .t01-mast { position: sticky; top: 0; z-index: 40; background: color-mix(in srgb, #f6f2ea 92%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-top: 2px solid #1c1a17; border-bottom: 1px solid rgba(28,26,23,.25); }
        .t01-mast-in { max-width: 1200px; margin: 0 auto; padding: 13px clamp(16px, 3vw, 28px); display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 14px; }
        .t01-mast-title { font-family: var(--t01-display); font-size: clamp(17px, 2.4vw, 22px); font-weight: 620; letter-spacing: -0.015em; text-align: center; margin: 0; white-space: nowrap; overflow: hidden; text-decoration: none; color: inherit; }
        .t01-navlink { font-size: 10.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: inherit; text-decoration: none; padding-bottom: 2px; background-image: linear-gradient(var(--sf-accent), var(--sf-accent)); background-size: 0% 1px; background-repeat: no-repeat; background-position: 0 100%; transition: background-size .35s cubic-bezier(.16,1,.3,1); }
        .t01-navlink:hover { background-size: 100% 1px; }
        @media (max-width: 640px) { .t01-mast-title { max-width: 42vw; text-overflow: ellipsis; } }

        .t01-shell { max-width: 1160px; margin: 0 auto; padding: 0 clamp(20px, 4vw, 48px); }

        .t01-d-main { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: clamp(32px, 5vw, 76px); align-items: start; padding: clamp(32px, 5vw, 64px) 0 clamp(48px, 6vw, 80px); }
        @media (max-width: 767px) { .t01-d-main { grid-template-columns: 1fr; } }

        .t01-d-frame { background: #fffdf6; border: 6px solid #1c1a17; padding: clamp(12px, 1.8vw, 20px); box-shadow: 0 3px 8px rgba(28,26,23,.12), 0 22px 46px rgba(28,26,23,.17); }
        .t01-d-frame.t01-ornate-frame .t01-d-slides { border: 5px double rgba(28,26,23,.85); padding: 10px; background: #fffdf6; }
        .t01-d-slides { border: 1px solid #ded6c3; }
        .t01-d-figcap { margin: 16px 2px 4px; text-align: center; font-size: 10.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: rgba(28,26,23,.55); }

        .t01-d-title { font-family: var(--t01-display); font-size: clamp(32px, 6vw, 64px); font-weight: 570; letter-spacing: -0.03em; line-height: 1.0; margin: 14px 0 0; }
        .t01-d-sub { font-family: var(--t01-display); font-style: italic; font-size: clamp(16px, 2vw, 19px); color: rgba(28,26,23,.72); margin: 12px 0 0; }
        .t01-d-priceline { display: flex; align-items: baseline; gap: 16px; margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--sf-accent); }
        .t01-d-price { font-size: 17px; font-weight: 650; letter-spacing: .02em; font-variant-numeric: tabular-nums; }
        .t01-d-status { font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: rgba(28,26,23,.5); }
        .t01-d-desc { text-align: justify; hyphens: auto; line-height: 1.8; font-size: 15.5px; margin: 26px 0 0; white-space: pre-line; max-width: 58ch; }
        .t01-dropcap::first-letter { font-family: var(--t01-display); font-size: 3.2em; font-weight: 620; float: left; line-height: .82; padding: .06em .14em 0 0; }

        .t01-d-atc { transition: transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s cubic-bezier(.16,1,.3,1); box-shadow: 0 2px 0 rgba(28,26,23,.35); }
        .t01-d-atc:hover { transform: translateY(-2px); box-shadow: 0 5px 0 rgba(28,26,23,.3); }
        .t01-d-note { margin: 12px 0 0; text-align: center; font-size: 11px; color: rgba(28,26,23,.5); letter-spacing: .04em; }
        .t01-contact { display: inline-block; margin-top: 18px; font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: inherit; text-decoration: underline; text-decoration-color: var(--sf-accent); text-decoration-thickness: 1px; text-underline-offset: 5px; }

        .t01-more-sec { padding: clamp(24px, 4vw, 48px) 0 clamp(56px, 7vw, 88px); }
        .t01-more-row { display: flex; gap: clamp(20px, 3vw, 36px); overflow-x: auto; padding: 6px 4px 20px; scrollbar-width: none; }
        .t01-more-row::-webkit-scrollbar { height: 0; }
        .t01-mini { flex: 0 0 auto; width: clamp(140px, 18vw, 190px); text-decoration: none; color: inherit; }
        .t01-mini-frame { background: #fffdf6; border: 4px solid #1c1a17; padding: 8px; box-shadow: 0 2px 6px rgba(28,26,23,.12), 0 12px 26px rgba(28,26,23,.13); transition: transform .45s cubic-bezier(.16,1,.3,1), box-shadow .45s cubic-bezier(.16,1,.3,1); }
        .t01-mini:hover .t01-mini-frame { transform: rotate(1.5deg); box-shadow: 0 5px 12px rgba(28,26,23,.16), 0 20px 42px rgba(28,26,23,.2); }
        .t01-mini-img { aspect-ratio: 4 / 5; overflow: hidden; border: 1px solid #ded6c3; }
        .t01-mini-img.t01-ornate { border: 5px double rgba(28,26,23,.85); padding: 6px; background: #fffdf6; }
        .t01-mini-cap { margin-top: 10px; font-size: 12.5px; line-height: 1.45; }
        .t01-mini-price { display: block; color: rgba(28,26,23,.6); font-variant-numeric: tabular-nums; margin-top: 2px; }
        .t01-no { font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--sf-accent); white-space: nowrap; }

        .t01-footer { text-align: center; padding: clamp(48px, 6vw, 72px) 20px 44px; border-top: 1px solid rgba(28,26,23,.16); }
        .t01-footer-rule { width: 72px; height: 1px; background: var(--sf-accent); margin: 0 auto 26px; }
        .t01-footer-title { font-size: 12px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; }
        .t01-footer-note { margin-top: 10px; font-family: var(--t01-display); font-style: italic; font-size: 13px; color: rgba(28,26,23,.55); }
        .t01-footer-mira { margin-top: 20px; font-size: 10.5px; letter-spacing: .08em; color: rgba(28,26,23,.4); }

        @media (prefers-reduced-motion: reduce) {
          .t01-mini-frame, .t01-navlink, .t01-d-atc { transition: none !important; }
        }
      `}</style>

      {/* ── masthead ── */}
      <header className="t01-mast">
        <div className="t01-mast-in">
          <nav aria-label="Back" style={{ display: "flex" }}>
            <Link className="t01-navlink" href={`/s/${slug}`}>← Index</Link>
          </nav>
          <Link href={`/s/${slug}`} className="t01-mast-title">{config.title}</Link>
          <nav aria-label="Store" style={{ display: "flex", justifyContent: "flex-end", gap: 20 }}>
            {!isPreview && <CartLink slug={slug} className="t01-navlink" />}
          </nav>
        </div>
      </header>

      <main className="t01-shell">
        <div className="t01-d-main">
          {/* ── the plate ── */}
          <Parallax speed={6}>
            <Reveal scale={1.03} duration={1.1} y={22}>
              <figure style={{ margin: 0 }}>
                <div className={`t01-d-frame${images.length === 0 ? " t01-ornate-frame" : ""}`}>
                  <Carousel
                    images={images}
                    alt={product.title}
                    monogram={monogram(product.title)}
                    aspect="4 / 5"
                    thumbs
                    className="t01-d-slides"
                  />
                </div>
                <figcaption className="t01-d-figcap">
                  {images.length > 1 ? `Plate — ${images.length} views` : "Plate — single view"}
                </figcaption>
              </figure>
            </Reveal>
          </Parallax>

          {/* ── the entry ── */}
          <div>
            <Reveal y={16}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                <span style={{ ...caps, color: "var(--sf-accent)" }}>Edition print</span>
                <span aria-hidden style={{ flex: 1, alignSelf: "center", height: 1, background: "var(--sf-accent)", opacity: 0.5 }} />
              </div>
            </Reveal>
            <Reveal delay={0.08} y={20}>
              <h1 className="t01-d-title">{product.title}</h1>
            </Reveal>
            {product.subtitle && (
              <Reveal delay={0.16} y={14}>
                <p className="t01-d-sub">{product.subtitle}</p>
              </Reveal>
            )}
            <Reveal delay={0.22} y={14}>
              <div className="t01-d-priceline">
                <Price minor={product.priceMinor} currency={product.currency} fallback={product.priceText} className="t01-d-price" />
                <span className="t01-d-status">{product.available ? "In edition" : "Out of print"}</span>
              </div>
            </Reveal>
            {product.description && (
              <Reveal delay={0.28} y={16}>
                <p className="t01-d-desc t01-dropcap">{product.description}</p>
              </Reveal>
            )}
            <Reveal delay={0.34} y={14}>
              <div style={{ marginTop: 30 }}>
                <AddToCart
                  product={product}
                  config={config}
                  slug={slug}
                  fx="stamp"
                  className="t01-d-atc"
                  addedLabel="Added to the folio ✓"
                  style={{
                    width: "100%",
                    background: INK,
                    color: PAPER,
                    borderRadius: 0,
                    padding: "17px 24px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                />
                {isLinkOut && product.ctaUrl && (
                  <p className="t01-d-note">Opens {hostOf(product.ctaUrl)}</p>
                )}
                {!purchasable && config.contactUrl && (
                  <a className="t01-contact" href={config.contactUrl} target="_blank" rel="noopener noreferrer nofollow">
                    Enquire about this plate →
                  </a>
                )}
              </div>
            </Reveal>
          </div>
        </div>

        {/* ── more from the press ── */}
        {more.length > 0 && (
          <section className="t01-more-sec">
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 28 }}>
              <span style={{ ...caps, color: "rgba(28,26,23,.62)" }}>More from the press</span>
              <span aria-hidden style={{ flex: 1, alignSelf: "center", height: 1, background: "var(--sf-accent)", opacity: 0.5 }} />
              <span style={{ ...caps, color: "var(--sf-accent)" }}>{config.title}</span>
            </div>
            <div className="t01-more-row">
              {more.map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i * 0.07, 0.35)} y={18} style={{ flex: "0 0 auto" }}>
                  <Link href={hrefOf(p)} className="t01-mini">
                    <span className="t01-mini-frame" style={{ display: "block" }}>
                      <span className={`t01-mini-img${p.imageUrl ? "" : " t01-ornate"}`} style={{ display: "block" }}>
                        <StoreImage
                          src={p.imageUrl}
                          alt={p.title}
                          monogram={monogram(p.title)}
                          style={{ width: "100%", height: "100%", display: "block" }}
                        />
                      </span>
                    </span>
                    <span className="t01-mini-cap" style={{ display: "block" }}>
                      {p.title}
                      <Price minor={p.priceMinor} currency={p.currency} fallback={p.priceText} className="t01-mini-price" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
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
