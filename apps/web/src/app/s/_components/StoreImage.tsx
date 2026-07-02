"use client";
// Image with a graceful fallback — owner-pasted URLs rot (IG CDN expires), so a
// broken src degrades to a monogram tile instead of a broken-image icon. Plain
// <img> on purpose (never next/image: arbitrary external URLs / SSRF surface).
import { useState } from "react";

export function StoreImage({
  src,
  alt,
  monogram,
  className,
  style,
  eager,
}: {
  src?: string | null;
  alt: string;
  monogram: string;
  className?: string;
  style?: React.CSSProperties;
  eager?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const ok = src && /^https:\/\//i.test(src) && !broken;
  if (!ok) {
    return (
      <div
        className={className}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--sf-accent-soft, #eceffd)", color: "var(--sf-accent, #4f6bed)", fontWeight: 700, fontSize: "clamp(28px, 6vw, 56px)", letterSpacing: "-0.03em", ...style }}
        aria-label={alt}
      >
        {monogram}
      </div>
    );
  }
  return (
    <img
      src={src!}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      onError={() => setBroken(true)}
      className={className}
      style={{ objectFit: "cover", ...style }}
    />
  );
}
