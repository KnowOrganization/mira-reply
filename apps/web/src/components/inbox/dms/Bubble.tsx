"use client";

import { CheckCheck } from "lucide-react";
import type { CrmMessage } from "@/lib/api/hooks";
import { fmtAgo } from "../utils";

export function Bubble({ m }: { m: CrmMessage }) {
  const mine = m.direction === "out";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} px-4 py-1`}>
      <div
        className="max-w-[70%] rounded-2xl px-3.5 py-2 text-[13px] leading-[1.45]"
        style={{
          background: mine ? "var(--accent)" : "var(--bg-elev)",
          color: mine ? "#fff" : "var(--text)",
          border: mine ? "none" : "1px solid var(--border)",
        }}
      >
        {m.body?.text || <span style={{ opacity: 0.6 }}>[{m.type}]</span>}
        <div className="text-[10px] mt-1 flex items-center gap-1" style={{ opacity: 0.65 }}>
          {mine ? (m.sent_by === "human" ? "you" : "mira") + " · " : ""}{fmtAgo(m.created_at)}
          {mine && m.seen_at && <CheckCheck size={10} style={{ color: "#7dd3fc" }} />}
        </div>
      </div>
    </div>
  );
}
