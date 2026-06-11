"use client";

// Shared sub-components used by PostStage: Section, Muted, InsightStat,
// AddLinkForm, MiniClar, CommentRow.

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Send,
  Loader2,
  Plus,
} from "lucide-react";
import { useClarificationAction } from "@/lib/api/hooks";
import { LINK_TYPES, ago } from "./utils";
import { Avatar } from "./Avatar";
import type { Clar, Row } from "./types";

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center mb-2">
        <span
          className="text-[10.5px] font-bold uppercase tracking-[0.09em]"
          style={{ color: "var(--text-subtle)" }}
        >
          {title}
        </span>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {children}
    </div>
  );
}

export function Muted({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] leading-5" style={{ color: "var(--text-subtle)" }}>
      {children}
    </div>
  );
}

export function InsightStat({
  icon,
  label,
  v,
}: {
  icon: React.ReactNode;
  label: string;
  v?: number;
}) {
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}
    >
      <div
        className="text-[10px] flex items-center gap-1"
        style={{ color: "var(--text-subtle)" }}
      >
        {icon}
        {label}
      </div>
      <div className="text-[17px] font-bold tabular-nums mt-0.5">
        {v != null ? v.toLocaleString() : "—"}
      </div>
    </div>
  );
}

export function AddLinkForm({
  onAdd,
  onCancel,
}: {
  onAdd: (l: { label: string; url: string; type: string }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<string>("location");
  const ok = label.trim() && url.trim();
  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}
    >
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label — e.g. Munnar tea estate"
        className="w-full h-9 px-3 rounded-lg bg-transparent text-[13px] outline-none"
        style={{ border: "1px solid var(--border-strong)" }}
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…"
        className="w-full h-9 px-3 rounded-lg bg-transparent text-[13px] outline-none"
        style={{ border: "1px solid var(--border-strong)" }}
      />
      <div className="flex items-center gap-1.5 flex-wrap">
        {LINK_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className="h-7 px-2.5 rounded-lg text-[11px] font-semibold capitalize transition-colors"
            style={
              type === t
                ? { background: "var(--accent)", color: "var(--accent-fg)" }
                : { background: "var(--bg-inset)", color: "var(--text-muted)" }
            }
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => ok && onAdd({ label: label.trim(), url: url.trim(), type })}
          disabled={!ok}
          className="h-9 px-3.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          <Plus size={12} /> Add link
        </motion.button>
        <button
          onClick={onCancel}
          className="h-9 px-3 rounded-xl text-[12px] font-semibold"
          style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function MiniClar({
  clar,
  reload,
}: {
  clar: Clar;
  reload: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const clarAction = useClarificationAction();
  async function answer() {
    if (!text.trim() || busy) return;
    setBusy(true);
    await clarAction.mutateAsync({ id: clar.id, body: { action: "answer", answer: text.trim() } }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1000));
    await reload();
    setBusy(false);
  }
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}
    >
      <div className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
        @{clar.fromUsername || clar.fromUserId.slice(0, 6)}: "{clar.commentText}"
      </div>
      <div className="text-[12.5px] font-semibold mt-0.5 mb-2">
        {clar.question}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && answer()}
          placeholder={clar.kind === "link" ? "Paste link…" : "Answer…"}
          className="flex-1 h-9 px-3 rounded-lg bg-transparent text-[12.5px] outline-none"
          style={{ border: "1px solid var(--border-strong)" }}
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={answer}
          disabled={busy || !text.trim()}
          className="h-9 px-3 rounded-lg text-[12px] font-bold flex items-center gap-1 disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
        </motion.button>
      </div>
    </div>
  );
}

export function CommentRow({ c }: { c: Row }) {
  const uname = c.fromUsername || c.fromUserId.slice(0, 8);
  const reply = c.ownReply?.text || (c.status === "pending" ? c.draftText : "");
  const badge =
    c.status === "replied"
      ? { label: "replied", soft: false }
      : c.status === "needs_info"
      ? { label: "needs you", soft: true }
      : c.status === "pending"
      ? { label: "draft", soft: true }
      : null;
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={uname} size={28} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-bold truncate">@{uname}</span>
            {c.isSuperfan && (
              <span style={{ color: "var(--accent)" }} title="Top commenter">
                ★
              </span>
            )}
            <span
              className="text-[10px] shrink-0"
              style={{ color: "var(--text-subtle)" }}
            >
              {ago(c.ts)}
            </span>
            {badge && (
              <span
                className="ml-auto text-[9.5px] px-1.5 py-0.5 rounded font-semibold shrink-0"
                style={
                  badge.soft
                    ? {
                        background: "var(--accent-soft)",
                        color: "var(--accent-deep)",
                      }
                    : {
                        background: "var(--bg-inset)",
                        color: "var(--text-muted)",
                      }
                }
              >
                {badge.label}
              </span>
            )}
          </div>
          <div className="text-[13px] mt-0.5 leading-snug">{c.text}</div>
          {reply && (
            <div className="flex items-start gap-1.5 mt-1.5">
              <Sparkles
                size={11}
                className="mt-[3px] shrink-0"
                style={{ color: "var(--accent)" }}
              />
              <span
                className="text-[12px] leading-snug font-medium"
                style={{ color: "var(--accent-deep)" }}
              >
                {reply}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
