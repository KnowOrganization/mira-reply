// StatusIcon — Linear-style status glyph. Pure presentation: caller passes the
// resolved color + variant; no status logic lives here.
export type StatusVariant = "empty" | "progress" | "done" | "dashed";

export function StatusIcon({
  color = "var(--st-todo)",
  variant = "empty",
  size = 14,
  className,
}: {
  color?: string;
  variant?: StatusVariant;
  size?: number;
  className?: string;
}) {
  const r = 6;
  const c = 8;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ flexShrink: 0 }} aria-hidden>
      <circle
        cx={c} cy={c} r={r}
        fill="none" stroke={color} strokeWidth={1.6}
        strokeDasharray={variant === "dashed" ? "2.2 2.2" : undefined}
      />
      {variant === "progress" && (
        // half-filled pie wedge
        <path d={`M ${c} ${c} L ${c} ${c - r} A ${r} ${r} 0 0 1 ${c} ${c + r} Z`} fill={color} />
      )}
      {variant === "done" && (
        <>
          <circle cx={c} cy={c} r={r} fill={color} />
          <path d="M5.2 8.1l1.9 1.9 3.7-3.9" fill="none" stroke="var(--bg)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}
