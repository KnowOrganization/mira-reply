// t09-boutique — "The Ritual". Beauty / skincare / wellness: soft light, slow
// breathing, spa cadence. Prata display + Karla body on a blush-neutral base.
// Signature: soft-focus image reveals (blur → sharp) + a cursor-following
// spotlight; hero is a "water reflection" composition.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import { Reveal, SplitText } from "../../_motion";
import { Price } from "../_shared/Price";
import type { ListingProps, SfProduct } from "../_shared/types";
import { BG, F, HAIR, INK, MUTED, RitualImage, SOFTINK, WHISPER, excerpt, monogram, rootVars } from "./bits";
import Spotlight from "./Spotlight";

const PAD_X = "clamp(20px, 5vw, 56px)";

const eyebrow: React.CSSProperties = {
  fontFamily: F.body,
  fontSize: 11,
  letterSpacing: "0.26em",
  textTransform: "uppercase",
  color: MUTED,
};

function stepWord(p: SfProduct): string {
  const sub = p.subtitle?.split("·")[0]?.trim();
  return sub || p.title.split(/\s+/)[0];
}

const ctaStyle: React.CSSProperties = {
  background: "var(--sf-accent)",
  color: "var(--sf-accent-fg)",
  borderRadius: 999,
  padding: "10px 20px",
  fontFamily: F.body,
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

/* ── Hero "water reflection": image (or accent-wash circle) mirrored below
      itself with a gradient dissolve back into the page mist. ─────────────── */
function Reflection({ children, height, radius }: { children: [React.ReactNode, React.ReactNode]; height: string; radius: string }) {
  return (
    <div>
      {children[0]}
      <div aria-hidden style={{ position: "relative", height, overflow: "hidden", marginTop: 4, borderRadius: radius, opacity: 0.38 }}>
        <div style={{ transform: "scaleY(-1)", filter: "blur(2.5px)" }}>{children[1]}</div>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(247,241,238,0.2), ${BG} 88%)` }} />
      </div>
    </div>
  );
}

function HeroFigure({ config }: { config: ListingProps["config"] }) {
  if (config.heroImageUrl) {
    const frame: React.CSSProperties = { aspectRatio: "16 / 10", borderRadius: 14, overflow: "hidden", background: "var(--sf-accent-soft)" };
    return (
      <div style={{ maxWidth: 880, margin: "clamp(36px, 6vh, 64px) auto 0" }}>
        <Reflection height="clamp(64px, 15vw, 140px)" radius="0 0 14px 14px">
          <div className="t09-exhale" style={frame}>
            <StoreImage src={config.heroImageUrl} alt={config.heroHeadline} monogram={monogram(config.title)} eager style={{ width: "100%", height: "100%" }} />
          </div>
          <div style={frame}>
            <StoreImage src={config.heroImageUrl} alt="" monogram={monogram(config.title)} style={{ width: "100%", height: "100%" }} />
          </div>
        </Reflection>
      </div>
    );
  }
  const circle: React.CSSProperties = {
    aspectRatio: "1 / 1",
    borderRadius: "50%",
    background: "radial-gradient(circle at 35% 28%, color-mix(in srgb, var(--sf-accent), white 82%), var(--t09-wash) 80%)",
    boxShadow: "inset 0 -4px 14px rgba(255,255,255,.65), 0 10px 30px color-mix(in srgb, var(--sf-accent), transparent 82%)",
    display: "grid",
    placeItems: "center",
  };
  const letter: React.CSSProperties = {
    fontFamily: F.display,
    fontSize: "clamp(64px, 14vw, 110px)",
    color: "var(--t09-deep)",
    textShadow: "0 1px 0 rgba(255,255,255,.6)",
  };
  return (
    <div style={{ width: "min(300px, 62vw)", margin: "clamp(36px, 6vh, 64px) auto 0" }}>
      <Reflection height="clamp(52px, 11vw, 92px)" radius="0">
        <div style={circle}><span style={letter}>{monogram(config.title)}</span></div>
        <div style={{ ...circle, boxShadow: "none" }}><span style={letter}>{monogram(config.title)}</span></div>
      </Reflection>
    </div>
  );
}

/* ── The Ritual: one product per step, alternating image/text bands. ───────── */
function RitualStep({ p, i, config, slug }: { p: SfProduct; i: number; config: ListingProps["config"]; slug: string }) {
  const href = `/s/${slug}/p/${p.slug ?? p.id}`;
  return (
    <div className={`t09-band${i % 2 === 1 ? " t09-band-flip" : ""}`}>
      <Reveal blur scale={1.12} duration={1.2} className="t09-band-img">
        <Link href={href} style={{ display: "block", textDecoration: "none" }}>
          <RitualImage src={p.imageUrl} alt={p.title} title={p.title} aspect="4 / 5" radius={14} />
        </Link>
      </Reveal>
      <div>
        <Reveal duration={1.2} delay={0.12} y={20}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 18 }}>
            <span style={{ fontFamily: F.display, fontSize: 15, color: "var(--t09-deep)" }}>{String(i + 1).padStart(2, "0")}</span>
            <span style={{ ...eyebrow }}>— {stepWord(p)}</span>
          </div>
          <h3 style={{ margin: "0 0 14px", fontFamily: F.display, fontWeight: 400, fontSize: "clamp(26px, 3.4vw, 40px)", lineHeight: 1.2, letterSpacing: "0.005em" }}>
            <Link href={href} className="t09-tlink" style={{ color: "inherit", textDecoration: "none" }}>{p.title}</Link>
          </h3>
          {p.description && (
            <p style={{ margin: "0 0 24px", maxWidth: "44ch", fontSize: 15, lineHeight: 1.8, color: SOFTINK }}>{excerpt(p.description)}</p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <Price minor={p.priceMinor} currency={p.currency} fallback={p.priceText} style={{ fontSize: 15.5, color: INK, fontVariantNumeric: "tabular-nums", letterSpacing: "0.04em" }} />
            <AddToCart product={p} config={config} slug={slug} variant="compact" className="t09-cta" style={ctaStyle} label={config.buyLabel} fx="liquid" />
          </div>
        </Reveal>
      </div>
    </div>
  );
}

/* ── The Shelf: remaining products, minimal 2-col grid, quiet captions. ────── */
function ShelfCard({ p, config, slug }: { p: SfProduct; config: ListingProps["config"]; slug: string }) {
  const href = `/s/${slug}/p/${p.slug ?? p.id}`;
  return (
    <article>
      <Link href={href} style={{ display: "block", textDecoration: "none" }}>
        <Reveal blur scale={1.12} duration={1.2}>
          <RitualImage src={p.imageUrl} alt={p.title} title={p.title} aspect="4 / 5" radius={12} />
        </Reveal>
      </Link>
      <div style={{ paddingTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
          <Link href={href} className="t09-tlink" style={{ color: "inherit", textDecoration: "none" }}>
            <h3 style={{ margin: 0, fontFamily: F.display, fontWeight: 400, fontSize: 19, lineHeight: 1.35 }}>{p.title}</h3>
          </Link>
          <Price minor={p.priceMinor} currency={p.currency} fallback={p.priceText} style={{ fontSize: 13.5, color: SOFTINK, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }} />
        </div>
        {p.subtitle && <div style={{ marginTop: 6, fontSize: 12, letterSpacing: "0.06em", color: MUTED }}>{p.subtitle}</div>}
        <div style={{ marginTop: 14 }}>
          <AddToCart product={p} config={config} slug={slug} variant="compact" className="t09-cta" style={ctaStyle} label={config.buyLabel} fx="liquid" />
        </div>
      </div>
    </article>
  );
}

export default function Listing({ config, products, slug }: ListingProps) {
  const isPreview = slug.startsWith("preview");
  const featured = config.featuredIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as SfProduct[];
  const ritual = config.showFeatured ? (featured.length ? featured : products).slice(0, 3) : [];
  const ritualIds = new Set(ritual.map((p) => p.id));
  const shelf = products.filter((p) => !ritualIds.has(p.id));
  const showShelf = shelf.length > 0 && (config.showDiscover || ritual.length === 0);

  return (
    <div className={`${F.className} t09-root`} style={rootVars(config.accent, config.accentFg)}>
      <style>{`
        .t09-h1 { font-family: ${F.display}; font-size: clamp(40px, 8.5vw, 104px); line-height: 1.1; font-weight: 400; letter-spacing: 0.005em; margin: 0; color: ${INK}; }
        .t09-navlinks { display: flex; align-items: center; gap: 26px; }
        .t09-navlinks a { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: ${MUTED}; text-decoration: none; transition: color .4s ease; }
        .t09-navlinks a:hover { color: ${INK}; }
        .t09-tlink { transition: color .4s ease; }
        .t09-tlink:hover { color: var(--t09-deep); }
        .t09-exhale img { transition: transform .8s cubic-bezier(.22,1,.36,1); }
        .t09-exhale:hover img { transform: scale(1.02); }
        .t09-cta::before { content: ""; position: absolute; inset: 0; background: var(--t09-deep); transform: scaleY(0); transform-origin: bottom; transition: transform .5s cubic-bezier(.22,1,.36,1); }
        .t09-cta:hover::before { transform: scaleY(1); }
        .t09-cta > * { position: relative; z-index: 1; }
        .t09-band { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(32px, 7vw, 100px); align-items: center; }
        .t09-band-flip .t09-band-img { order: 2; }
        .t09-shelf { display: grid; grid-template-columns: repeat(2, 1fr); gap: clamp(48px, 7vw, 80px) clamp(24px, 4vw, 56px); }
        .t09-breathe { position: relative; border-radius: 28px; overflow: hidden; }
        .t09-breathe::before { content: ""; position: absolute; inset: 0; background: var(--t09-wash); opacity: .5; animation: t09-breathe 8s ease-in-out infinite alternate; }
        @keyframes t09-breathe { from { opacity: .5; } to { opacity: 1; } }
        @media (max-width: 760px) {
          .t09-band { grid-template-columns: 1fr; gap: 26px; }
          .t09-band-flip .t09-band-img { order: 0; }
        }
        @media (max-width: 640px) { .t09-shelf { grid-template-columns: 1fr; } }
        @media (max-width: 560px) {
          .t09-navlinks { gap: 14px; }
          .t09-navlinks a { font-size: 9.5px; letter-spacing: 0.14em; }
        }
        @media (prefers-reduced-motion: reduce) {
          .t09-breathe::before { animation: none; opacity: .75; }
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
          {ritual.length > 0 && <a href="#ritual">The Ritual</a>}
          {showShelf && <a href="#shelf">The Shelf</a>}
          {config.showAbout && <a href="#about">About</a>}
          {!isPreview && <Link href={`/s/${slug}/cart`}>Cart</Link>}
        </nav>
      </header>

      {/* ── hero: headline written letter by letter, water-reflection figure ─ */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: `clamp(40px, 9vh, 96px) ${PAD_X} clamp(24px, 5vh, 48px)`, textAlign: "center" }}>
        <SplitText by="chars" rotate={0} as="h1" className="t09-h1">{config.heroHeadline}</SplitText>
        {config.heroTagline && (
          <Reveal delay={0.5} duration={1.4} y={12}>
            <p style={{ margin: "22px auto 0", maxWidth: "52ch", fontStyle: "italic", fontSize: 15.5, lineHeight: 1.75, color: MUTED }}>{config.heroTagline}</p>
          </Reveal>
        )}
        <Reveal blur scale={1.04} duration={1.4} delay={0.15}>
          <HeroFigure config={config} />
        </Reveal>
      </section>

      {/* ── the ritual steps ─────────────────────────────────────────────── */}
      {ritual.length > 0 && (
        <section id="ritual" style={{ maxWidth: 1140, margin: "0 auto", padding: `clamp(48px, 9vw, 110px) ${PAD_X}`, scrollMarginTop: 40 }}>
          <Reveal blur duration={1.3}>
            <div style={{ ...eyebrow, textAlign: "center", marginBottom: "clamp(44px, 8vw, 84px)" }}>
              The Ritual — {ritual.length === 1 ? "one quiet step" : `${["", "", "two quiet steps", "three quiet steps"][ritual.length]}`}
            </div>
          </Reveal>
          <div style={{ display: "grid", gap: "clamp(64px, 12vh, 140px)" }}>
            {ritual.map((p, i) => <RitualStep key={p.id} p={p} i={i} config={config} slug={slug} />)}
          </div>
        </section>
      )}

      {/* ── the shelf ────────────────────────────────────────────────────── */}
      {showShelf && (
        <section id="shelf" style={{ maxWidth: 980, margin: "0 auto", padding: `clamp(48px, 9vw, 110px) ${PAD_X}`, scrollMarginTop: 40 }}>
          <Reveal blur duration={1.3}>
            <div style={{ textAlign: "center", marginBottom: "clamp(40px, 7vw, 72px)" }}>
              <div style={eyebrow}>The Shelf</div>
              <div style={{ width: 36, height: 1, background: HAIR, margin: "16px auto 0" }} />
            </div>
          </Reveal>
          <div className="t09-shelf">
            {shelf.map((p) => <ShelfCard key={p.id} p={p} config={config} slug={slug} />)}
          </div>
        </section>
      )}

      {products.length === 0 && (
        <section style={{ maxWidth: 560, margin: "0 auto", padding: `clamp(48px, 9vw, 110px) ${PAD_X}`, textAlign: "center" }}>
          <div style={{ background: "var(--sf-accent-soft)", borderRadius: 24, padding: "56px 28px" }}>
            <div style={{ fontFamily: F.display, fontSize: 22, marginBottom: 10 }}>The shelf is being arranged</div>
            <p style={{ margin: 0, fontSize: 14, color: MUTED }}>New rituals are on their way. Breathe — and check back soon.</p>
          </div>
        </section>
      )}

      {/* ── breathing about ──────────────────────────────────────────────── */}
      {config.showAbout && (
        <section id="about" style={{ maxWidth: 760, margin: "0 auto", padding: `clamp(40px, 7vw, 90px) ${PAD_X}`, scrollMarginTop: 40 }}>
          <Reveal blur duration={1.4}>
            <div className="t09-breathe">
              <div style={{ position: "relative", textAlign: "center", padding: "clamp(40px, 8vw, 76px) clamp(24px, 6vw, 64px)" }}>
                <div style={{ ...eyebrow, color: "var(--t09-deep)", marginBottom: 20 }}>Our ritual</div>
                <p style={{ margin: 0, fontFamily: F.display, fontSize: "clamp(18px, 2.6vw, 25px)", lineHeight: 1.6, whiteSpace: "pre-line", color: INK }}>{config.about}</p>
                {config.contactUrl && (
                  <a href={config.contactUrl} target="_blank" rel="noopener noreferrer nofollow"
                    style={{ display: "inline-block", marginTop: 26, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: INK, textDecoration: "none", borderBottom: `1px solid ${INK}`, paddingBottom: 3 }}>
                    Write to us
                  </a>
                )}
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* ── whisper footer ───────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${HAIR}`, marginTop: "clamp(24px, 5vw, 56px)", padding: `22px ${PAD_X}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: WHISPER }}>
        <span>{config.title}</span>
        <span>Slowly, gently</span>
        <span>Mira</span>
      </footer>
    </div>
  );
}
