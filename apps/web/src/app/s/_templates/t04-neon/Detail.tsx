// t04-neon Detail — a program's install screen. Boot-in choreography (Reveal
// blocks with incremental delays), holo-framed gallery (Tilt + Carousel),
// Unbounded display name, dashed-accent price chip, terminal readme with a
// blinking cursor, big "GET — INSTALL" neon-ring CTA, OTHER PROGRAMS 4-up.
// RSC — interactivity via kit islands only; scoped CSS in ONE <style> block.
import Link from "next/link";
import { StoreImage } from "../../_components/StoreImage";
import AddToCart from "../../_components/AddToCart";
import { Reveal, Tilt, Carousel } from "../../_motion";
import { TEMPLATE_FONTS } from "../_shared/fonts";
import { Price } from "../_shared/Price";
import type { DetailProps, SfProduct, StorefrontConfig } from "../_shared/types";

const F = TEMPLATE_FONTS["t04-neon"];
const BG = "#070912";
const PANEL = "#0b0f1e";
const INK = "#e9edf6";
const DIM = "#8a93ad";
const FAINT = "#525c78";

const A = (pct: number) => `color-mix(in srgb, var(--sf-accent) ${pct}%, transparent)`;
const GLOW = `0 0 24px ${A(55)}`;
const HAIR = `1px solid ${A(26)}`;

const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();
const href = (slug: string, p: SfProduct) => `/s/${slug}/p/${p.slug ?? p.id}`;

const label: React.CSSProperties = {
  fontFamily: F.body,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  color: "var(--sf-accent)",
};

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

/** AWAITING VISUAL FEED — the deliberate no-image treatment */
function AwaitingFeed({ title }: { title: string }) {
  return (
    <div
      style={{
        aspectRatio: "16 / 10",
        position: "relative",
        overflow: "hidden",
        background: "#0a0e1c",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        borderRadius: 8,
      }}
    >
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
          width: 84,
          height: 84,
          border: `1px solid ${A(65)}`,
          borderRadius: 10,
          boxShadow: `${GLOW}, inset 0 0 20px ${A(20)}`,
          overflow: "hidden",
          fontFamily: F.display,
        }}
      >
        <StoreImage
          src={null}
          alt={title}
          monogram={monogram(title)}
          style={{ width: "100%", height: "100%", fontSize: 34, background: "transparent", color: "var(--sf-accent)" }}
        />
      </div>
      <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 500, letterSpacing: "0.3em", textTransform: "uppercase", color: FAINT }}>
        Awaiting visual feed
      </div>
    </div>
  );
}

export default function Detail({ config, product, more, slug }: DetailProps) {
  const isPreview = slug.startsWith("preview");
  const gallery = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const others = more.slice(0, 4);

  return (
    <div
      className={`t04-root ${F.className}`}
      style={{
        ["--sf-accent" as string]: config.accent,
        ["--sf-accent-fg" as string]: config.accentFg,
        ["--sf-accent-soft" as string]: `color-mix(in srgb, ${config.accent} 16%, ${PANEL})`,
        background: BG,
        color: INK,
        fontFamily: F.body,
        minHeight: "100vh",
      } as React.CSSProperties}
    >
      <style>{`
        .t04-root ::selection { background: var(--sf-accent); color: var(--sf-accent-fg); }
        .t04-root a { -webkit-tap-highlight-color: transparent; }

        @keyframes t04-blink { 0%, 100% { opacity: 1; } 50% { opacity: .15; } }
        .t04-dot { animation: t04-blink 2s ease-in-out infinite; }
        @keyframes t04-cursor { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        .t04-cursor { animation: t04-cursor 1.1s steps(1) infinite; }
        @keyframes t04-pulse { 0%, 100% { opacity: .2; } 50% { opacity: .85; } }
        .t04-pulse { animation: t04-pulse 4s ease-in-out infinite; }

        .t04-card { transition: border-color .3s ease, box-shadow .3s ease; }
        .t04-card:hover {
          border-color: color-mix(in srgb, var(--sf-accent) 70%, transparent);
          box-shadow: 0 0 24px color-mix(in srgb, var(--sf-accent) 55%, transparent);
        }
        .t04-card:hover .t04-img { transform: scale(1.045); }
        .t04-runchip { transition: box-shadow .3s ease, background .3s ease; }
        .t04-runchip:hover { box-shadow: 0 0 24px color-mix(in srgb, var(--sf-accent) 55%, transparent); background: color-mix(in srgb, var(--sf-accent) 16%, transparent); }

        .t04-det { display: grid; grid-template-columns: 1fr; gap: 34px; align-items: start; }
        .t04-more { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        @media (min-width: 900px) {
          .t04-det { grid-template-columns: 1.05fr 1fr; gap: 48px; }
          .t04-more { grid-template-columns: repeat(4, 1fr); gap: 18px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .t04-dot, .t04-cursor, .t04-pulse { animation: none !important; }
        }
      `}</style>

      {/* HUD nav */}
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
          <Link
            href={`/s/${slug}`}
            style={{
              fontFamily: F.body,
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: INK,
              textDecoration: "none",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            [← {config.title}]
          </Link>
          <span style={{ flex: 1 }} />
          {!isPreview && (
            <Link
              href={`/s/${slug}/cart`}
              className="t04-runchip"
              style={{
                fontFamily: F.body,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.14em",
                color: "var(--sf-accent)",
                border: `1px solid ${A(50)}`,
                borderRadius: 6,
                padding: "6px 12px",
                textDecoration: "none",
              }}
            >
              [CART]
            </Link>
          )}
        </div>
      </header>

      {/* boot-in main */}
      <main className="t04-det" style={{ maxWidth: 1200, margin: "0 auto", padding: "34px 20px 56px" }}>
        {/* holo-frame gallery */}
        <Reveal y={26}>
          <Tilt max={5} hoverScale={1.008}>
            <div
              style={{
                background: PANEL,
                border: `1px solid ${A(60)}`,
                borderRadius: 12,
                boxShadow: `${GLOW}, inset 0 0 30px ${A(8)}`,
                padding: 10,
              }}
            >
              {gallery.length ? (
                <Carousel
                  images={gallery}
                  alt={product.title}
                  monogram={monogram(product.title)}
                  aspect="16 / 10"
                  radius={8}
                  thumbs={gallery.length > 1}
                />
              ) : (
                <AwaitingFeed title={product.title} />
              )}
            </div>
          </Tilt>
        </Reveal>

        {/* program spec sheet */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Reveal delay={0.06} y={16}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ ...label, fontSize: 10 }}>
                {"//"} {product.subtitle ?? "PROGRAM FILE"}
              </span>
              <span
                style={{
                  fontFamily: F.body,
                  fontSize: 9.5,
                  letterSpacing: "0.18em",
                  color: product.available ? "var(--sf-accent)" : FAINT,
                  border: `1px solid ${product.available ? A(45) : "rgba(255,255,255,.12)"}`,
                  borderRadius: 4,
                  padding: "3px 8px",
                }}
              >
                {product.available ? "STATUS: LIVE" : "STATUS: OFFLINE"}
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.12} y={20}>
            <h1
              style={{
                fontFamily: F.display,
                fontWeight: 800,
                fontSize: "clamp(28px, 6vw, 64px)",
                lineHeight: 1.04,
                letterSpacing: "-0.01em",
                textTransform: "uppercase",
                margin: 0,
                textShadow: `0 0 24px ${A(40)}`,
              }}
            >
              {product.title}
            </h1>
          </Reveal>

          <Reveal delay={0.18} y={16}>
            <div>
              <Price
                minor={product.priceMinor}
                currency={product.currency}
                fallback={product.priceText}
                style={{
                  display: "inline-block",
                  fontFamily: F.body,
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--sf-accent)",
                  fontVariantNumeric: "tabular-nums",
                  textShadow: `0 0 14px ${A(45)}`,
                  border: `1px dashed ${A(60)}`,
                  borderRadius: 8,
                  padding: "10px 18px",
                }}
              />
            </div>
          </Reveal>

          {product.description && (
            <Reveal delay={0.24} y={18}>
              <div style={{ border: HAIR, borderRadius: 12, overflow: "hidden", background: PANEL }}>
                <TermBar text="readme.txt" />
                <div style={{ padding: "18px 20px 20px" }}>
                  <p style={{ fontSize: 14, lineHeight: 1.75, color: DIM, whiteSpace: "pre-line", margin: 0 }}>
                    {product.description}
                    <span aria-hidden className="t04-cursor" style={{ display: "inline-block", width: 8, height: 15, background: "var(--sf-accent)", marginLeft: 6, verticalAlign: "text-bottom", boxShadow: `0 0 8px ${A(60)}` }} />
                  </p>
                </div>
              </div>
            </Reveal>
          )}

          <Reveal delay={0.3} y={16}>
            <div>
              <AddToCart
                product={product}
                config={config}
                slug={slug}
                fx="neon-ring"
                label="GET — INSTALL"
                addedLabel="INSTALLED ✓"
                style={{
                  width: "100%",
                  background: "var(--sf-accent)",
                  color: "var(--sf-accent-fg)",
                  borderRadius: 8,
                  fontFamily: F.body,
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "0.14em",
                  padding: "16px 24px",
                  boxShadow: GLOW,
                }}
              />
              <div style={{ marginTop: 12, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: FAINT, textAlign: "center" }}>
                PKG {product.id.toUpperCase().slice(0, 12)} · DIGITAL DELIVERY
              </div>
            </div>
          </Reveal>
        </div>
      </main>

      {/* OTHER PROGRAMS */}
      {others.length > 0 && (
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 56px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 20 }}>
            <span style={label}>{"//"} Other programs</span>
            <span aria-hidden style={{ flex: 1, height: 1, background: A(18) }} />
          </div>
          <div className="t04-more">
            {others.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.08} y={20}>
                <Link href={href(slug, p)} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <div className="t04-card" style={{ background: PANEL, border: HAIR, borderRadius: 10, overflow: "hidden", position: "relative" }}>
                    <div style={{ aspectRatio: "16 / 10", overflow: "hidden", position: "relative" }}>
                      <StoreImage
                        src={p.imageUrl}
                        alt={p.title}
                        monogram={monogram(p.title)}
                        className="t04-img"
                        style={{ width: "100%", height: "100%", transition: "transform .5s cubic-bezier(.16,1,.3,1)", fontFamily: F.display, background: "var(--sf-accent-soft)", color: "var(--sf-accent)" }}
                      />
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
                    <div style={{ padding: "12px 13px 14px" }}>
                      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 13.5, lineHeight: 1.3 }}>{p.title}</div>
                      <div style={{ marginTop: 7 }}>
                        <Price
                          minor={p.priceMinor}
                          currency={p.currency}
                          fallback={p.priceText}
                          style={{ fontSize: 12.5, fontWeight: 700, color: "var(--sf-accent)", fontVariantNumeric: "tabular-nums" }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* footer */}
      <footer>
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
