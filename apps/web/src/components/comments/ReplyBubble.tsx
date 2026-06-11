"use client";

import { CornerDownRight, Sparkles } from "lucide-react";

export function ReplyBubble({ text }: { text: string }) {
  return (
    <div className="mt-2 flex items-start gap-1.5">
      <CornerDownRight
        size={13}
        className="mt-1.5 shrink-0"
        style={{ color: "var(--text-subtle)" }}
      />
      <div
        className="rounded-2xl rounded-tl-md px-3 py-2 min-w-0"
        style={{ background: "var(--bg-inset)" }}
      >
        <div
          className="text-[9px] font-bold uppercase tracking-[0.09em] flex items-center gap-1"
          style={{ color: "var(--text-subtle)" }}
        >
          <Sparkles size={8} /> Mira replied
        </div>
        <div className="text-[12.5px] leading-snug mt-0.5 break-words">{text}</div>
      </div>
    </div>
  );
}
