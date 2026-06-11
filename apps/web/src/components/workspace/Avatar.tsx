"use client";

import { tintFor } from "./utils";

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const tint = tintFor(name || "?");
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `color-mix(in srgb, ${tint} 20%, var(--bg-elev))`,
        color: tint,
      }}
    >
      {(name || "?").replace(/^@/, "").slice(0, 1).toUpperCase()}
    </div>
  );
}
