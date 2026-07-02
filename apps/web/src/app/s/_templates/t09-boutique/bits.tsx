// t09-boutique "The Ritual" — shared server-side bits (no "use client").
// Palette, root vars, and the product-image treatment incl. the "embossed
// jar lid" empty state (monogram inside a soft accent-wash circle).
import { StoreImage } from "../../_components/StoreImage";
import { TEMPLATE_FONTS } from "../_shared/fonts";

export const F = TEMPLATE_FONTS["t09-boutique"];

export const BG = "#f7f1ee";
export const INK = "#3e3733";
export const MUTED = "#8d8078";
export const SOFTINK = "#6d635c";
export const HAIR = "#e6ddd7";
export const WHISPER = "#b5a99f";

export const monogram = (s: string) => (s.trim()[0] || "•").toUpperCase();

export const excerpt = (s: string, n = 170) =>
  s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s;

export function rootVars(accent: string, accentFg: string): React.CSSProperties {
  return {
    ["--sf-accent" as string]: accent,
    ["--sf-accent-fg" as string]: accentFg,
    // misty tint for image beds + StoreImage monogram tiles
    ["--sf-accent-soft" as string]: "color-mix(in srgb, var(--sf-accent), white 88%)",
    // the spec wash — softened accent for blocks, circles, spotlight
    ["--t09-wash" as string]: "color-mix(in srgb, var(--sf-accent), white 65%)",
    // deepened accent for tiny type + liquid CTA fills
    ["--t09-deep" as string]: "color-mix(in srgb, var(--sf-accent), #3e3733 32%)",
    background: BG,
    color: INK,
    fontFamily: F.body,
    fontSize: 15,
    lineHeight: 1.7,
    minHeight: "100vh",
  };
}

/**
 * Product image. Known-null src → monogram embossed on an accent-wash circle
 * (a jar lid) resting on a misty bed. Real URLs render via StoreImage (which
 * still degrades to its own monogram tile if the URL rots at runtime).
 */
export function RitualImage({
  src,
  alt,
  title,
  aspect = "4 / 5",
  radius = 12,
  eager,
}: {
  src: string | null;
  alt: string;
  title: string;
  aspect?: string;
  radius?: number;
  eager?: boolean;
}) {
  if (!src) {
    return (
      <div
        style={{
          aspectRatio: aspect,
          borderRadius: radius,
          overflow: "hidden",
          background: "color-mix(in srgb, var(--sf-accent), white 92%)",
          display: "grid",
          placeItems: "center",
        }}
        aria-label={alt}
      >
        <div
          style={{
            width: "56%",
            aspectRatio: "1 / 1",
            borderRadius: "50%",
            overflow: "hidden",
            boxShadow:
              "inset 0 3px 10px rgba(62,55,51,.14), inset 0 -3px 8px rgba(255,255,255,.75), 0 2px 6px rgba(62,55,51,.08)",
          }}
        >
          <StoreImage
            src={null}
            alt={alt}
            monogram={monogram(title)}
            style={{
              width: "100%",
              height: "100%",
              background: "var(--t09-wash)",
              color: "var(--t09-deep)",
              fontFamily: F.display,
              fontWeight: 400,
              fontSize: "clamp(30px, 6vw, 58px)",
              textShadow: "0 1px 0 rgba(255,255,255,.55)",
            }}
          />
        </div>
      </div>
    );
  }
  return (
    <div
      className="t09-exhale"
      style={{
        aspectRatio: aspect,
        borderRadius: radius,
        overflow: "hidden",
        background: "var(--sf-accent-soft)",
      }}
    >
      <StoreImage
        src={src}
        alt={alt}
        monogram={monogram(title)}
        eager={eager}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
