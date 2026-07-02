// t09-boutique — "The Ritual" detail. Carousel gallery (4/5), Prata name,
// quiet Karla-caps price top-right, "The ritual" description block, liquid
// taupe Add-to-ritual CTA, and a "Complete the ritual" 3-up.
import Link from "next/link";
import AddToCart from "../../_components/AddToCart";
import { Carousel, Reveal } from "../../_motion";
import { Price } from "../_shared/Price";
import type { DetailProps, SfProduct } from "../_shared/types";
import { BG, F, HAIR, INK, MUTED, RitualImage, SOFTINK, WHISPER, monogram, rootVars } from "./bits";
import Spotlight from "./Spotlight";

const PAD_X = "clamp(20px, 5vw, 56px)";

const eyebrow: React.CSSProperties = {
  fontFamily: F.body,
  fontSize: 11,
  letterSpacing: "0.26em",
  textTransform: "uppercase",
  color: MUTED,
};

function MoreCard({ p, slug }: { p: SfProduct; slug: string }) {
  return (
    <Link href={`/s/${slug}/p/${p.slug ?? p.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
      <Reveal blur scale={1.12} duration={1.2}>
        <RitualImage src={p.imageUrl} alt={p.title} title={p.title} aspect="1 / 1" radius={10} />
      </Reveal>
      <div className="t09-tlink" style={{ paddingTop: 12, fontFamily: F.display, fontSize: 14.5, lineHeight: 1.4 }}>{p.title}</div>
      <Price minor={p.priceMinor} currency={p.currency} fallback={p.priceText} style={{ display: "block", marginTop: 4, fontSize: 12, color: MUTED, fontVariantNumeric: "tabular-nums" }} />
    </Link>
  );
}

export default function Detail({ config, product, more, slug }: DetailProps) {
  const isPreview = slug.startsWith("preview");
  const gallery = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];

  return (
    <div className={`${F.className} t09-root`} style={rootVars(config.accent, config.accentFg)}>
      <style>{`
        .t09-navlinks { display: flex; align-items: center; gap: 26px; }
        .t09-navlinks a { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: ${MUTED}; text-decoration: none; transition: color .4s ease; }
        .t09-navlinks a:hover { color: ${INK}; }
        .t09-tlink { transition: color .4s ease; }
        a:hover > .t09-tlink, .t09-tlink:hover { color: var(--t09-deep); }
        .t09-exhale img { transition: transform .8s cubic-bezier(.22,1,.36,1); }
        .t09-exhale:hover img { transform: scale(1.02); }
        .t09-cta::before { content: ""; position: absolute; inset: 0; background: color-mix(in srgb, var(--sf-accent) 55%, #3e3733); transform: scaleY(0); transform-origin: bottom; transition: transform .5s cubic-bezier(.22,1,.36,1); }
        .t09-cta:hover::before { transform: scaleY(1); }
        .t09-cta > * { position: relative; z-index: 1; }
        .t09-det { display: grid; grid-template-columns: 1.05fr 1fr; gap: clamp(36px, 6vw, 88px); align-items: start; }
        .t09-more { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(14px, 3vw, 28px); }
        @media (max-width: 820px) {
          .t09-det { grid-template-columns: 1fr; gap: 32px; }
        }
        @media (max-width: 560px) {
          .t09-navlinks { gap: 14px; }
          .t09-navlinks a { font-size: 9.5px; letter-spacing: 0.14em; }
        }
        @media (prefers-reduced-motion: reduce) {
          .t09-exhale img, .t09-cta::before, .t09-tlink, .t09-navlinks a { transition: none; }
        }
      `}</style>

      <Spotlight />

      {/* ── airy nav ─────────────────────────────────────────────────────── */}
      <header style={{ padding: `clamp(24px, 4.5vw, 40px) ${PAD_X}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <Link href={`/s/${slug}`} style={{ fontFamily: F.display, fontSize: "clamp(17px, 2.4vw, 21px)", color: INK, textDecoration: "none", letterSpacing: "0.02em" }}>
          {config.title}
        </Link>
        <nav className="t09-navlinks">
          <Link href={`/s/${slug}`}>← The shop</Link>
          {!isPreview && <Link href={`/s/${slug}/cart`}>Cart</Link>}
        </nav>
      </header>

      {/* ── product ──────────────────────────────────────────────────────── */}
      <main className="t09-det" style={{ maxWidth: 1140, margin: "0 auto", padding: `clamp(16px, 3vh, 40px) ${PAD_X} clamp(48px, 8vw, 96px)` }}>
        <Reveal blur scale={1.06} duration={1.2}>
          {gallery.length > 0 ? (
            <Carousel images={gallery} alt={product.title} monogram={monogram(product.title)} aspect="4 / 5" radius={12} thumbs={gallery.length > 1} />
          ) : (
            <RitualImage src={null} alt={product.title} title={product.title} aspect="4 / 5" radius={12} />
          )}
        </Reveal>

        <Reveal duration={1.3} delay={0.1} y={20}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, marginBottom: 18 }}>
            <span style={eyebrow}>{product.subtitle ?? config.title}</span>
            <Price minor={product.priceMinor} currency={product.currency} fallback={product.priceText}
              style={{ fontFamily: F.body, fontSize: 13.5, letterSpacing: "0.14em", textTransform: "uppercase", color: SOFTINK, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }} />
          </div>

          <h1 style={{ margin: "0 0 26px", fontFamily: F.display, fontWeight: 400, fontSize: "clamp(30px, 5vw, 54px)", lineHeight: 1.15, letterSpacing: "0.005em" }}>
            {product.title}
          </h1>

          <div style={{ height: 1, background: HAIR, marginBottom: 26 }} />

          {product.description && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ ...eyebrow, color: "var(--t09-deep)", marginBottom: 12 }}>The ritual</div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.85, color: SOFTINK, whiteSpace: "pre-line" }}>{product.description}</p>
            </div>
          )}

          <AddToCart
            product={product}
            config={config}
            slug={slug}
            className="t09-cta"
            style={{
              background: INK,
              color: BG,
              borderRadius: 8,
              width: "100%",
              padding: "17px 24px",
              fontFamily: F.body,
              fontSize: 13.5,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
            label="Add to ritual"
            addedLabel="In your ritual ✓"
            fx="liquid"
          />
          {!product.available && (
            <p style={{ margin: "14px 0 0", fontSize: 12.5, fontStyle: "italic", color: MUTED, textAlign: "center" }}>
              Resting for now — this piece returns soon.
            </p>
          )}
        </Reveal>
      </main>

      {/* ── complete the ritual ──────────────────────────────────────────── */}
      {more.length > 0 && (
        <section style={{ maxWidth: 980, margin: "0 auto", padding: `0 ${PAD_X} clamp(56px, 9vw, 110px)` }}>
          <Reveal blur duration={1.3}>
            <div style={{ textAlign: "center", marginBottom: "clamp(28px, 5vw, 48px)" }}>
              <div style={eyebrow}>Complete the ritual</div>
              <div style={{ width: 36, height: 1, background: HAIR, margin: "16px auto 0" }} />
            </div>
          </Reveal>
          <div className="t09-more">
            {more.slice(0, 3).map((p) => <MoreCard key={p.id} p={p} slug={slug} />)}
          </div>
        </section>
      )}

      {/* ── whisper footer ───────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${HAIR}`, padding: `22px ${PAD_X}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: WHISPER }}>
        <span>{config.title}</span>
        <span>Slowly, gently</span>
        <span>Mira</span>
      </footer>
    </div>
  );
}
