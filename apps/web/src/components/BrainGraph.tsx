"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

export type GraphFact = {
  id: string;
  question: string;
  answer: string;
  topic: string;
  hitCount: number;
};

export const BRAIN_TOPICS = [
  { key: "personal", label: "Personal", color: "#0095f6" },
  { key: "gear", label: "Tools", color: "#e0883a" },
  { key: "location", label: "Places", color: "#4fa86a" },
  { key: "song", label: "Music", color: "#c06ca8" },
  { key: "shop", label: "Shop", color: "#6c8fd0" },
  { key: "general", label: "Account", color: "#9aa0a6" },
] as const;

const CX = 310;
const CY = 310;
const HUB_R = 120;
const LEAF_BASE = 196;

// Background "sunburst" — dense fine spokes like the Mira logo, slowly rotating.
const BURST_SPOKES = 44;
const BURST_R0 = 52;
const BURST_LEN = 116;
const BURST_PATTERN = [1, 0.62, 0.86, 0.7, 0.95, 0.66, 0.9, 0.74, 0.83, 0.6, 0.92, 0.68];
// Energy particles emitted from the core (capped — scalable regardless of facts).
const PARTICLES = 14;

// Round trig output (Node vs browser differ in the last float digit → would break
// SSR hydration; harmless here since this tree is client-only, but cheap insurance).
const r3 = (n: number) => Math.round(n * 1000) / 1000;
function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [r3(CX + r * Math.cos(rad)), r3(CY + r * Math.sin(rad))];
}
function angleDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** The account brain as a LIVING radial burst — a rotating sunburst behind a
 *  pulsing core, with energy particles and fact leaves. Reads like the Mira
 *  logo; every spoke-tip is a real fact. Same props as before. */
export function BrainGraph({
  facts,
  handle,
  selectedId,
  onSelect,
}: {
  facts: GraphFact[];
  handle: string;
  selectedId: string | null;
  onSelect: (f: GraphFact | null) => void;
}) {
  const reduce = useReducedMotion();

  const byTopic = useMemo(
    () => BRAIN_TOPICS.map((t) => ({ ...t, facts: facts.filter((f) => f.topic === t.key) })),
    [facts]
  );

  // Angles of topics that actually have facts — used to "energize" the nearby
  // background spokes in that topic's colour.
  const activeAngles = useMemo(
    () =>
      byTopic
        .map((t, ti) => (t.facts.length > 0 ? { deg: -90 + ti * 60, color: t.color } : null))
        .filter(Boolean) as { deg: number; color: string }[],
    [byTopic]
  );

  const burst = useMemo(
    () =>
      Array.from({ length: BURST_SPOKES }, (_, i) => {
        const deg = (i / BURST_SPOKES) * 360;
        const len = BURST_PATTERN[i % BURST_PATTERN.length];
        const r1 = BURST_R0 + len * BURST_LEN;
        const [x0, y0] = polar(BURST_R0, deg);
        const [x1, y1] = polar(r1, deg);
        const hit = activeAngles.find((a) => angleDist(deg, a.deg) < 22);
        return { i, x0, y0, x1, y1, tip: i % 3 === 0, color: hit?.color ?? null, deg };
      }),
    [activeAngles]
  );

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLES }, (_, i) => {
        const deg = (i / PARTICLES) * 360 + 11;
        const [x0, y0] = polar(BURST_R0 - 10, deg);
        const [x1, y1] = polar(LEAF_BASE + 34, deg);
        return {
          i,
          x0,
          y0,
          x1,
          y1,
          color: BRAIN_TOPICS[i % BRAIN_TOPICS.length].color,
          delay: (i % PARTICLES) * 0.3,
          dur: 2.8 + (i % 4) * 0.4,
        };
      }),
    []
  );

  return (
    <svg
      viewBox="0 0 620 620"
      className="w-full h-full max-w-[620px] max-h-[620px]"
      onClick={() => onSelect(null)}
    >
      <defs>
        <radialGradient id="brainCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.9" />
          <stop offset="70%" stopColor="var(--accent)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
        <filter id="brainGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── ambient core halo ── */}
      <motion.circle
        cx={CX}
        cy={CY}
        r={150}
        fill="url(#brainCore)"
        animate={reduce ? undefined : { opacity: [0.18, 0.32, 0.18], scale: [0.96, 1.04, 0.96] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: `${CX}px ${CY}px` }}
      />

      {/* ── rotating sunburst (Mira-logo style) ── */}
      <g opacity={0.85}>
        {!reduce && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${CX} ${CY}`}
            to={`360 ${CX} ${CY}`}
            dur="90s"
            repeatCount="indefinite"
          />
        )}
        {burst.map((s) => (
          <g key={s.i}>
            <line
              x1={s.x0}
              y1={s.y0}
              x2={s.x1}
              y2={s.y1}
              stroke={s.color ?? "var(--border-strong)"}
              strokeWidth={s.color ? 2 : 1.3}
              strokeLinecap="round"
              opacity={s.color ? 0.6 : 0.34}
            >
              {!reduce && (
                <animate
                  attributeName="opacity"
                  values={s.color ? "0.35;0.75;0.35" : "0.18;0.4;0.18"}
                  dur={`${3 + (s.i % 5) * 0.5}s`}
                  repeatCount="indefinite"
                />
              )}
            </line>
            {s.tip && (
              <rect
                x={s.x1 - 2}
                y={s.y1 - 2}
                width={4}
                height={4}
                fill={s.color ?? "var(--border-strong)"}
                opacity={s.color ? 0.8 : 0.4}
              />
            )}
          </g>
        ))}
      </g>

      {/* ── energy particles drifting outward from the core ── */}
      {!reduce &&
        particles.map((p) => (
          <motion.circle
            key={`p${p.i}`}
            r={2.4}
            fill={p.color}
            filter="url(#brainGlow)"
            initial={{ cx: p.x0, cy: p.y0, opacity: 0 }}
            animate={{
              cx: [p.x0, p.x1],
              cy: [p.y0, p.y1],
              opacity: [0, 0.9, 0],
              scale: [0.4, 1, 0.3],
            }}
            transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeOut" }}
            style={{ transformOrigin: `${CX}px ${CY}px` }}
          />
        ))}

      {/* ── category hubs + fact leaves ── */}
      {byTopic.map((topic, ti) => {
        const angle0 = -90 + ti * 60;
        const [hx, hy] = polar(HUB_R, angle0);
        const n = topic.facts.length;
        const span = Math.min(46, Math.max(0, (n - 1) * 9));

        return (
          <g key={topic.key}>
            {/* spoke: center → hub (energised when it has facts) */}
            <line
              x1={CX}
              y1={CY}
              x2={hx}
              y2={hy}
              stroke={n > 0 ? topic.color : "var(--border-strong)"}
              strokeWidth={n > 0 ? 2.4 : 1.4}
              strokeLinecap="round"
              strokeDasharray={n > 0 ? "5 7" : "3 5"}
              opacity={n > 0 ? 0.6 : 0.45}
            >
              {n > 0 && !reduce && (
                <animate attributeName="stroke-dashoffset" values="24;0" dur="1.1s" repeatCount="indefinite" />
              )}
            </line>

            {/* fact leaves */}
            {topic.facts.map((f, j) => {
              const a = n > 1 ? angle0 - span / 2 + (j * span) / (n - 1) : angle0;
              const jitter = ((ti * 7 + j * 13) % 5) * 15;
              const r = LEAF_BASE + jitter;
              const [lx, ly] = polar(r, a);
              const size = 5 + Math.min(f.hitCount, 7);
              const active = f.id === selectedId;
              return (
                <g key={f.id}>
                  <line
                    x1={hx}
                    y1={hy}
                    x2={lx}
                    y2={ly}
                    stroke={topic.color}
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    opacity={active ? 0.75 : 0.32}
                  />
                  <motion.circle
                    initial={{ scale: 0, opacity: 0 }}
                    animate={
                      reduce
                        ? { scale: 1, opacity: 1 }
                        : { scale: [1, 1.12, 1], opacity: 1 }
                    }
                    transition={
                      reduce
                        ? { duration: 0.3 }
                        : {
                            scale: { duration: 3 + (j % 4) * 0.5, repeat: Infinity, ease: "easeInOut" },
                            opacity: { type: "spring", stiffness: 240, damping: 18, delay: 0.04 * (j % 8) },
                          }
                    }
                    cx={lx}
                    cy={ly}
                    r={active ? size + 3 : size}
                    fill={topic.color}
                    stroke="var(--bg)"
                    strokeWidth={active ? 3 : 2}
                    filter={active ? "url(#brainGlow)" : undefined}
                    style={{ cursor: "pointer", transformOrigin: `${lx}px ${ly}px` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(f);
                    }}
                  >
                    <title>{`${f.question} — ${f.answer}`}</title>
                  </motion.circle>
                </g>
              );
            })}

            {/* hub */}
            <motion.circle
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.03 * ti }}
              cx={hx}
              cy={hy}
              r={n > 0 ? 9 : 6}
              fill={n > 0 ? topic.color : "var(--bg-elev)"}
              stroke="var(--bg)"
              strokeWidth={2.5}
              filter={n > 0 ? "url(#brainGlow)" : undefined}
            />
            <text
              x={hx}
              y={hy + (hy < CY ? -16 : 22)}
              textAnchor="middle"
              fontSize="12.5"
              fontWeight="700"
              fill={n > 0 ? "var(--text)" : "var(--text-subtle)"}
            >
              {topic.label}
            </text>
            <text
              x={hx}
              y={hy + (hy < CY ? -3 : 35)}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-subtle)"
            >
              {n > 0 ? `${n} fact${n === 1 ? "" : "s"}` : "empty"}
            </text>
          </g>
        );
      })}

      {/* ── pulsing core ── */}
      {!reduce &&
        [0, 1].map((k) => (
          <motion.circle
            key={`pulse${k}`}
            cx={CX}
            cy={CY}
            r={34}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: [1, 2.1], opacity: [0.5, 0] }}
            transition={{ duration: 2.6, delay: k * 1.3, repeat: Infinity, ease: "easeOut" }}
            style={{ transformOrigin: `${CX}px ${CY}px` }}
          />
        ))}
      <motion.circle
        cx={CX}
        cy={CY}
        r={34}
        fill="var(--accent)"
        filter="url(#brainGlow)"
        animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: `${CX}px ${CY}px` }}
      />
      <circle cx={CX} cy={CY} r={34} fill="none" stroke="var(--bg)" strokeWidth={4} />
      <text
        x={CX}
        y={CY + 6}
        textAnchor="middle"
        fontSize="22"
        fontWeight="800"
        fill="var(--accent-fg)"
        style={{ pointerEvents: "none" }}
      >
        {(handle || "M").replace(/^@/, "").slice(0, 1).toUpperCase()}
      </text>
      <text
        x={CX}
        y={CY + 60}
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill="var(--text)"
      >
        @{handle || "your account"}
      </text>
    </svg>
  );
}
