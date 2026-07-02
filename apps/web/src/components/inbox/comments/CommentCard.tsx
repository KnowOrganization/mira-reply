"use client";

import { useState } from "react";
import { Sparkles, Star, Check, X, CornerDownRight, Send } from "lucide-react";
import { useDraftAction, useGenerateCommentReply, useReplyToComment } from "@/lib/api/hooks";
import { fmtAgo } from "../utils";
import type { CommentRow } from "./types";
import { STATUS_BADGE } from "./constants";

export function CommentCard({ c }: { c: CommentRow }) {
  const draftAction = useDraftAction();
  const generate = useGenerateCommentReply();
  const sendReply = useReplyToComment();
  // Mira's on-demand suggestion (distinct from a pipeline-parked draft)
  const [suggested, setSuggested] = useState<string | null>(null);
  const badge = STATUS_BADGE[c.status];

  return (
    <div className="card rounded-xl p-3.5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
          {(c.fromUsername || "??").slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[12.5px] font-semibold truncate" style={{ color: "var(--text)" }}>
              {c.fromUsername || c.fromUserId}
            </span>
            {c.isOwn && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-elev)", color: "var(--text-subtle)", border: "1px solid var(--border)" }}>you</span>
            )}
            {c.isSuperfan && <Star size={10} style={{ color: "#f59e0b" }} />}
            <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>{fmtAgo(c.ts)}</span>
          </div>
          {c.postCaption && (
            <div className="text-[9.5px] truncate" style={{ color: "var(--text-subtle)" }}>
              on “{c.postCaption.slice(0, 48)}”
            </div>
          )}
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0"
          style={{ background: `${badge.color}1e`, color: badge.color }}>
          {badge.label}
        </span>
      </div>

      <div className="text-[12.5px] mt-2 leading-[1.5]" style={{ color: "var(--text)" }}>{c.text}</div>
      {c.status === "skipped" && c.skipReason && (
        <div className="text-[10px] mt-1" style={{ color: "var(--text-subtle)" }}>skip reason: {c.skipReason}</div>
      )}

      {c.ownReply && (
        <div className="flex items-start gap-1.5 mt-2 pl-2 py-1.5 rounded-lg" style={{ background: "var(--bg-elev)" }}>
          <CornerDownRight size={11} style={{ color: "var(--text-subtle)", marginTop: 2 }} />
          <div>
            <div className="text-[11.5px]" style={{ color: "var(--text-muted)" }}>{c.ownReply.text}</div>
            <div className="text-[9px] mt-0.5" style={{ color: "var(--text-subtle)" }}>your reply · {fmtAgo(c.ownReply.ts)}</div>
          </div>
        </div>
      )}

      {/* On-demand Mira suggestion — generate → review/edit → send */}
      {!c.isOwn && !c.ownReply && !(c.status === "pending" && c.draftText) && (
        suggested == null ? (
          <button
            onClick={() =>
              generate.mutate(c.id, { onSuccess: (d) => setSuggested(d.reply) })
            }
            disabled={generate.isPending}
            className="mt-2 px-2.5 py-1 rounded-md text-[10.5px] font-semibold flex items-center gap-1 disabled:opacity-40"
            style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--border)" }}
          >
            <Sparkles size={10} /> {generate.isPending ? "Generating…" : "Generate reply"}
          </button>
        ) : (
          <div className="mt-2 rounded-lg p-2.5" style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}>
            <div className="text-[10px] font-bold flex items-center gap-1 mb-1" style={{ color: "var(--accent)" }}>
              <Sparkles size={9} /> Mira suggests
            </div>
            <textarea
              value={suggested}
              onChange={(e) => setSuggested(e.target.value)}
              rows={2}
              className="w-full text-[12px] rounded-md p-1.5 resize-none"
              style={{ background: "var(--bg-elev)", color: "var(--text)", border: "1px solid var(--border)" }}
            />
            <div className="flex gap-1.5 mt-1.5">
              <button
                onClick={() =>
                  sendReply.mutate({ id: c.id, text: suggested }, { onSuccess: () => setSuggested(null) })
                }
                disabled={sendReply.isPending || !suggested.trim()}
                className="px-2.5 py-1 rounded-md text-[10.5px] font-semibold flex items-center gap-1 disabled:opacity-40"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                <Send size={10} /> {sendReply.isPending ? "Sending…" : "Send reply"}
              </button>
              <button
                onClick={() => setSuggested(null)}
                className="px-2.5 py-1 rounded-md text-[10.5px] font-semibold"
                style={{ background: "var(--bg-elev)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
              >
                Discard
              </button>
            </div>
          </div>
        )
      )}
      {generate.isError && (
        <div className="text-[10px] mt-1" style={{ color: "#ef4444" }}>
          {(generate.error as Error)?.message || "Generation failed"}
        </div>
      )}

      {/* Mira's pending draft → approve / reject */}
      {c.status === "pending" && c.draftText && c.draftId && (
        <div className="mt-2 rounded-lg p-2.5" style={{ background: "rgba(0,149,246,0.07)", border: "1px solid rgba(0,149,246,0.25)" }}>
          <div className="text-[10px] font-bold flex items-center gap-1 mb-1" style={{ color: "var(--accent)" }}>
            <Sparkles size={9} /> Mira&apos;s draft
          </div>
          <div className="text-[12px]" style={{ color: "var(--text)" }}>{c.draftText}</div>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => draftAction.mutate({ id: c.draftId!, body: { action: "approve" } })}
              disabled={draftAction.isPending}
              className="px-2.5 py-1 rounded-md text-[10.5px] font-semibold flex items-center gap-1 disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              <Check size={10} /> Approve &amp; send
            </button>
            <button
              onClick={() => draftAction.mutate({ id: c.draftId!, body: { action: "reject" } })}
              disabled={draftAction.isPending}
              className="px-2.5 py-1 rounded-md text-[10.5px] font-semibold flex items-center gap-1 disabled:opacity-40"
              style={{ background: "var(--bg-elev)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              <X size={10} /> Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
