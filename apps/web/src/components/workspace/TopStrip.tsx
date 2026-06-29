"use client";

import { motion } from "framer-motion";
import { Activity, RefreshCw, Loader2 } from "lucide-react";
import { MODES, MODE_HINT, dur } from "./utils";
import { AccountSwitcher } from "./AccountSwitcher";

function Stat({ n, label, accent }: { n: number; label: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="font-bold tabular-nums text-[13px]"
        style={{ color: accent ? "var(--accent)" : "var(--text)" }}
      >
        {n}
      </span>
      <span style={{ color: "var(--text-subtle)" }}>{label}</span>
    </div>
  );
}

export function TopStrip({
  account,
  mode,
  setMode,
  newToday,
  autoSent,
  inDraft,
  needYou,
  topTheme,
  shiftStart,
  syncing,
  onSync,
  brainOpen,
  onToggleBrain,
}: {
  account: string;
  mode: string;
  setMode: (m: string) => void;
  newToday: number;
  autoSent: number;
  inDraft: number;
  needYou: number;
  topTheme: string | null;
  shiftStart: number;
  syncing: boolean;
  onSync: () => void;
  brainOpen: boolean;
  onToggleBrain: () => void;
}) {
  return (
    <div
      className="shrink-0 border-b"
      style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
    >
      <div className="flex items-center gap-3 px-5 h-14">
        <div className="flex items-center gap-2">
          <span className="glow-dot" />
          <span className="text-[13.5px] font-bold">
            {account ? `@${account}` : "Mira"}
          </span>
          <AccountSwitcher account={account} />
        </div>
        <div className="mx-auto flex items-center gap-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: "var(--text-subtle)" }}
          >
            Autonomy
          </span>
          <div
            className="flex items-center gap-0.5 p-1 rounded-2xl"
            style={{ background: "var(--bg-inset)" }}
          >
            {MODES.map((m) => (
              <motion.button
                key={m}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMode(m)}
                title={MODE_HINT[m]}
                className="h-8 px-3 rounded-xl text-[12px] font-semibold capitalize transition-colors"
                style={
                  mode === m
                    ? {
                        background: "var(--accent)",
                        color: "var(--accent-fg)",
                        boxShadow: "var(--shadow-card)",
                      }
                    : { color: "var(--text-muted)" }
                }
              >
                {m}
              </motion.button>
            ))}
          </div>
          <span
            className="text-[11.5px] italic max-w-[220px] truncate"
            style={{ color: "var(--text-subtle)" }}
          >
            {MODE_HINT[mode]}
          </span>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onToggleBrain}
          className="h-9 px-3 rounded-xl text-[12px] font-semibold flex items-center gap-1.5"
          style={
            brainOpen
              ? { background: "var(--accent)", color: "var(--accent-fg)" }
              : { background: "var(--bg-inset)", color: "var(--text-muted)" }
          }
        >
          <Activity size={13} />
          Brain
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onSync}
          disabled={syncing}
          className="h-9 px-3 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 disabled:opacity-60"
          style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
        >
          {syncing ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
          Sync
        </motion.button>
        {shiftStart > 0 && (
          <span className="text-[11.5px]" style={{ color: "var(--text-subtle)" }}>
            shift · {dur(Date.now() - shiftStart)}
          </span>
        )}
      </div>
      <div
        className="flex items-center gap-6 px-5 h-10 border-t text-[12px]"
        style={{ borderColor: "var(--border)" }}
      >
        <Stat n={newToday} label="new today" />
        <Stat n={autoSent} label="auto-sent" />
        <Stat n={inDraft} label="in draft" />
        <Stat n={needYou} label="need you" accent={needYou > 0} />
        {topTheme && (
          <div className="flex items-center gap-1.5">
            <span style={{ color: "var(--text-subtle)" }}>most-asked</span>
            <span
              className="font-semibold lowercase"
              style={{ color: "var(--accent)" }}
            >
              {topTheme.length > 26 ? topTheme.slice(0, 26) + "…" : topTheme}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
