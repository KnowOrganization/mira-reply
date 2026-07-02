"use client";
// Infinite belt — two identical tracks, CSS-animated (see motion.css).
// GPU only, no JS ticks. Stops entirely under prefers-reduced-motion.
type Props = {
  children: React.ReactNode;
  /** CSS duration for one loop, e.g. "28s" */
  speed?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  /** gap between repeated items, CSS length */
  gap?: string;
  className?: string;
  style?: React.CSSProperties;
  /** accessible text (the belt itself is decorative) */
  label?: string;
};

export default function Marquee({
  children,
  speed = "28s",
  reverse = false,
  pauseOnHover = false,
  gap = "2rem",
  className,
  style,
  label,
}: Props) {
  return (
    <div
      className={`sf-marquee ${className ?? ""}`}
      data-reverse={reverse}
      data-pause-hover={pauseOnHover}
      style={{ "--sf-marquee-speed": speed, "--sf-marquee-gap": gap, ...style } as React.CSSProperties}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <div className="sf-marquee-track" aria-hidden>
        {children}
      </div>
      <div className="sf-marquee-track" aria-hidden>
        {children}
      </div>
    </div>
  );
}
