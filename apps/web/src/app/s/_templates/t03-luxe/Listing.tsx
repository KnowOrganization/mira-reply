// t03-luxe — "The Vitrine". Haute jewelry in a near-black case: one beam of
// light, arch-masked pieces, metallized shimmer rules, Cormorant Light display
// over Jost spaced caps. RSC — all motion via kit islands (Reveal / SplitText /
// Magnetic) + scoped CSS keyframes in the single <style> block below.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import { Reveal, SplitText, Magnetic } from "../../_motion";
import { TEMPLATE_FONTS } from "../_shared/fonts";
import { Price } from "../_shared/Price";
import type { ListingProps, SfProduct, StorefrontConfig } from "../_shared/types";

const F = TEMPLATE_FONTS["t03-luxe"];
const BG = "#0e0d0b";
const BONE = "#ece7dd";
const BONE_60 = "rgba(236,231,221,.62)";
const BONE_40 = "rgba(236,231,221,.42)";
const HAIR = "1px solid rgba(236,231,221,.14)";
const ARCH = "50% 50% 0 0 / 38% 38% 0 0";
const ROMAN = ["I", "II", "III"];

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();

const label: React.CSSProperties = {
  fontFamily: F.body,
  fontSize: 11,
  fontWeight: 400,
  letterSpacing: "0.32em",
  textTransform: "uppercase",
  color: BONE_60,
};

// Engraved ghost button — transparent, hairline bone border, spaced caps.
const ghost: React.CSSProperties = {
  background: "transparent",
  color: BONE,
  border: "1px solid rgba(236,231,221,.35)",
  borderRadius: 0,
  textTransform: "uppercase",
  letterSpacing: "0.22em",
  fontSize: 10.5,
  fontWeight: 400,
  fontFamily: F.body,
  padding: "11px 24px",
};

function rootVars(config: StorefrontConfig): React.CSSProperties {
  return {
    ["--sf-accent" as string]: config.accent,
    ["--sf-accent-fg" as string]: config.accentFg,
    ["--sf-accent-soft" as string]: `color-mix(in srgb, ${config.accent} 13%, #16130e)`,
    background: BG,
    color: BONE,
    fontFamily: F.body,
    minHeight: "100vh",
  };
}

/** Shimmer the closing phrase of the maison statement (deterministic split). */
function splitAbout(about: string): [string, string] {
  const words = about.trim().split(/\s+/);
  if (words.length < 8) return [about, ""];
  const n = Math.min(8, Math.max(4, Math.round(words.length * 0.16)));
  return [words.slice(0, words.length - n).join(" ") + " ", words.slice(words.length - n).join(" ")];
}

function Rule({ style }: { style?: React.CSSProperties }) {
  return <div aria-hidden className="t03-rule" style={style} />;
}

/** Tall arch vitrine mask. fontFamily is set so the monogram tile inherits Cormorant. */
function Arch({ p, eager }: { p: SfProduct; eager?: boolean }) {
  return (
    <div
      className="t03-glintbox t03-arch"
      style={{
        aspectRatio: "3 / 4",
        borderRadius: ARCH,
        border: HAIR,
        background: "var(--sf-accent-soft)",
        fontFamily: F.display,
      }}
    >
      <StoreImage
        src={p.imageUrl}
        alt={p.title}
        monogram={monogram(p.title)}
        eager={eager}
        className="t03-arch-img"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

function Caption({
  p,
  config,
  slug,
  href,
  priceClass,
  big,
}: {
  p: SfProduct;
  config: StorefrontConfig;
  slug: string;
  href: string;
  priceClass?: string;
  big?: boolean;
}) {
  return (
    <div style={{ textAlign: "center", marginTop: big ? 34 : 24 }}>
      <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
        <div
          style={{
            fontFamily: F.display,
            fontWeight: 400,
            fontSize: big ? "clamp(30px, 5vw, 44px)" : 22,
            letterSpacing: "0.02em",
            lineHeight: 1.2,
          }}
        >
          {p.title}
        </div>
      </Link>
      {p.subtitle && (
        <div style={{ ...label, fontSize: 9.5, letterSpacing: "0.26em", color: BONE_40, marginTop: 9 }}>{p.subtitle}</div>
      )}
      <div className={priceClass} style={{ marginTop: 11 }}>
        <Price
          minor={p.priceMinor}
          currency={p.currency}
          fallback={p.priceText}
          style={{ fontFamily: F.body, fontSize: big ? 14 : 12.5, letterSpacing: "0.16em", color: BONE_60 }}
        />
      </div>
      <div style={{ marginTop: 16 }}>
        <AddToCart
          product={p}
          config={config}
          slug={slug}
          variant="compact"
          fx="shimmer"
          label={config.buyLabel}
          className="t03-cta"
          style={{ ...ghost, padding: big ? "12px 30px" : "9px 20px", fontSize: big ? 10.5 : 9.5 }}
        />
      </div>
    </div>
  );
}

function SectionHead({ num, title }: { num: string; title: string }) {
  return (
    <Reveal duration={1}>
      <div style={{ textAlign: "center", marginBottom: 60 }}>
        <div style={{ ...label, fontSize: 10, color: "color-mix(in srgb, var(--sf-accent) 78%, #ece7dd)" }}>{num}</div>
        <h2 style={{ fontFamily: F.display, fontWeight: 300, fontSize: "clamp(28px, 4.4vw, 44px)", letterSpacing: "0.02em", margin: "12px 0 0" }}>
          {title}
        </h2>
        <Rule style={{ width: 76, margin: "22px auto 0" }} />
      </div>
    </Reveal>
  );
}

export default function Listing({ config, products, slug }: ListingProps) {
  const isPreview = slug.startsWith("preview");
  const href = (p: SfProduct) => `/s/${slug}/p/${p.slug ?? p.id}`;

  const few = products.length > 0 && products.length <= 3; // empty-state law: 1–3 pieces → full-viewport sections
  const featuredPicks = (
    config.featuredIds.length
      ? (config.featuredIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) as SfProduct[])
      : products.slice(0, 3)
  ).slice(0, 3);
  const featured = !few && config.showFeatured ? featuredPicks : [];
  const rest = products.filter((p) => !featured.some((f) => f.id === p.id));
  const showGrid = !few && rest.length > 0 && (config.showDiscover || featured.length === 0);
  const [aboutPre, aboutGlow] = splitAbout(config.about);

  return (
    <div className={F.className} style={rootVars(config)}>
      <style>{`
        /* ── metallized shimmer rule ─────────────────────────────────────── */
        .t03-rule { height: 1px; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--sf-accent, #c9a227) 85%, #ece7dd) 50%, transparent); background-size: 240% 100%; animation: t03-shimmer 6.5s linear infinite; opacity: .85; }
        @keyframes t03-shimmer { 0% { background-position: 170% 0; } 100% { background-position: -170% 0; } }
        /* ── hero: the light turns on after ~1.2s of darkness ────────────── */
        .t03-hero { min-height: 92vh; min-height: 92svh; }
        .t03-bloom { background: radial-gradient(24% 30% at 66% 38%, rgba(236,231,221,.20), transparent 70%), radial-gradient(56% 62% at 64% 40%, rgba(236,231,221,.10), rgba(236,231,221,.03) 55%, transparent 75%); animation: t03-light-on 1.4s ease 1.2s both, t03-breathe 9s ease-in-out 3.4s infinite alternate; }
        @keyframes t03-light-on { from { opacity: 0; } to { opacity: 1; } }
        @keyframes t03-breathe { from { opacity: 1; } to { opacity: .72; } }
        .t03-orb { opacity: 0; animation: t03-orb-on 1.8s ease 1.35s forwards, t03-orb-drift 16s ease-in-out 3.2s infinite alternate; }
        @keyframes t03-orb-on { to { opacity: .4; } }
        @keyframes t03-orb-drift { from { transform: translate3d(0,0,0); } to { transform: translate3d(-6%, 4%, 0); } }
        .t03-hero-photo { opacity: 0; animation: t03-photo-on 1.9s ease 1.25s forwards; -webkit-mask-image: radial-gradient(78% 78% at 63% 40%, #000 26%, transparent 74%); mask-image: radial-gradient(78% 78% at 63% 40%, #000 26%, transparent 74%); filter: saturate(.9) contrast(1.03); }
        @keyframes t03-photo-on { to { opacity: .3; } }
        .t03-hh { opacity: 0; animation: t03-type-on .9s ease 1.05s forwards; }
        @keyframes t03-type-on { to { opacity: 1; } }
        .t03-hh-text { font-family: ${F.display}; font-weight: 300; font-size: clamp(44px, 9vw, 120px); line-height: 1.04; letter-spacing: 0; margin: 0; color: ${BONE}; }
        /* ── arch vitrines + glint sweep ─────────────────────────────────── */
        .t03-glintbox { position: relative; overflow: hidden; }
        .t03-glintbox::after { content: ""; position: absolute; inset: 0; background: linear-gradient(112deg, transparent 38%, color-mix(in srgb, var(--sf-accent, #c9a227) 28%, rgba(255,255,255,.55)) 50%, transparent 62%); transform: translateX(-135%); pointer-events: none; }
        .t03-arch-img { transition: transform 1.3s cubic-bezier(.16,1,.3,1); font-weight: 300 !important; font-size: clamp(52px, 9vw, 110px) !important; }
        @media (hover: hover) {
          .t03-glintbox::after { transition: transform 1.15s cubic-bezier(.16,1,.3,1); }
          .t03-glintbox:hover::after, a:hover .t03-glintbox::after { transform: translateX(135%); }
          .t03-glintbox:hover .t03-arch-img, a:hover .t03-glintbox .t03-arch-img { transform: scale(1.05); }
        }
        /* ── featured: alternating raised/lowered arches ─────────────────── */
        .t03-feat { display: grid; gap: 64px 44px; align-items: start; }
        @media (min-width: 861px) { .t03-feat { padding-bottom: 64px; } .t03-feat-low { transform: translateY(64px); } }
        @media (max-width: 860px) { .t03-feat { grid-template-columns: 1fr !important; gap: 84px; max-width: 420px; margin: 0 auto; } }
        /* ── collection grid: prices whisper in on hover (desktop) ───────── */
        .t03-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 104px 64px; }
        @media (max-width: 760px) { .t03-grid { grid-template-columns: 1fr; gap: 84px; max-width: 440px; margin: 0 auto; } }
        .t03-gprice { transition: opacity .55s ease, transform .55s ease; }
        @media (hover: hover) and (min-width: 761px) {
          .t03-gcard .t03-gprice { opacity: 0; transform: translateY(6px); }
          .t03-gcard:hover .t03-gprice { opacity: 1; transform: translateY(0); }
        }
        /* ── shimmering gradient text (maison statement) ─────────────────── */
        .t03-glowtext { background: linear-gradient(100deg, #ece7dd 12%, var(--sf-accent, #c9a227) 38%, color-mix(in srgb, var(--sf-accent, #c9a227) 45%, #fff) 50%, var(--sf-accent, #c9a227) 62%, #ece7dd 88%); background-size: 220% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: var(--sf-accent, #c9a227); animation: t03-shimmer 7s linear infinite; }
        /* ── engraved CTA hover ──────────────────────────────────────────── */
        .t03-cta { transition: border-color .6s ease, color .6s ease; }
        .t03-cta:hover { border-color: color-mix(in srgb, var(--sf-accent, #c9a227) 80%, transparent) !important; color: color-mix(in srgb, var(--sf-accent, #c9a227) 55%, #ece7dd) !important; }
        @media (prefers-reduced-motion: reduce) {
          .t03-rule, .t03-glowtext { animation: none !important; }
          .t03-bloom, .t03-hh { animation: none !important; opacity: 1 !important; }
          .t03-orb { animation: none !important; opacity: .4 !important; }
          .t03-hero-photo { animation: none !important; opacity: .3 !important; }
          .t03-glintbox::after { display: none; }
          .t03-arch-img, .t03-gprice, .t03-cta { transition: none !important; }
        }
      `}</style>

      {/* 1 · whisper-thin nav */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "color-mix(in srgb, #0e0d0b 86%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "22px 24px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <span style={{ ...label, fontSize: 13, letterSpacing: "0.3em", color: BONE }}>{config.title}</span>
          {!isPreview && (
            <Link
              href={`/s/${slug}/cart`}
              style={{ ...label, fontSize: 10, letterSpacing: "0.24em", position: "absolute", right: 24, top: "50%", marginTop: -7, textDecoration: "none" }}
            >
              Cart
            </Link>
          )}
        </div>
        <Rule />
      </header>

      {/* 2 · HERO — pure-CSS light-bloom poster; type rises out of the dark */}
      <div className="t03-hero" style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden" }}>
        {/* 3D scene mounts over this poster in a later phase */}
        <div className="t03-hero-poster" aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {config.heroImageUrl && (
            <div className="t03-hero-photo" style={{ position: "absolute", inset: 0 }}>
              <StoreImage src={config.heroImageUrl} alt="" monogram={monogram(config.title)} eager style={{ width: "100%", height: "100%" }} />
            </div>
          )}
          <div className="t03-bloom" style={{ position: "absolute", inset: 0 }} />
          <div
            className="t03-orb"
            style={{
              position: "absolute",
              top: "16%",
              right: "6%",
              width: "min(48vw, 460px)",
              aspectRatio: "1",
              borderRadius: "50%",
              background: "var(--sf-accent)",
              filter: "blur(90px)",
            }}
          />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", background: `linear-gradient(to bottom, transparent, ${BG})` }} />
        </div>

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "104px 20px 90px", maxWidth: 1080, margin: "0 auto", width: "100%" }}>
          <Reveal delay={1.35} duration={1.2} y={8}>
            <Rule style={{ width: 76, margin: "0 auto" }} />
          </Reveal>
          <div className="t03-hh" style={{ marginTop: 30 }}>
            <SplitText by="chars" stagger={0.03} as="h1" className="t03-hh-text">
              {config.heroHeadline}
            </SplitText>
          </div>
          {config.heroTagline && (
            <Reveal delay={1.9} duration={1.2} y={12}>
              <p
                style={{
                  fontFamily: F.display,
                  fontStyle: "italic",
                  fontWeight: 300,
                  fontSize: "clamp(17px, 2.6vw, 24px)",
                  color: BONE_60,
                  margin: "24px auto 0",
                  maxWidth: 560,
                  lineHeight: 1.6,
                }}
              >
                {config.heroTagline}
              </p>
            </Reveal>
          )}
          <Reveal delay={2.3} duration={1.2} y={10}>
            <div style={{ marginTop: 44 }}>
              <Magnetic strength={0.25}>
                <a className="t03-cta" href="#t03-collection" style={{ ...ghost, display: "inline-block", textDecoration: "none", padding: "14px 36px", fontSize: 11 }}>
                  View the collection
                </a>
              </Magnetic>
            </div>
          </Reveal>
        </div>

        <Reveal delay={2.9} duration={1.4} y={0} style={{ position: "absolute", bottom: 22, left: 0, right: 0, textAlign: "center", zIndex: 1 }}>
          <div aria-hidden style={{ width: 1, height: 42, margin: "0 auto", background: "linear-gradient(to bottom, transparent, rgba(236,231,221,.45))" }} />
          <div style={{ ...label, fontSize: 8.5, letterSpacing: "0.34em", marginTop: 10, color: BONE_40 }}>Scroll</div>
        </Reveal>
      </div>

      {/* products anchor — featured pieces / full-viewport pieces / empty vitrine */}
      <div id="t03-collection" style={{ scrollMarginTop: 84 }}>
        {products.length === 0 && (
          <section style={{ minHeight: "56vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "90px 24px" }}>
            <Reveal duration={1.2} blur>
              <div style={{ textAlign: "center", maxWidth: 420 }}>
                <div
                  className="t03-glintbox"
                  style={{ width: 220, aspectRatio: "3 / 4", margin: "0 auto", borderRadius: ARCH, border: HAIR, background: "var(--sf-accent-soft)", fontFamily: F.display }}
                >
                  <StoreImage src={null} alt={config.title} monogram={monogram(config.title)} className="t03-arch-img" style={{ width: "100%", height: "100%" }} />
                </div>
                <p style={{ fontFamily: F.display, fontStyle: "italic", fontWeight: 300, fontSize: "clamp(20px, 3vw, 27px)", lineHeight: 1.5, margin: "34px 0 0" }}>
                  The first pieces are still on the bench.
                </p>
                <div style={{ ...label, fontSize: 9.5, marginTop: 16, color: BONE_40 }}>Returning soon</div>
              </div>
            </Reveal>
          </section>
        )}

        {few && (
          <div>
            {products.map((p, i) => (
              <section
                key={p.id}
                style={{
                  minHeight: "92vh",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "88px 24px",
                  borderTop: i > 0 ? HAIR : undefined,
                }}
              >
                <div style={{ textAlign: "center", maxWidth: 520, width: "100%" }}>
                  <Reveal duration={1}>
                    <div style={{ ...label, fontSize: 10, color: "color-mix(in srgb, var(--sf-accent) 78%, #ece7dd)" }}>
                      Piece {ROMAN[i] ?? i + 1}
                    </div>
                  </Reveal>
                  <Reveal delay={0.1} duration={1.3} blur scale={1.12}>
                    <Link href={href(p)} style={{ display: "block", textDecoration: "none", maxWidth: 380, margin: "30px auto 0" }}>
                      <Arch p={p} eager={i === 0} />
                    </Link>
                  </Reveal>
                  <Reveal delay={0.24} duration={1.1}>
                    <Caption p={p} config={config} slug={slug} href={href(p)} big />
                  </Reveal>
                </div>
              </section>
            ))}
          </div>
        )}

        {/* 3 · featured pieces — arch vitrines, alternating heights */}
        {featured.length > 0 && (
          <section style={{ padding: "110px 24px 56px", maxWidth: 1140, margin: "0 auto" }}>
            <SectionHead num="I" title="Featured pieces" />
            <div className="t03-feat" style={{ gridTemplateColumns: `repeat(${Math.min(featured.length, 3)}, 1fr)` }}>
              {featured.map((p, i) => (
                <div key={p.id} className={i % 2 === 1 ? "t03-feat-item t03-feat-low" : "t03-feat-item"}>
                  <Reveal delay={i * 0.14} duration={1.2} blur scale={1.12}>
                    <Link href={href(p)} style={{ display: "block", textDecoration: "none" }}>
                      <Arch p={p} eager={i === 0} />
                    </Link>
                  </Reveal>
                  <Reveal delay={i * 0.14 + 0.16} duration={1}>
                    <Caption p={p} config={config} slug={slug} href={href(p)} />
                  </Reveal>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* 4 · maison statement — one phrase shimmers in metal */}
      {config.showAbout && config.about && (
        <section style={{ padding: "120px 24px", maxWidth: 880, margin: "0 auto", textAlign: "center" }}>
          <Reveal duration={1.3}>
            <div style={label}>Maison</div>
            <p
              style={{
                fontFamily: F.display,
                fontStyle: "italic",
                fontWeight: 300,
                fontSize: "clamp(24px, 4vw, 44px)",
                lineHeight: 1.55,
                margin: "30px 0 0",
              }}
            >
              {aboutPre}
              {aboutGlow && <span className="t03-glowtext">{aboutGlow}</span>}
            </p>
          </Reveal>
        </section>
      )}

      {/* 5 · the collection — 2-col vitrine grid, glint on hover */}
      {showGrid && (
        <section style={{ padding: "40px 24px 130px", maxWidth: 1140, margin: "0 auto" }}>
          <SectionHead num={featured.length > 0 ? "II" : "I"} title="The collection" />
          <div className="t03-grid">
            {rest.map((p, i) => (
              <Reveal key={p.id} delay={(i % 2) * 0.12} duration={1.1} y={36}>
                <div className="t03-gcard">
                  <Link href={href(p)} style={{ display: "block", textDecoration: "none" }}>
                    <div
                      className="t03-glintbox"
                      style={{ aspectRatio: "4 / 5", border: HAIR, background: "var(--sf-accent-soft)", fontFamily: F.display }}
                    >
                      <StoreImage src={p.imageUrl} alt={p.title} monogram={monogram(p.title)} className="t03-arch-img" style={{ width: "100%", height: "100%" }} />
                    </div>
                  </Link>
                  <div style={{ textAlign: "center", marginTop: 24 }}>
                    <div style={{ ...label, fontSize: 8.5, letterSpacing: "0.3em", color: "rgba(236,231,221,.35)" }}>
                      No. {String(i + 1).padStart(2, "0")}
                    </div>
                  </div>
                  <Caption p={p} config={config} slug={slug} href={href(p)} priceClass="t03-gprice" />
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* 6 · engraved invitation */}
      {config.contactUrl && (
        <section style={{ padding: "10px 24px 140px" }}>
          <Reveal duration={1.2}>
            <div style={{ maxWidth: 560, margin: "0 auto", border: HAIR, padding: "60px 30px 56px", textAlign: "center", position: "relative" }}>
              <Rule style={{ position: "absolute", top: -1, left: "50%", marginLeft: -38, width: 76 }} />
              <div style={label}>By appointment</div>
              <p
                style={{
                  fontFamily: F.display,
                  fontStyle: "italic",
                  fontWeight: 300,
                  fontSize: "clamp(20px, 3vw, 28px)",
                  lineHeight: 1.5,
                  margin: "20px auto 0",
                  maxWidth: "26ch",
                }}
              >
                The vitrine opens privately, one guest at a time.
              </p>
              <div style={{ marginTop: 32 }}>
                <Magnetic strength={0.25}>
                  <a
                    href={config.contactUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="t03-cta"
                    style={{ ...ghost, display: "inline-block", textDecoration: "none" }}
                  >
                    Request an appointment
                  </a>
                </Magnetic>
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* 7 · footer */}
      <footer style={{ padding: "0 24px 42px" }}>
        <Rule />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingTop: 32 }}>
          <span style={{ ...label, fontSize: 12, letterSpacing: "0.3em", color: BONE }}>{config.title}</span>
          <span style={{ ...label, fontSize: 8.5, letterSpacing: "0.26em", color: "rgba(236,231,221,.32)" }}>Powered by Mira</span>
        </div>
      </footer>
    </div>
  );
}
