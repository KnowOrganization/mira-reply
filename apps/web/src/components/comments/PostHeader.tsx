"use client";

import { ExternalLink, Image as ImageIcon, Link2 } from "lucide-react";

export function PostHeader({
  caption,
  thumb,
  permalink,
  count,
  linksOpen,
  onToggleLinks,
}: {
  caption: string;
  thumb?: string;
  permalink?: string;
  count: number;
  linksOpen?: boolean;
  onToggleLinks?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3.5">
      <div
        className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative"
        style={{ background: "var(--bg-inset)" }}
      >
        <ImageIcon
          size={16}
          className="absolute inset-0 m-auto"
          style={{ color: "var(--text-subtle)" }}
        />
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[12.5px] font-bold leading-snug"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            letterSpacing: "-0.01em",
          }}
        >
          {caption || "Untitled post"}
        </div>
        <div
          className="text-[10.5px] font-semibold uppercase tracking-[0.06em] mt-1"
          style={{ color: "var(--text-subtle)" }}
        >
          {count} comment{count === 1 ? "" : "s"}
        </div>
      </div>
      {onToggleLinks && (
        <button
          onClick={onToggleLinks}
          className="h-7 px-2.5 rounded-lg flex items-center gap-1 text-[11px] font-semibold transition shrink-0"
          style={{
            background: linksOpen ? "var(--accent)" : "var(--bg-inset)",
            color: linksOpen ? "var(--accent-fg)" : "var(--text-muted)",
          }}
        >
          <Link2 size={11} /> Links
        </button>
      )}
      {permalink && (
        <a
          href={permalink}
          target="_blank"
          rel="noreferrer"
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 hover:bg-black/[0.04] transition"
          style={{ color: "var(--text-subtle)" }}
        >
          <ExternalLink size={13} />
        </a>
      )}
    </div>
  );
}
