"use client";
// Blueprint measurement overlay — corner brackets + dimension lines with
// arrowheads that draw in via stroke-dashoffset. Parent cell's :hover flips
// [data-bp] to visible (see the template's <style> block); `always` renders
// it fully drawn (Detail page).
type Props = { always?: boolean; label?: string };

export default function Blueprint({ always = false, label = "1240 × 1240" }: Props) {
  const stroke = "var(--sf-accent, #ff4d00)";
  return (
    <svg
      data-bp={always ? "on" : "hover"}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      {/* corner brackets */}
      {[
        "M2,12 L2,2 L12,2",
        "M88,2 L98,2 L98,12",
        "M98,88 L98,98 L88,98",
        "M12,98 L2,98 L2,88",
      ].map((d, i) => (
        <path key={i} d={d} fill="none" stroke={stroke} strokeWidth="1.4" vectorEffect="non-scaling-stroke" className="t02-bp-line" />
      ))}
      {/* horizontal dimension line */}
      <path d="M6,93 L94,93" fill="none" stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" className="t02-bp-line" />
      <path d="M6,90.5 L6,95.5 M94,90.5 L94,95.5" stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" className="t02-bp-line" />
      {/* vertical dimension line */}
      <path d="M93,6 L93,86" fill="none" stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" className="t02-bp-line" />
      <path d="M90.5,6 L95.5,6" stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" className="t02-bp-line" />
      <text x="50" y="91" textAnchor="middle" fill={stroke} fontSize="4.2" className="t02-bp-text" style={{ fontFamily: "var(--font-space-mono), monospace" }}>
        {label}
      </text>
    </svg>
  );
}
