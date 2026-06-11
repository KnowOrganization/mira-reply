"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";
import { SPRING } from "./utils";

export function BrainPanel({
  open,
  stats,
  tools,
  onClose,
}: {
  open: boolean;
  stats: {
    tool: string;
    count: number;
    errorRate: number;
    p50: number;
    p95: number;
    open: boolean;
  }[];
  tools: { name: string; description: string }[];
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={SPRING}
          className="absolute z-20 right-4 top-16 w-[420px] rounded-2xl overflow-hidden"
          style={{
            background: "var(--bg-elev)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <Activity size={14} />
              <span className="text-[13px] font-bold">Brain MCP</span>
              <span
                className="text-[10.5px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent-deep)",
                }}
              >
                {tools.length} tools
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-[11px] font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              close
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            <div
              className="grid grid-cols-[1fr_60px_60px_50px_50px] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider font-semibold border-b"
              style={{ borderColor: "var(--border)", color: "var(--text-subtle)" }}
            >
              <span>tool</span>
              <span className="text-right">p50ms</span>
              <span className="text-right">p95ms</span>
              <span className="text-right">err</span>
              <span className="text-right">n</span>
            </div>

            {stats.length === 0 ? (
              <div
                className="px-4 py-6 text-[12px] text-center"
                style={{ color: "var(--text-subtle)" }}
              >
                No calls yet. Send a comment to populate.
              </div>
            ) : (
              stats.map((s) => (
                <div
                  key={s.tool}
                  className="grid grid-cols-[1fr_60px_60px_50px_50px] gap-2 px-4 py-2 text-[11.5px] items-center"
                  style={{
                    borderTop: "1px solid var(--border)",
                    opacity: s.open ? 0.5 : 1,
                  }}
                >
                  <span className="font-mono truncate">
                    {s.tool}
                    {s.open && (
                      <span
                        className="ml-2 text-[9.5px] px-1 py-0.5 rounded font-bold uppercase"
                        style={{ background: "#7a1f1f", color: "#fff" }}
                      >
                        open
                      </span>
                    )}
                  </span>
                  <span className="text-right tabular-nums">{s.p50}</span>
                  <span className="text-right tabular-nums">{s.p95}</span>
                  <span
                    className="text-right tabular-nums"
                    style={{
                      color:
                        s.errorRate > 0 ? "#d97757" : "var(--text-subtle)",
                    }}
                  >
                    {(s.errorRate * 100).toFixed(0)}%
                  </span>
                  <span
                    className="text-right tabular-nums"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    {s.count}
                  </span>
                </div>
              ))
            )}

            <div
              className="px-4 py-3 border-t text-[10.5px]"
              style={{ borderColor: "var(--border)", color: "var(--text-subtle)" }}
            >
              Available tools:{" "}
              {tools.map((t) => t.name).join(" · ")}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
