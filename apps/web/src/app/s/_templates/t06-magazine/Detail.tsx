// t06-magazine Detail — a true magazine spread. The plate (Carousel, 3/4)
// bleeds the left column full-height on desktop; the right column reads like
// an article: "FROM THE ISSUE" kicker, Bodoni headline, drop-cap body, price
// as a margin folio annotation, and a black block "ADD TO BAG" (page-curl fx).
// `more` becomes a text-only "CONTINUED ON…" index with folio numbers.
import Link from "next/link";
import AddToCart from "../../_components/AddToCart";
import { Price } from "../_shared/Price";
import { TEMPLATE_FONTS } from "../_shared/fonts";
import { Carousel, Reveal, SplitText } from "../../_motion";
import type { DetailProps } from "../_shared/types";

const F = TEMPLATE_FONTS["t06-magazine"];
const PAPER = "#fbfaf8";
const INK = "#141310";

const monogram = (s: string) => (s.trim()[0] || "M").toUpperCase();
const pad2 = (n: number) => String(n).padStart(2, "0");

export default function Detail({ config, product, more, slug }: DetailProps) {
  const isPreview = slug.startsWith("preview");
  const showCart = !isPreview && config.checkoutEnabled;
  const imgs = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];

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
        .t06-ulink { background-image: linear-gradient(var(--sf-accent), var(--sf-accent)); background-size: 0% 2px; background-repeat: no-repeat; background-position: 0 100%; padding-bottom: 2px; transition: background-size .38s cubic-bezier(.16,1,.3,1); text-decoration: none; }
        .t06-ulink:hover, .t06-ulink:focus-visible { background-size: 100% 2px; }
        .t06-u { background-image: linear-gradient(var(--sf-accent), var(--sf-accent)); background-size: 0% 2px; background-repeat: no-repeat; background-position: 0 100%; padding-bottom: 2px; transition: background-size .38s cubic-bezier(.16,1,.3,1); }
        a:hover .t06-u, a:focus-visible .t06-u { background-size: 100% 2px; }

        .t06-dbar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: baseline; gap: 12px; padding: 14px clamp(16px, 4vw, 48px); border-bottom: 1px solid #141310; }
        .t06-dbar-title { font-family: var(--font-bodoni), 'Didot', Georgia, serif; font-size: clamp(18px, 2.6vw, 26px); font-weight: 500; text-transform: uppercase; letter-spacing: .02em; text-align: center; }

        .t06-dgrid { display: grid; grid-template-columns: 55fr 45fr; align-items: start; }
        .t06-dmedia { position: sticky; top: 0; }
        .t06-dmedia-in { max-width: min(100%, calc(88svh * 0.75)); }
        .t06-dplate-cap { display: flex; justify-content: space-between; gap: 12px; padding: 10px 14px; border-top: 1px solid rgba(20, 19, 16, .2); }
        .t06-dframe { border-right: 1px solid rgba(20, 19, 16, .16); border-bottom: 1px solid rgba(20, 19, 16, .16); }
        .t06-dtxt { padding: clamp(28px, 5vw, 76px) clamp(20px, 4.5vw, 64px) clamp(40px, 6vw, 88px); }
        .t06-dnote { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; }
        .t06-dprice { font-family: var(--font-bodoni), Georgia, serif; font-style: italic; font-size: 16px; color: var(--sf-accent); border-left: 2px solid var(--sf-accent); padding-left: 10px; white-space: nowrap; }
        .t06-dheadline { font-family: var(--font-bodoni), 'Didot', Georgia, serif; font-size: clamp(36px, 7vw, 84px); font-weight: 500; line-height: .96; letter-spacing: -.015em; margin: 14px 0 10px; }
        .t06-dstand { font-family: var(--font-bodoni), Georgia, serif; font-style: italic; font-size: 18px; line-height: 1.5; color: rgba(20, 19, 16, .74); margin: 0 0 18px; }
        .t06-ddesc { font-size: 15px; line-height: 1.8; color: rgba(20, 19, 16, .84); white-space: pre-line; max-width: 52ch; margin: 0 0 30px; }
        .t06-ddesc::first-letter { font-family: var(--font-bodoni), Georgia, serif; font-weight: 500; font-size: 3.4em; line-height: .76; float: left; padding: .06em .14em 0 0; color: #141310; }

        .t06-dcont { border-top: 1px solid #141310; padding: clamp(28px, 5vw, 64px) clamp(16px, 4vw, 48px) clamp(44px, 7vw, 88px); }
        .t06-dcont-head { display: flex; align-items: baseline; gap: 18px; margin-bottom: 8px; }
        .t06-dcont-rule { flex: 1; height: 1px; background: rgba(20, 19, 16, .22); }
        .t06-dcont-row { display: grid; grid-template-columns: 52px 1fr auto; align-items: baseline; gap: 16px; padding: 16px 0; border-bottom: 1px solid rgba(20, 19, 16, .16); text-decoration: none; }
        .t06-dcont-title { font-family: var(--font-bodoni), Georgia, serif; font-style: italic; font-size: clamp(20px, 2.6vw, 30px); line-height: 1.1; }
        .t06-dcont-price { font-size: 12px; color: rgba(20, 19, 16, .6); letter-spacing: .04em; }

        .t06-dback { background: #12100d; color: #fbfaf8; padding: clamp(28px, 5vh, 56px) clamp(16px, 4vw, 48px); display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; flex-wrap: wrap; }
        .t06-dback-title { font-family: var(--font-bodoni), 'Didot', Georgia, serif; font-size: clamp(26px, 5vw, 48px); font-weight: 500; text-transform: uppercase; line-height: .95; }
        .t06-barcode { width: 106px; height: 40px; background: repeating-linear-gradient(90deg, #fbfaf8 0 2px, transparent 2px 4px, #fbfaf8 4px 7px, transparent 7px 9px, #fbfaf8 9px 10px, transparent 10px 14px); }

        @media (max-width: 880px) {
          .t06-dgrid { grid-template-columns: 1fr; }
          .t06-dmedia { position: static; }
          .t06-dmedia-in { max-width: none; }
          .t06-dframe { border-right: none; }
          .t06-dtxt { padding: 24px 18px 44px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .t06-root * { transition-duration: .01ms !important; }
        }
      `}</style>

      {/* top bar */}
      <header className="t06-dbar">
        <Link href={`/s/${slug}`} className="t06-kicker t06-ulink" style={{ justifySelf: "start" }}>
          ← The Issue
        </Link>
        <div className="t06-dbar-title">{config.title}</div>
        {showCart ? (
          <Link href={`/s/${slug}/cart`} className="t06-kicker t06-ulink" style={{ justifySelf: "end" }}>
            Bag
          </Link>
        ) : (
          <span />
        )}
      </header>
      <div style={{ height: 2, background: "var(--sf-accent)" }} aria-hidden />

      {/* the spread */}
      <main className="t06-dgrid">
        <div className="t06-dmedia">
          <div className={`t06-dmedia-in${imgs.length === 0 ? " t06-dframe" : ""}`}>
            <Carousel
              images={imgs}
              alt={product.title}
              monogram={monogram(product.title)}
              aspect="3 / 4"
              thumbs={imgs.length > 1}
            />
            {imgs.length === 0 ? (
              <div className="t06-dplate-cap">
                <span className="t06-kicker t06-accent">Plate 01</span>
                <span className="t06-kicker" style={{ color: "rgba(20,19,16,.5)" }}>Photograph forthcoming</span>
              </div>
            ) : null}
          </div>
        </div>

        <article className="t06-dtxt">
          <Reveal y={14}>
            <div className="t06-dnote">
              <span className="t06-kicker t06-accent">From the issue</span>
              <Price minor={product.priceMinor} currency={product.currency} fallback={product.priceText} className="t06-dprice" />
            </div>
          </Reveal>
          <h1 className="t06-dheadline">
            <SplitText by="words" as="span">{product.title}</SplitText>
          </h1>
          {product.subtitle ? (
            <Reveal delay={0.08} y={12}>
              <p className="t06-dstand">{product.subtitle}</p>
            </Reveal>
          ) : null}
          {product.description ? (
            <Reveal delay={0.14} y={16}>
              <p className="t06-ddesc">{product.description}</p>
            </Reveal>
          ) : null}
          <Reveal delay={0.2} y={12}>
            <div>
              <AddToCart
                product={product}
                config={config}
                slug={slug}
                fx="page-curl"
                label="Add to bag"
                addedLabel="In your bag — P.1"
                style={{
                  display: "flex",
                  width: "100%",
                  maxWidth: 420,
                  background: INK,
                  color: PAPER,
                  borderRadius: 0,
                  padding: "17px 24px",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: ".22em",
                  textTransform: "uppercase",
                  fontFamily: F.body,
                }}
              />
              {/* no price + no ctaUrl → AddToCart renders null; offer the desk instead */}
              {product.priceMinor == null && !product.ctaUrl && config.contactUrl ? (
                <a href={config.contactUrl} target="_blank" rel="noopener noreferrer" className="t06-kicker t06-ulink t06-accent">
                  Enquire at the desk
                </a>
              ) : null}
              {!product.available ? (
                <p className="t06-display" style={{ fontStyle: "italic", fontSize: 15, color: "rgba(20,19,16,.6)", marginTop: 14 }}>
                  This piece is sold through for Issue 001.
                </p>
              ) : null}
              <div className="t06-kicker" style={{ marginTop: 18, color: "rgba(20,19,16,.45)" }}>
                Issue 001 · {config.title}
              </div>
            </div>
          </Reveal>
        </article>
      </main>

      {/* continued on… */}
      {more.length > 0 ? (
        <section className="t06-dcont" aria-label="Continued in this issue">
          <div className="t06-dcont-head">
            <span className="t06-kicker t06-accent">Continued on…</span>
            <div className="t06-dcont-rule" aria-hidden />
          </div>
          {more.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.06} y={16}>
              <Link href={`/s/${slug}/p/${p.slug ?? p.id}`} className="t06-dcont-row">
                <span className="t06-kicker t06-accent">P.{pad2(i + 2)}</span>
                <span className="t06-dcont-title t06-u">{p.title}</span>
                <Price minor={p.priceMinor} currency={p.currency} fallback={p.priceText} className="t06-dcont-price" />
              </Link>
            </Reveal>
          ))}
        </section>
      ) : null}

      {/* back-cover strip */}
      <footer className="t06-dback">
        <div className="t06-dback-title">{config.title}</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div className="t06-barcode" aria-hidden />
            <div className="t06-kicker" style={{ marginTop: 8, color: "rgba(251,250,248,.7)" }}>
              Published digitally · Issue 001
            </div>
          </div>
          <span className="t06-kicker" style={{ color: "rgba(251,250,248,.45)" }}>Powered by Mira</span>
        </div>
      </footer>
    </div>
  );
}
