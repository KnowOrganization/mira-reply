"use client";

import { Trash2 } from "lucide-react";
import { TOPIC } from "./constants";
import type { Fact } from "./types";

export function NodeDetail({
  fact,
  onDelete,
  onClose,
}: {
  fact: Fact;
  onDelete: () => void;
  onClose: () => void;
}) {
  const t = TOPIC[fact.topic];
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide"
          style={{
            background: `color-mix(in srgb, ${t?.color} 18%, transparent)`,
            color: t?.color,
          }}
        >
          {t?.label || fact.topic}
        </span>
        <span className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
          used {fact.hitCount}× in replies
        </span>
        <button
          onClick={onClose}
          className="ml-auto text-[11px] font-semibold"
          style={{ color: "var(--text-muted)" }}
        >
          close
        </button>
      </div>
      <div
        className="text-[11.5px] font-semibold"
        style={{ color: "var(--text-subtle)" }}
      >
        {fact.question}
      </div>
      <div className="text-[14px] mt-0.5">{fact.answer}</div>
      <button
        onClick={onDelete}
        className="mt-3 h-8 px-3 rounded-lg text-[11.5px] font-semibold flex items-center gap-1.5"
        style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
      >
        <Trash2 size={12} /> Remove
      </button>
    </div>
  );
}
