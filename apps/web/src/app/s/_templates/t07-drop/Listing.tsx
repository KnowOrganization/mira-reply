// t07-drop — "The Countdown". Streetwear limited-drop storefront: blackout
// page, Anton display over Barlow 800 caps, alarm-color accent, hard cuts.
// Hero = the drop image on a WebGL distortion plane (Ripple3D via Hero3DGate;
// the flickering poster below is the SSR/LCP layer and permanent fallback).
// RSC — all interactivity lives in kit islands + local GhostRow/Hero3D.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import { Reveal, Marquee, Magnetic, CountUp } from "../../_motion";
import Hero3D from "./Hero3D";
import GhostRow from "./GhostRow";
import { TEMPLATE_FONTS } from "../_shared/fonts";
import { Price, formatPrice } from "../_shared/Price";
import type { ListingProps, SfProduct, StorefrontConfig } from "../_shared/types";

const F = TEMPLATE_FONTS["t07-drop"];
const INK = "#050505";
const WHITE = "#f4f4f4";
const HAIR = "1px solid rgba(255,255,255,.13)";

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();
const isHttps = (u: string | null | undefined): u is string => !!u && /^https:\/\//i.test(u);

const label: React.CSSProperties = {
  fontFamily: F.body,
  fontWeight: 800,
  fontSize: 11,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
};

function rootVars(config: StorefrontConfig): React.CSSProperties {
  return {
    ["--sf-accent" as string]: config.accent,
    ["--sf-accent-fg" as string]: config.accentFg,
    ["--sf-accent-soft" as string]: `color-mix(in srgb, ${config.accent} 16%, #0b0b0b)`,
    background: INK,
    color: WHITE,
    fontFamily: F.body,
    minHeight: "100vh",
    overflowX: "clip",
  };
}

function priceLine(p: SfProduct | null): string | null {
  if (!p) return null;
  return p.priceMinor != null ? formatPrice(p.priceMinor, p.currency) : p.priceText;
}

export default function Listing({ config, products, slug }: ListingProps) {
  const isPreview = slug.startsWith("preview");
  const href = (p: SfProduct) => `/s/${slug}/p/${p.slug ?? p.id}`;

  // hero = first product WITH an image; else first product over heroImageUrl
  const heroP = products.find((p) => isHttps(p.imageUrl)) ?? products[0] ?? null;
  const heroImg = heroP && isHttps(heroP.imageUrl)
    ? heroP.imageUrl
    : isHttps(config.heroImageUrl)
      ? config.heroImageUrl
      : null;
  const heroTitle = heroP?.title ?? config.heroHeadline ?? config.title;
  const heroPrice = priceLine(heroP);
  const lineup = products.filter((p) => p.id !== heroP?.id);

  const tick = ["DROP 001", heroTitle, heroPrice, "NO RESTOCK"].filter(Boolean).join(" — ") + " — ";

  const aboutWords = config.about.trim().split(/\s+/);
  const aboutHead = aboutWords.slice(0, -1).join(" ");
  const aboutLast = aboutWords[aboutWords.length - 1] ?? "";

  const poster = (
    <div className="t07-poster t07-flicker" style={{ position: "absolute", inset: 0 }}>
      <StoreImage
        src={heroImg}
        alt={heroTitle}
        monogram={monogram(heroTitle)}
        eager
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );

  return (
    <div className={`${F.className} t07-root`} style={rootVars(config)}>
      <style>{`
        .t07-root { -webkit-font-smoothing: antialiased; }
        /* CRT-style flicker — hard steps, brief dip roughly every 7s */
        @keyframes t07-flicker {
          0%, 88.9% { opacity: 1; }
          89% { opacity: .55; }
          90%, 92.9% { opacity: 1; }
          93% { opacity: .75; }
          94%, 100% { opacity: 1; }
        }
        .t07-flicker { animation: t07-flicker 7s steps(1, end) infinite; }
        @keyframes t07-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .3; transform: scale(.7); } }
        .t07-live-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--sf-accent); animation: t07-pulse 1.1s ease-in-out infinite; }
        /* title stamps up in 2 hard steps */
        @keyframes t07-stamp { from { transform: translateY(.55em); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .t07-stamp { animation: t07-stamp .34s steps(2, end) .05s both; }
        .t07-hero-title { font-family: ${F.display}; font-size: clamp(56px, 16vw, 220px); line-height: .82; letter-spacing: -.01em; text-transform: uppercase; margin: -.48em 0 0; padding: 0 16px; position: relative; z-index: 2; mix-blend-mode: difference; color: #fff; overflow-wrap: anywhere; }
        /* no-image hero: layered outline type */
        .t07-typo-stack { position: relative; font-family: ${F.display}; font-size: clamp(64px, 19vw, 220px); line-height: .84; letter-spacing: -.01em; text-transform: uppercase; overflow-wrap: anywhere; }
        .t07-typo-ghost { position: absolute; inset: 0; color: transparent; pointer-events: none; }
        .t07-typo-a { -webkit-text-stroke: 1.5px var(--sf-accent); transform: translate(-7px, -6px); opacity: .55; }
        .t07-typo-b { -webkit-text-stroke: 1px rgba(255,255,255,.55); transform: translate(7px, 6px); opacity: .5; }
        /* kinetic ticker — accent outline type */
        .t07-tick { font-family: ${F.display}; font-size: clamp(44px, 7vw, 100px); line-height: 1.05; text-transform: uppercase; white-space: nowrap; color: transparent; -webkit-text-stroke: 2px var(--sf-accent); }
        .t07-tick-b { font-size: clamp(30px, 5vw, 70px); -webkit-text-stroke: 1px rgba(255,255,255,.85); }
        /* lineup rows */
        .t07-row { display: grid; grid-template-columns: auto 1fr auto; gap: 16px; align-items: center; padding: 24px 20px; border-bottom: ${HAIR}; text-decoration: none; color: inherit; }
        .t07-row-num { font-family: ${F.display}; font-size: clamp(34px, 7vw, 84px); line-height: 1; color: transparent; -webkit-text-stroke: 1.5px rgba(255,255,255,.32); }
        .t07-row-name { font-family: ${F.display}; font-size: clamp(28px, 6vw, 72px); line-height: .95; text-transform: uppercase; letter-spacing: -.01em; transition: color .12s steps(2, end); overflow-wrap: anywhere; }
        .t07-row-thumb { width: 62px; height: 62px; overflow: hidden; border: ${HAIR}; flex: none; }
        @media (hover: hover) and (pointer: fine) {
          .t07-row-thumb { display: none; }
          .t07-row { transition: background .12s steps(2, end); }
          .t07-row:hover { background: rgba(255,255,255,.045); }
          .t07-row:hover .t07-row-name { color: var(--sf-accent); }
          .t07-row:hover .t07-row-num { -webkit-text-stroke-color: var(--sf-accent); }
        }
        .t07-chip { font-family: ${F.body}; font-weight: 800; font-size: 9.5px; letter-spacing: .16em; text-transform: uppercase; border: 1px solid var(--sf-accent); color: var(--sf-accent); padding: 4px 8px; white-space: nowrap; }
        .t07-chip-off { border-color: rgba(255,255,255,.3); color: rgba(255,255,255,.45); }
        .t07-cta { transition: filter .12s steps(2, end), transform .12s steps(2, end); }
        .t07-cta:hover { filter: brightness(1.12); }
        .t07-listlink { transition: color .12s steps(2, end), border-color .12s steps(2, end); }
        .t07-listlink:hover { color: ${WHITE}; border-color: ${WHITE}; }
        @media (prefers-reduced-motion: reduce) {
          .t07-flicker, .t07-live-dot { animation: none !important; }
          .t07-stamp { animation: none !important; opacity: 1 !important; transform: none !important; }
          .t07-row, .t07-row-name, .t07-cta, .t07-listlink { transition: none !important; }
        }
      `}</style>

      {/* 1 · floating nav */}
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "16px 20px",
          background: "linear-gradient(to bottom, rgba(5,5,5,.72), transparent)",
        }}
      >
        <span style={{ ...label, fontSize: 14, letterSpacing: ".14em", color: WHITE }}>{config.title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              ...label,
              fontSize: 9.5,
              letterSpacing: ".18em",
              color: "var(--sf-accent)",
              border: "1px solid var(--sf-accent)",
              padding: "5px 10px",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <span className="t07-live-dot" aria-hidden />
            DROP LIVE
          </span>
          {!isPreview && (
            <Link href={`/s/${slug}/cart`} style={{ ...label, fontSize: 11, color: WHITE, textDecoration: "none" }}>
              [BAG]
            </Link>
          )}
        </div>
      </header>

      {/* 2 · HERO — distortion plane over the flickering poster */}
      <section style={{ position: "relative", isolation: "isolate" }}>
        {heroImg ? (
          <>
            <div
              className="t07-hero-media"
              style={{
                position: "relative",
                height: "clamp(420px, 74svh, 780px)",
                overflow: "hidden",
                background: "#0a0a0a",
              }}
            >
              <Hero3D poster={poster} imageUrl={heroImg} accent={config.accent} />
              {/* legibility gradient — sits ABOVE the canvas, below the type */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 2,
                  pointerEvents: "none",
                  background:
                    "linear-gradient(to top, rgba(5,5,5,.92) 0%, rgba(5,5,5,.25) 32%, rgba(5,5,5,.1) 58%, rgba(5,5,5,.55) 100%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 20,
                  bottom: 16,
                  zIndex: 3,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 12,
                  flexWrap: "wrap",
                  pointerEvents: "none",
                }}
              >
                <span style={{ ...label, fontSize: 11, color: "var(--sf-accent)" }}>DROP 001</span>
                {heroP?.subtitle && (
                  <span style={{ ...label, fontWeight: 600, fontSize: 10, letterSpacing: ".16em", color: "rgba(255,255,255,.65)" }}>
                    {heroP.subtitle}
                  </span>
                )}
              </div>
            </div>
            {/* the drop name slams over the image edge */}
            <h1 className="t07-hero-title t07-stamp">{heroTitle}</h1>
          </>
        ) : (
          /* no image anywhere → the NAME is the hero: flicker + outline layers */
          <div
            style={{
              position: "relative",
              minHeight: "clamp(380px, 66svh, 640px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "88px 14px 32px",
            }}
          >
            <div className="t07-typo-stack t07-stamp">
              <span className="t07-typo-ghost t07-typo-a" aria-hidden>{heroTitle}</span>
              <span className="t07-typo-ghost t07-typo-b" aria-hidden>{heroTitle}</span>
              <h1 className="t07-flicker" style={{ position: "relative", margin: 0, font: "inherit", color: WHITE }}>
                {heroTitle}
              </h1>
            </div>
            <div style={{ position: "absolute", left: 20, bottom: 16, display: "flex", gap: 12, alignItems: "baseline" }}>
              <span style={{ ...label, fontSize: 11, color: "var(--sf-accent)" }}>DROP 001</span>
              {heroP?.subtitle && (
                <span style={{ ...label, fontWeight: 600, fontSize: 10, letterSpacing: ".16em", color: "rgba(255,255,255,.65)" }}>
                  {heroP.subtitle}
                </span>
              )}
            </div>
          </div>
        )}

        {/* price chip + magnetic buy CTA */}
        {heroP && (
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14, padding: "20px 20px 4px" }}>
            {heroPrice && (
              <span
                style={{
                  fontFamily: F.display,
                  fontSize: 20,
                  letterSpacing: ".02em",
                  lineHeight: 1,
                  border: "1px solid var(--sf-accent)",
                  color: "var(--sf-accent)",
                  padding: "10px 14px",
                }}
              >
                {heroPrice}
              </span>
            )}
            <Magnetic strength={0.3}>
              <Link
                href={href(heroP)}
                className="t07-cta"
                style={{
                  display: "inline-block",
                  background: "var(--sf-accent)",
                  color: "var(--sf-accent-fg)",
                  fontFamily: F.body,
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  lineHeight: 1,
                  padding: "16px 28px",
                }}
              >
                {config.buyLabel.toUpperCase()} NOW →
              </Link>
            </Magnetic>
            <span style={{ ...label, fontWeight: 600, fontSize: 11, letterSpacing: ".14em", color: "rgba(255,255,255,.5)" }}>
              {config.heroTagline || "NO RESTOCK — WHEN IT’S GONE IT’S GONE"}
            </span>
          </div>
        )}
      </section>

      {/* 3 · kinetic ticker — outline type belts */}
      {heroP && (
        <section aria-hidden style={{ padding: "38px 0 6px", overflow: "hidden" }}>
          <Marquee speed="18s" gap="3rem" label={`${heroTitle} — drop ticker`}>
            {[0, 1].map((i) => (
              <span key={i} className="t07-tick">{tick}</span>
            ))}
          </Marquee>
          <Marquee speed="34s" reverse gap="3rem" style={{ opacity: 0.3, marginTop: 4 }}>
            {[0, 1].map((i) => (
              <span key={i} className="t07-tick t07-tick-b">{tick}</span>
            ))}
          </Marquee>
        </section>
      )}

      {/* 4 · THE LINEUP — oversized numbered rows, ghost image chases cursor */}
      {lineup.length > 0 && (
        <section style={{ padding: "52px 0 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              padding: "0 20px 14px",
              borderBottom: HAIR,
            }}
          >
            <span style={{ ...label, color: "var(--sf-accent)" }}>THE LINEUP</span>
            <span style={{ ...label, fontWeight: 600, fontSize: 10, color: "rgba(255,255,255,.5)" }}>
              {String(lineup.length).padStart(2, "0")} STYLES
            </span>
          </div>
          {lineup.map((p, i) => (
            <GhostRow
              key={p.id}
              imageUrl={isHttps(p.imageUrl) ? p.imageUrl : null}
              monogram={monogram(p.title)}
              fromX={i % 2 ? 56 : -56}
            >
              <Link href={href(p)} className="t07-row">
                <span className="t07-row-num" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                  <span className="t07-row-name">{p.title}</span>
                  {p.subtitle && (
                    <span style={{ ...label, fontWeight: 600, fontSize: 9.5, letterSpacing: ".18em", color: "rgba(255,255,255,.5)" }}>
                      {p.subtitle}
                    </span>
                  )}
                </span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <span className="t07-row-thumb">
                    <StoreImage src={p.imageUrl} alt="" monogram={monogram(p.title)} style={{ width: "100%", height: "100%", fontSize: 24 }} />
                  </span>
                  <Price
                    minor={p.priceMinor}
                    currency={p.currency}
                    fallback={p.priceText}
                    style={{ fontFamily: F.body, fontWeight: 800, fontSize: 15, letterSpacing: ".04em" }}
                  />
                  <span className={p.available ? "t07-chip" : "t07-chip t07-chip-off"}>
                    {p.available ? "AVAILABLE" : "GONE"}
                  </span>
                </span>
              </Link>
            </GhostRow>
          ))}
        </section>
      )}

      {/* 5 · heat strip */}
      <Reveal duration={0.4} y={14}>
        <div
          style={{
            marginTop: lineup.length > 0 ? 0 : 48,
            borderTop: "1px solid var(--sf-accent)",
            borderBottom: "1px solid var(--sf-accent)",
            padding: "18px 20px",
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "6px 16px",
            fontFamily: F.body,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: ".16em",
            fontSize: "clamp(12px, 2.6vw, 17px)",
          }}
        >
          {products.length > 0 ? (
            <>
              <span>AVAILABLE NOW</span>
              <span style={{ color: "var(--sf-accent)" }} aria-hidden>/</span>
              <span>
                <CountUp to={products.length} /> {products.length === 1 ? "PIECE" : "PIECES"}
              </span>
              <span style={{ color: "var(--sf-accent)" }} aria-hidden>/</span>
              <span>NO RESTOCK</span>
            </>
          ) : (
            <>
              <span>NEXT DROP LOADING</span>
              <span style={{ color: "var(--sf-accent)" }} aria-hidden>/</span>
              <span>STAY READY</span>
            </>
          )}
        </div>
      </Reveal>

      {/* 6 · manifesto */}
      {config.showAbout && config.about && (
        <section style={{ padding: "84px 20px 72px", maxWidth: 940 }}>
          <Reveal duration={0.4} y={20}>
            <div style={{ ...label, fontSize: 10, color: "var(--sf-accent)" }}>THE CLUB</div>
            <p
              style={{
                fontFamily: F.body,
                fontWeight: 800,
                textTransform: "uppercase",
                fontSize: "clamp(22px, 4.5vw, 44px)",
                lineHeight: 1.15,
                letterSpacing: "-.01em",
                margin: "18px 0 0",
              }}
            >
              {aboutHead}
              {aboutHead ? " " : ""}
              <span style={{ color: "var(--sf-accent)" }}>{aboutLast}</span>
            </p>
            {config.contactUrl && (
              <a
                href={config.contactUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="t07-listlink"
                style={{
                  display: "inline-block",
                  marginTop: 30,
                  fontFamily: F.body,
                  fontWeight: 800,
                  fontSize: 13,
                  letterSpacing: ".18em",
                  textTransform: "uppercase",
                  color: "var(--sf-accent)",
                  textDecoration: "none",
                  borderBottom: "2px solid var(--sf-accent)",
                  paddingBottom: 4,
                }}
              >
                GET ON THE LIST →
              </a>
            )}
          </Reveal>
        </section>
      )}

      {/* 7 · footer ticker + imprint */}
      <footer style={{ borderTop: HAIR, paddingTop: 10 }}>
        <Marquee speed="60s" gap="3rem" style={{ opacity: 0.2 }} label={config.title}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              style={{
                fontFamily: F.display,
                fontSize: "clamp(28px, 5vw, 54px)",
                lineHeight: 1.1,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {config.title}
            </span>
          ))}
        </Marquee>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            padding: "16px 20px 22px",
            fontFamily: F.body,
            fontWeight: 600,
            fontSize: 10,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,.4)",
          }}
        >
          <span>{config.title} — NO RESTOCKS, NO RERUNS</span>
          <span>POWERED BY MIRA</span>
        </div>
      </footer>
    </div>
  );
}
