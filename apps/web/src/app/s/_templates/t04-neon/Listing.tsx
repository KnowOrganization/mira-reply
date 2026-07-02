// t04-neon — "The Grid". A synthwave OS for digital products: HUD nav with a
// blinking status dot, an infinite wireframe-terrain WebGL hero (pure-CSS
// perspective-grid poster as SSR/LCP + permanent mobile fallback), Unbounded
// glitch-lock-in headline, system-stat chips, tilting holo-cards with pointer
// sheen, a NOW RUNNING terminal feature, terminal about, pulse-line footer.
// RSC — all interactivity via kit islands (Hero3DGate/Tilt/Reveal/CountUp/
// ScrambleText) + local Hero3D/Terrain3D clients; scoped CSS in ONE <style>.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import { Reveal, Tilt, CountUp, ScrambleText } from "../../_motion";
import Hero3D from "./Hero3D";
import { TEMPLATE_FONTS } from "../_shared/fonts";
import { Price } from "../_shared/Price";
import type { ListingProps, SfProduct, StorefrontConfig } from "../_shared/types";

const F = TEMPLATE_FONTS["t04-neon"];
const BG = "#070912";
const PANEL = "#0b0f1e";
const INK = "#e9edf6";
const DIM = "#8a93ad";
const FAINT = "#525c78";

/** accent at N% alpha — every luminance in this theme derives from the accent */
const A = (pct: number) => `color-mix(in srgb, var(--sf-accent) ${pct}%, transparent)`;
const GLOW = `0 0 24px ${A(55)}`;
const HAIR = `1px solid ${A(26)}`;

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();
const href = (slug: string, p: SfProduct) => `/s/${slug}/p/${p.slug ?? p.id}`;

function rootVars(config: StorefrontConfig): React.CSSProperties {
  return {
    ["--sf-accent" as string]: config.accent,
    ["--sf-accent-fg" as string]: config.accentFg,
    ["--sf-accent-soft" as string]: `color-mix(in srgb, ${config.accent} 16%, ${PANEL})`,
    background: BG,
    color: INK,
    fontFamily: F.body,
    minHeight: "100vh",
  };
}

const label: React.CSSProperties = {
  fontFamily: F.body,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  color: "var(--sf-accent)",
};

const chip: React.CSSProperties = {
  fontFamily: F.body,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: DIM,
  border: HAIR,
  borderRadius: 6,
  padding: "8px 14px",
  background: "rgba(11,15,30,.55)",
};

// ── HERO POSTER — pure CSS, rendered in the RSC (SSR output + LCP + the
//    permanent fallback below the 3D capability gate) ────────────────────────
function GridPoster({ config }: { config: StorefrontConfig }) {
  return (
    <div
      className="t04-poster"
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "linear-gradient(180deg, #070912 0%, #0a0f22 56%, #0d1226 100%)",
      }}
    >
      {/* optional owner hero image as a faint sky "signal feed" */}
      {config.heroImageUrl && (
        <div
          style={{
            position: "absolute",
            inset: "0 0 42%",
            opacity: 0.15,
            maskImage: "linear-gradient(180deg, #000 25%, transparent 96%)",
            WebkitMaskImage: "linear-gradient(180deg, #000 25%, transparent 96%)",
          }}
        >
          <StoreImage
            src={config.heroImageUrl}
            alt=""
            monogram={monogram(config.title)}
            eager
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      )}
      {/* wide soft horizon glow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "58%",
          width: "130%",
          height: 190,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(50% 50% at 50% 50%, ${A(26)}, transparent 70%)`,
          filter: "blur(4px)",
        }}
      />
      {/* horizon bar */}
      <div
        style={{
          position: "absolute",
          left: "-8%",
          right: "-8%",
          top: "58%",
          height: 2,
          background: "var(--sf-accent)",
          boxShadow: `${GLOW}, 0 0 80px ${A(40)}`,
        }}
      />
      {/* perspective grid floor — background-position keyframe = scroll illusion */}
      <div
        className="t04-gridfloor"
        style={{
          position: "absolute",
          left: "-42%",
          right: "-42%",
          top: "58%",
          bottom: "-14%",
          transformOrigin: "top center",
          transform: "perspective(300px) rotateX(60deg)",
          backgroundImage: `repeating-linear-gradient(0deg, ${A(55)} 0 1.5px, transparent 1.5px 44px), repeating-linear-gradient(90deg, ${A(42)} 0 1.5px, transparent 1.5px 44px)`,
          maskImage: "linear-gradient(180deg, transparent 0%, #000 30%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 30%)",
        }}
      />
    </div>
  );
}

// ── image slot: real feed with scanlines, or AWAITING VISUAL FEED panel ─────
function Feed({ p, aspect = "16 / 10", eager }: { p: SfProduct; aspect?: string; eager?: boolean }) {
  if (!p.imageUrl) {
    return (
      <div
        style={{
          aspectRatio: aspect,
          position: "relative",
          overflow: "hidden",
          background: "#0a0e1c",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {/* scanline crosshatch */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `repeating-linear-gradient(0deg, ${A(7)} 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, ${A(5)} 0 1px, transparent 1px 5px)`,
          }}
        />
        <div
          style={{
            width: 64,
            height: 64,
            border: `1px solid ${A(65)}`,
            borderRadius: 8,
            boxShadow: `${GLOW}, inset 0 0 18px ${A(20)}`,
            overflow: "hidden",
            fontFamily: F.display,
          }}
        >
          <StoreImage
            src={null}
            alt={p.title}
            monogram={monogram(p.title)}
            style={{ width: "100%", height: "100%", fontSize: 26, background: "transparent", color: "var(--sf-accent)" }}
          />
        </div>
        <div style={{ ...label, fontSize: 9, letterSpacing: "0.3em", color: FAINT }}>Awaiting visual feed</div>
      </div>
    );
  }
  return (
    <div style={{ aspectRatio: aspect, position: "relative", overflow: "hidden" }}>
      <StoreImage
        src={p.imageUrl}
        alt={p.title}
        monogram={monogram(p.title)}
        eager={eager}
        className="t04-img"
        style={{ width: "100%", height: "100%", transition: "transform .5s cubic-bezier(.16,1,.3,1)" }}
      />
      {/* scanline overlay */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "repeating-linear-gradient(0deg, rgba(7,9,18,.28) 0 1px, transparent 1px 3px)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// ── holo product card (grid) ─────────────────────────────────────────────────
function HoloCard({ p, config, slug, i }: { p: SfProduct; config: StorefrontConfig; slug: string; i: number }) {
  return (
    <Reveal delay={(i % 3) * 0.09} y={24}>
      <Tilt max={8} hoverScale={1.015}>
        <div className="t04-card" style={{ background: PANEL, border: HAIR, borderRadius: 10, overflow: "hidden", position: "relative" }}>
          <Link href={href(slug, p)} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <Feed p={p} />
            <div style={{ padding: "14px 14px 4px" }}>
              <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 17, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
                {p.title}
              </div>
              {p.subtitle && (
                <div style={{ fontSize: 12, color: DIM, marginTop: 5, letterSpacing: "0.04em" }}>{p.subtitle}</div>
              )}
            </div>
          </Link>
          <div style={{ padding: "10px 14px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <Price
              minor={p.priceMinor}
              currency={p.currency}
              fallback={p.priceText}
              style={{ fontSize: 14, fontWeight: 700, color: "var(--sf-accent)", fontVariantNumeric: "tabular-nums", textShadow: `0 0 12px ${A(45)}` }}
            />
            <AddToCart
              product={p}
              config={config}
              slug={slug}
              variant="compact"
              fx="neon-ring"
              label={config.buyLabel.toUpperCase()}
              addedLabel="INSTALLED ✓"
              style={{
                background: "transparent",
                color: "var(--sf-accent)",
                border: `1px solid ${A(60)}`,
                borderRadius: 6,
                fontFamily: F.body,
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: "0.12em",
                padding: "7px 13px",
              }}
            />
          </div>
          {/* holo-sheen driven by Tilt's --sf-px / --sf-py pointer vars */}
          <div
            aria-hidden
            className="t04-sheen"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              opacity: 0,
              transition: "opacity .35s ease",
              mixBlendMode: "screen",
              background:
                "radial-gradient(240px circle at calc(var(--sf-px, .5) * 100%) calc(var(--sf-py, .5) * 100%), rgba(255,255,255,.12), transparent 60%)",
            }}
          />
        </div>
      </Tilt>
    </Reveal>
  );
}

// ── full-width program panel — replaces the grid at 1–2 products ────────────
function ProgramRow({ p, config, slug, i }: { p: SfProduct; config: StorefrontConfig; slug: string; i: number }) {
  return (
    <Reveal delay={i * 0.12} y={26}>
      <div className="t04-prog t04-card" style={{ background: PANEL, border: HAIR, borderRadius: 12, overflow: "hidden", position: "relative" }}>
        <Link href={href(slug, p)} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
          <Feed p={p} eager={i === 0} />
        </Link>
        <div style={{ padding: "22px 22px 24px", display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>
          <div style={{ ...label, fontSize: 10 }}>{"//"} Program 0{i + 1}</div>
          <Link href={href(slug, p)} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: "clamp(22px, 4.5vw, 34px)", lineHeight: 1.1, letterSpacing: "-0.01em" }}>
              {p.title}
            </div>
          </Link>
          {p.subtitle && <div style={{ fontSize: 13, color: DIM, letterSpacing: "0.04em" }}>{p.subtitle}</div>}
          {p.description && (
            <p style={{ fontSize: 13.5, lineHeight: 1.65, color: DIM, margin: 0, maxWidth: 520 }}>{p.description}</p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
            <Price
              minor={p.priceMinor}
              currency={p.currency}
              fallback={p.priceText}
              style={{ fontSize: 19, fontWeight: 700, color: "var(--sf-accent)", fontVariantNumeric: "tabular-nums", textShadow: `0 0 14px ${A(45)}` }}
            />
            <AddToCart
              product={p}
              config={config}
              slug={slug}
              fx="neon-ring"
              label={config.buyLabel.toUpperCase()}
              addedLabel="INSTALLED ✓"
              style={{
                background: "var(--sf-accent)",
                color: "var(--sf-accent-fg)",
                borderRadius: 8,
                fontFamily: F.body,
                fontWeight: 700,
                fontSize: 12.5,
                letterSpacing: "0.1em",
                padding: "12px 26px",
                boxShadow: GLOW,
              }}
            />
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function TermBar({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 15px", borderBottom: HAIR, background: "#0a0e1b" }}>
      <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: "#ff5f57", opacity: 0.85 }} />
      <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: "#febc2e", opacity: 0.85 }} />
      <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: "#28c840", opacity: 0.85 }} />
      <span style={{ marginLeft: 8, fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: FAINT }}>{text}</span>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────
export default function Listing({ config, products, slug }: ListingProps) {
  const isPreview = slug.startsWith("preview");
  const featured =
    products.find((p) => p.id === config.featuredIds[0]) ?? products[0] ?? null;
  const showRunning = config.showFeatured && featured != null && products.length > 2;

  return (
    <div className={`t04-root ${F.className}`} style={rootVars(config)}>
      <style>{`
        .t04-root ::selection { background: var(--sf-accent); color: var(--sf-accent-fg); }
        .t04-root a { -webkit-tap-highlight-color: transparent; }

        @keyframes t04-blink { 0%, 100% { opacity: 1; } 50% { opacity: .15; } }
        .t04-dot { animation: t04-blink 2s ease-in-out infinite; }

        @keyframes t04-gridscroll { from { background-position: 0 0, 0 0; } to { background-position: 0 44px, 0 0; } }
        .t04-gridfloor { animation: t04-gridscroll 1.5s linear infinite; }

        /* glitch lock-in: 3 stepped jitter frames of split accent shadows +
           a hue-rotated mix, then lock to a steady glow */
        @keyframes t04-glitchin {
          0% {
            opacity: .4;
            transform: translateX(-7px) skewX(-4deg);
            text-shadow: 4px 0 var(--sf-accent), -4px 0 color-mix(in srgb, var(--sf-accent) 45%, #ff2bd6);
            filter: hue-rotate(28deg);
          }
          45% {
            opacity: .85;
            transform: translateX(5px);
            text-shadow: -5px 2px var(--sf-accent), 5px -2px color-mix(in srgb, var(--sf-accent) 45%, #ff2bd6);
            filter: hue-rotate(-22deg);
          }
          75% {
            transform: translateX(-2px);
            text-shadow: 2px 0 var(--sf-accent), -2px 0 color-mix(in srgb, var(--sf-accent) 45%, #ff2bd6);
            filter: hue-rotate(10deg);
          }
          100% {
            opacity: 1;
            transform: none;
            text-shadow: 0 0 24px color-mix(in srgb, var(--sf-accent) 55%, transparent);
            filter: none;
          }
        }
        .t04-glitch { animation: t04-glitchin .6s steps(3, end) .12s both; }

        .t04-card { transition: border-color .3s ease, box-shadow .3s ease; }
        .t04-card:hover {
          border-color: color-mix(in srgb, var(--sf-accent) 70%, transparent);
          box-shadow: 0 0 24px color-mix(in srgb, var(--sf-accent) 55%, transparent);
        }
        .t04-card:hover .t04-sheen { opacity: 1; }
        .t04-card:hover .t04-img { transform: scale(1.045); }

        .t04-runchip { transition: box-shadow .3s ease, background .3s ease; }
        .t04-runchip:hover { box-shadow: 0 0 24px color-mix(in srgb, var(--sf-accent) 55%, transparent); background: color-mix(in srgb, var(--sf-accent) 16%, transparent); }

        @keyframes t04-sweep { from { transform: translateY(-100%); } to { transform: translateY(100%); } }
        .t04-sweep { animation: t04-sweep 3.6s linear infinite; }

        @keyframes t04-pulse { 0%, 100% { opacity: .2; } 50% { opacity: .85; } }
        .t04-pulse { animation: t04-pulse 4s ease-in-out infinite; }

        .t04-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .t04-run { display: grid; grid-template-columns: 1fr; }
        .t04-prog { display: grid; grid-template-columns: 1fr; }
        @media (min-width: 960px) {
          .t04-grid { grid-template-columns: repeat(3, 1fr); gap: 20px; }
        }
        @media (min-width: 900px) {
          .t04-run { grid-template-columns: 1.05fr 1fr; }
          .t04-prog { grid-template-columns: minmax(300px, 420px) 1fr; }
        }
        @media (max-width: 430px) { .t04-hide-xs { display: none; } }
        @media (prefers-reduced-motion: reduce) {
          .t04-gridfloor, .t04-glitch, .t04-sweep, .t04-dot, .t04-pulse { animation: none !important; }
        }
      `}</style>

      {/* 1 ── HUD nav */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "rgba(7,9,18,.86)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: HAIR,
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "13px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <span
            aria-hidden
            className="t04-dot"
            style={{ width: 8, height: 8, borderRadius: 999, background: "var(--sf-accent)", boxShadow: `0 0 10px ${A(80)}`, flexShrink: 0 }}
          />
          <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 14, letterSpacing: "0.2em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            {config.title}
          </span>
          <span style={{ ...label, fontSize: 9, color: FAINT, letterSpacing: "0.28em" }} className="t04-hide-xs">
            SYS.ONLINE
          </span>
          <span style={{ flex: 1 }} />
          {!isPreview && (
            <Link
              href={`/s/${slug}/cart`}
              className="t04-runchip"
              style={{ ...chip, color: "var(--sf-accent)", borderColor: A(50), textDecoration: "none", padding: "6px 12px" }}
            >
              [CART]
            </Link>
          )}
        </div>
      </header>

      {/* 2 ── 3D hero — wireframe terrain (poster SSR'd here, scene gated) */}
      <section style={{ position: "relative", height: "min(92svh, 860px)", minHeight: 520, overflow: "hidden" }}>
        <Hero3D accent={config.accent} poster={<GridPoster config={config} />} />
        <div
          style={{
            position: "relative",
            zIndex: 2,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 20px",
            transform: "translateY(-5%)",
          }}
        >
          <div style={{ ...label, fontSize: 10, letterSpacing: "0.34em", minHeight: 15 }}>
            <ScrambleText text={"SYS.BOOT // GRID ONLINE"} speed={16} delay={150} />
          </div>
          <h1
            className="t04-glitch"
            style={{
              fontFamily: F.display,
              fontWeight: 800,
              fontSize: "clamp(34px, 8vw, 96px)",
              lineHeight: 1.02,
              letterSpacing: "-0.01em",
              textTransform: "uppercase",
              margin: "18px 0 0",
              maxWidth: 980,
              textShadow: `0 0 24px ${A(55)}`,
            }}
          >
            {config.heroHeadline}
          </h1>
          {config.heroTagline && (
            <p style={{ fontFamily: F.body, fontSize: "clamp(13.5px, 1.6vw, 16px)", lineHeight: 1.65, color: DIM, margin: "20px 0 0", maxWidth: 520 }}>
              {config.heroTagline}
            </p>
          )}
          <a
            href="#t04-grid"
            className="t04-runchip"
            style={{
              ...chip,
              display: "inline-block",
              marginTop: 32,
              color: "var(--sf-accent)",
              borderColor: A(60),
              textDecoration: "none",
              fontWeight: 600,
              padding: "11px 22px",
              background: "rgba(7,9,18,.6)",
            }}
          >
            RUN STORE ↓
          </a>
        </div>
        {/* bottom fade into page bg */}
        <div aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90, zIndex: 1, background: `linear-gradient(180deg, transparent, ${BG})` }} />
      </section>

      {/* 3 ── system stats strip */}
      <Reveal y={16}>
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "26px 20px 6px", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          <span style={chip}>
            <span style={{ color: "var(--sf-accent)", fontWeight: 700 }}>
              <CountUp to={products.length} duration={900} />
            </span>{" "}
            PROGRAMS
          </span>
          <span style={chip}>{config.currency} ACCEPTED</span>
          <span style={{ ...chip, color: config.checkoutEnabled ? "var(--sf-accent)" : DIM, borderColor: config.checkoutEnabled ? A(50) : undefined }}>
            CHECKOUT {config.checkoutEnabled ? "ONLINE" : "OFFLINE"}
          </span>
          <span style={chip}>v2.0</span>
        </section>
      </Reveal>

      {/* 4 ── holo-card grid */}
      <section id="t04-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "42px 20px 20px", scrollMarginTop: 70 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 22 }}>
          <span style={label}>{"//"} All programs</span>
          <span aria-hidden style={{ flex: 1, height: 1, background: A(18) }} />
          <span style={{ fontSize: 11, letterSpacing: "0.14em", color: FAINT }}>{products.length} FILES</span>
        </div>

        {products.length === 0 ? (
          <div style={{ border: HAIR, borderRadius: 12, overflow: "hidden", background: PANEL }}>
            <TermBar text="catalog.sys" />
            <div style={{ padding: "54px 20px", textAlign: "center" }}>
              <div style={{ ...label, fontSize: 10, letterSpacing: "0.3em", color: FAINT }}>NO PROGRAMS LOADED</div>
              <div style={{ fontSize: 13, color: DIM, marginTop: 10 }}>Awaiting catalog upload…</div>
            </div>
          </div>
        ) : products.length <= 2 ? (
          <div style={{ display: "grid", gap: 18 }}>
            {products.map((p, i) => (
              <ProgramRow key={p.id} p={p} config={config} slug={slug} i={i} />
            ))}
          </div>
        ) : (
          <div className="t04-grid">
            {products.map((p, i) => (
              <HoloCard key={p.id} p={p} config={config} slug={slug} i={i} />
            ))}
          </div>
        )}
      </section>

      {/* 5 ── NOW RUNNING — featured wide card */}
      {showRunning && featured && (
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "34px 20px 12px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 22 }}>
            <span style={label}>{"//"} Now running</span>
            <span aria-hidden style={{ flex: 1, height: 1, background: A(18) }} />
          </div>
          <Reveal y={28}>
            <div className="t04-run t04-card" style={{ background: PANEL, border: HAIR, borderRadius: 12, overflow: "hidden" }}>
              <Link href={href(slug, featured)} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
                <Feed p={featured} aspect="16 / 11" />
              </Link>
              <div style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <TermBar text={`run ${(featured.slug ?? featured.id).slice(0, 22)}.exe`} />
                <div style={{ padding: "22px 22px 26px", display: "flex", flexDirection: "column", gap: 13, flex: 1, justifyContent: "center" }}>
                  <Link href={href(slug, featured)} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: "clamp(21px, 3.4vw, 32px)", lineHeight: 1.12, letterSpacing: "-0.01em" }}>
                      {featured.title}
                    </div>
                  </Link>
                  {featured.subtitle && <div style={{ fontSize: 12.5, color: DIM, letterSpacing: "0.05em" }}>{featured.subtitle}</div>}
                  {featured.description && (
                    <p style={{ fontSize: 13.5, lineHeight: 1.65, color: DIM, margin: 0 }}>{featured.description}</p>
                  )}
                  <Price
                    minor={featured.priceMinor}
                    currency={featured.currency}
                    fallback={featured.priceText}
                    style={{ fontSize: 22, fontWeight: 700, color: "var(--sf-accent)", fontVariantNumeric: "tabular-nums", textShadow: `0 0 14px ${A(45)}` }}
                  />
                  <AddToCart
                    product={featured}
                    config={config}
                    slug={slug}
                    fx="neon-ring"
                    label={config.buyLabel.toUpperCase()}
                    addedLabel="INSTALLED ✓"
                    style={{
                      width: "100%",
                      background: "var(--sf-accent)",
                      color: "var(--sf-accent-fg)",
                      borderRadius: 8,
                      fontFamily: F.body,
                      fontWeight: 700,
                      fontSize: 13,
                      letterSpacing: "0.12em",
                      padding: "14px 22px",
                      boxShadow: GLOW,
                    }}
                  />
                </div>
                {/* traveling scanline sweep */}
                <div
                  aria-hidden
                  className="t04-sweep"
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background: `linear-gradient(180deg, transparent 45%, ${A(13)} 50%, transparent 55%)`,
                  }}
                />
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* 6 ── terminal about */}
      {config.showAbout && config.about && (
        <section style={{ maxWidth: 760, margin: "0 auto", padding: "44px 20px 30px" }}>
          <Reveal y={24}>
            <div style={{ border: HAIR, borderRadius: 12, overflow: "hidden", background: PANEL }}>
              <TermBar text="about.txt — nullshell" />
              <div style={{ padding: "22px 22px 26px" }}>
                <div style={{ fontFamily: F.body, fontSize: 13, letterSpacing: "0.06em", color: "var(--sf-accent)", minHeight: 20 }}>
                  <span aria-hidden>$ </span>
                  <ScrambleText text="cat about.txt" speed={22} delay={200} />
                </div>
                <Reveal delay={0.25} y={14}>
                  <p style={{ fontSize: 14, lineHeight: 1.75, color: DIM, whiteSpace: "pre-line", margin: "16px 0 0" }}>{config.about}</p>
                </Reveal>
                {config.contactUrl && (
                  <a
                    href={config.contactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="t04-runchip"
                    style={{
                      display: "inline-block",
                      marginTop: 22,
                      fontFamily: F.body,
                      fontSize: 12.5,
                      letterSpacing: "0.08em",
                      color: "var(--sf-accent)",
                      textDecoration: "none",
                      border: `1px solid ${A(50)}`,
                      borderRadius: 6,
                      padding: "9px 16px",
                    }}
                  >
                    $ contact --open
                  </a>
                )}
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* 7 ── footer */}
      <footer style={{ marginTop: 34 }}>
        <div aria-hidden className="t04-pulse" style={{ height: 2, background: "var(--sf-accent)", boxShadow: GLOW }} />
        <div style={{ padding: "26px 20px 34px", textAlign: "center" }}>
          <span style={{ fontFamily: F.body, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.3em", textTransform: "uppercase", color: FAINT }}>
            Powered by {config.title} OS
          </span>
        </div>
      </footer>
    </div>
  );
}
