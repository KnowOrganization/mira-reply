"use client";

import { AtSign, ExternalLink } from "lucide-react";
import { fmtAgo } from "../utils";
import { type MentionRow, KIND_LABEL } from "./types";

export function MentionCard({ m, onMarkRead }: { m: MentionRow; onMarkRead: (id: string) => void }) {
  const kind = KIND_LABEL[m.kind] ?? KIND_LABEL.tag;
  return (
    <div className="card rounded-xl p-3.5 flex gap-3" style={{ opacity: m.read ? 0.65 : 1 }}>
      {m.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" style={{ border: "1px solid var(--border)" }} />
      ) : (
        <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
          <AtSign size={14} style={{ color: "var(--text-subtle)" }} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase" style={{ background: `${kind.color}1e`, color: kind.color }}>
            {kind.label}
          </span>
          {m.fromUsername && (
            <span className="text-[11.5px] font-semibold" style={{ color: "var(--text)" }}>@{m.fromUsername}</span>
          )}
          <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>{fmtAgo(m.ts)}</span>
        </div>
        <div className="text-[11.5px] mt-1 truncate" style={{ color: "var(--text-muted)" }}>
          {m.commentText || m.mediaCaption || m.mediaType || "—"}
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          {m.permalink && (
            <a
              href={m.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10.5px] font-semibold flex items-center gap-1"
              style={{ color: "var(--accent)" }}
            >
              <ExternalLink size={9} /> Open on Instagram
            </a>
          )}
          {!m.read && (
            <button
              onClick={() => onMarkRead(m.id)}
              className="text-[10.5px] font-semibold"
              style={{ color: "var(--text-subtle)" }}
            >
              Mark read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
