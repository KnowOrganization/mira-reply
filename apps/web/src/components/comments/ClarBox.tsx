"use client";

import { useState } from "react";
import { HelpCircle, Loader2, Send } from "lucide-react";
import type { Clarification } from "./types";

export function ClarBox({
  clar,
  onAnswer,
  onSkip,
}: {
  clar: Clarification;
  onAnswer: (c: Clarification, answer: string) => Promise<void>;
  onSkip: (c: Clarification) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    await onAnswer(clar, text.trim()).finally(() => setBusy(false));
    setText("");
  }

  return (
    <div
      className="mt-2 rounded-2xl border p-3.5"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-elev)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="text-[12px] mb-2 leading-5 flex items-start gap-1.5">
        <HelpCircle size={13} style={{ color: "var(--accent)" }} className="mt-0.5 shrink-0" />
        <span>{clar.question}</span>
      </div>
      <div className="flex items-end gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Your answer…"
          className="flex-1 h-8 px-2.5 rounded-md border bg-transparent text-[12.5px] outline-none focus:border-strong"
          style={{ borderColor: "var(--border-strong)" }}
        />
        <button
          onClick={submit}
          disabled={busy || !text.trim()}
          className="h-8 px-2.5 rounded-md text-[11.5px] font-medium flex items-center gap-1 disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          Answer
        </button>
        <button
          onClick={() => onSkip(clar)}
          className="h-8 px-2 rounded-md text-[11.5px] border"
          style={{ borderColor: "var(--border-strong)", color: "var(--text-muted)" }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
