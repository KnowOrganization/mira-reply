"use client";

import { motion } from "framer-motion";

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

function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

/** The account brain as a radial burst — center account, category hubs,
 *  fact leaves. Reads like the Mira logo; every spoke-tip is a real fact. */
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
  const byTopic = BRAIN_TOPICS.map((t) => ({
    ...t,
    facts: facts.filter((f) => f.topic === t.key),
  }));

  return (
    <svg
      viewBox="0 0 620 620"
      className="w-full h-full max-w-[620px] max-h-[620px]"
      onClick={() => onSelect(null)}
    >
      {byTopic.map((topic, ti) => {
        const angle0 = -90 + ti * 60;
        const [hx, hy] = polar(HUB_R, angle0);
        const n = topic.facts.length;
        const span = Math.min(46, Math.max(0, (n - 1) * 9));

        return (
          <g key={topic.key}>
            {/* spoke: center → hub */}
            <line
              x1={CX}
              y1={CY}
              x2={hx}
              y2={hy}
              stroke={n > 0 ? topic.color : "var(--border-strong)"}
              strokeWidth={n > 0 ? 2.4 : 1.4}
              strokeLinecap="round"
              strokeDasharray={n > 0 ? undefined : "3 5"}
              opacity={n > 0 ? 0.55 : 0.5}
            />

            {/* fact leaves */}
            {topic.facts.map((f, j) => {
              const a =
                n > 1 ? angle0 - span / 2 + (j * span) / (n - 1) : angle0;
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
                    opacity={active ? 0.7 : 0.32}
                  />
                  <motion.circle
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 240,
                      damping: 18,
                      delay: 0.04 * (j % 8),
                    }}
                    cx={lx}
                    cy={ly}
                    r={active ? size + 3 : size}
                    fill={topic.color}
                    stroke="var(--bg)"
                    strokeWidth={active ? 3 : 2}
                    style={{ cursor: "pointer" }}
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

      {/* center — the account */}
      <circle cx={CX} cy={CY} r={34} fill="var(--accent)" />
      <circle
        cx={CX}
        cy={CY}
        r={34}
        fill="none"
        stroke="var(--bg)"
        strokeWidth={4}
      />
      <text
        x={CX}
        y={CY + 6}
        textAnchor="middle"
        fontSize="22"
        fontWeight="800"
        fill="var(--accent-fg)"
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
