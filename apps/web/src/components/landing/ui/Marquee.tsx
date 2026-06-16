"use client";

type Props = {
  children: React.ReactNode;
  speed?: string;
  className?: string;
};

// Infinite belt — two identical tracks, CSS-animated. GPU only, no JS ticks.
export function Marquee({ children, speed = "28s", className }: Props) {
  return (
    <div
      className={`m-marquee ${className ?? ""}`}
      style={{ "--m-marquee-speed": speed } as React.CSSProperties}
      aria-hidden
    >
      <div className="m-marquee-track">{children}</div>
      <div className="m-marquee-track">{children}</div>
    </div>
  );
}
