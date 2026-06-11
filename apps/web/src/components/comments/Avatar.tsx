"use client";

import { Star } from "lucide-react";

export function Avatar({ name, superfan }: { name: string; superfan?: boolean }) {
  const letter = (name || "?").replace(/^@/, "").charAt(0).toUpperCase() || "?";
  return (
    <div className="relative shrink-0">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[12.5px] font-bold"
        style={{
          background: "var(--bg-inset)",
          color: "var(--text-muted)",
          border: "1px solid var(--border)",
        }}
      >
        {letter}
      </div>
      {superfan && (
        <div
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
          style={{ background: "var(--accent)" }}
        >
          <Star size={7} fill="var(--accent-fg)" style={{ color: "var(--accent-fg)" }} />
        </div>
      )}
    </div>
  );
}
