"use client";
// Product gallery — CSS scroll-snap track + dot/thumb nav. No carousel dep:
// scroll-snap beats JS carousels inside mobile webviews. Renders nothing extra
// for a single image (plain StoreImage), so templates can use it unconditionally.
import { useRef, useState } from "react";
import { StoreImage } from "../_components/StoreImage";

type Props = {
  images: string[];
  alt: string;
  monogram: string;
  /** CSS aspect-ratio of each slide, e.g. "1 / 1" or "4 / 5" */
  aspect?: string;
  /** border-radius applied to the track */
  radius?: string | number;
  /** show thumbnail strip under the track (falls back to dots) */
  thumbs?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export default function Carousel({
  images,
  alt,
  monogram,
  aspect = "1 / 1",
  radius = 0,
  thumbs = false,
  className,
  style,
}: Props) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const list = images.filter((u) => /^https:\/\//i.test(u));

  if (list.length <= 1) {
    return (
      <div className={className} style={{ aspectRatio: aspect, borderRadius: radius, overflow: "hidden", ...style }}>
        <StoreImage
          src={list[0] ?? null}
          alt={alt}
          monogram={monogram}
          eager
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    );
  }

  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
  };

  return (
    <div className={className} style={style}>
      <div
        ref={track}
        style={{
          display: "flex",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          aspectRatio: aspect,
          borderRadius: radius,
        }}
        onScroll={(e) => {
          const el = e.currentTarget;
          setActive(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {list.map((src, i) => (
          <div key={src + i} style={{ flex: "0 0 100%", scrollSnapAlign: "start", overflow: "hidden" }}>
            <StoreImage
              src={src}
              alt={`${alt} — ${i + 1} of ${list.length}`}
              monogram={monogram}
              eager={i === 0}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        ))}
      </div>
      {thumbs ? (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {list.map((src, i) => (
            <button
              key={src + i}
              type="button"
              aria-label={`Image ${i + 1}`}
              onClick={() => goTo(i)}
              style={{
                width: 52,
                height: 52,
                padding: 0,
                border: "none",
                cursor: "pointer",
                overflow: "hidden",
                borderRadius: 6,
                opacity: active === i ? 1 : 0.45,
                outline: active === i ? "2px solid var(--sf-accent, #4f6bed)" : "none",
                transition: "opacity .2s ease",
              }}
            >
              <StoreImage src={src} alt="" monogram={monogram} style={{ width: "100%", height: "100%" }} />
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10 }} aria-hidden>
          {list.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              style={{
                width: active === i ? 18 : 6,
                height: 6,
                borderRadius: 3,
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: active === i ? "var(--sf-accent, #4f6bed)" : "rgba(128,128,128,.35)",
                transition: "width .25s ease, background .25s ease",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
