"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  showWordmark?: boolean;
  pulse?: boolean;
  className?: string;
  /** Glyph color — defaults to the theme text token. Pass e.g. var(--accent-fg)
   *  to sit the logo inside an accent box, or var(--accent) for a tinted box. */
  color?: string;
};

// organic spoke-length pattern — repeats around the burst
const PATTERN = [1, 0.7, 0.9, 0.62, 0.86, 0.76, 0.97, 0.66, 0.82, 0.72, 0.93, 0.64, 0.88];
const SPOKES = 32;

// Math.sin/cos differ in the last float digit between Node and the browser,
// which breaks SSR hydration. Round to 3 decimals so both sides match.
const r3 = (n: number) => Math.round(n * 1000) / 1000;

export function MiraLogo({
  size = 28,
  showWordmark = false,
  pulse = false,
  className,
  color = "var(--text)",
}: Props) {
  const marks: React.ReactNode[] = [];
  for (let i = 0; i < SPOKES; i++) {
    const a = (i / SPOKES) * Math.PI * 2;
    const len = PATTERN[i % PATTERN.length];
    const r0 = 13;
    const r1 = 13 + len * 33;
    const x0 = r3(50 + Math.cos(a) * r0);
    const y0 = r3(50 + Math.sin(a) * r0);
    const x1 = r3(50 + Math.cos(a) * r1);
    const y1 = r3(50 + Math.sin(a) * r1);
    marks.push(
      <line
        key={i}
        x1={x0}
        y1={y0}
        x2={x1}
        y2={y1}
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    );
    // tiny square at every third tip — the recurring motif
    if (i % 3 === 0) {
      marks.push(
        <rect key={`s${i}`} x={x1 - 2} y={y1 - 2} width={4} height={4} fill="currentColor" />
      );
    }
  }

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <motion.div
        whileHover={{ rotate: 24 }}
        transition={{ type: "spring", stiffness: 110, damping: 13 }}
        className="relative shrink-0"
        style={{ width: size, height: size, color }}
      >
        <svg width={size} height={size} viewBox="0 0 100 100" className="block">
          {marks}
          <circle cx={50} cy={50} r={6} fill="currentColor" />
        </svg>
        {pulse && (
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 rounded-full"
            style={{
              width: Math.max(6, size * 0.16),
              height: Math.max(6, size * 0.16),
              background: "var(--text)",
              boxShadow: "0 0 0 2px var(--bg)",
            }}
          />
        )}
      </motion.div>

      {showWordmark && (
        <span
          className="display"
          style={{
            fontSize: Math.round(size * 0.78),
            color: "var(--text)",
            letterSpacing: "-0.05em",
          }}
        >
          Mira
        </span>
      )}
    </div>
  );
}
