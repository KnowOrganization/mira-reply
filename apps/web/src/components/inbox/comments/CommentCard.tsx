"use client";

import { useState } from "react";
import { Sparkles, Star, Check, X, CornerDownRight } from "lucide-react";
import { useReplyToComment, useDraftAction } from "@/lib/api/hooks";
import { fmtAgo } from "../utils";
import type { CommentRow } from "./types";
import { STATUS_BADGE } from "./constants";

export function CommentCard({ c }: { c: CommentRow }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [text, setText] = useState("");
  const reply = useReplyToComment();
  const draftAction = useDraftAction();
  const badge = STATUS_BADGE[c.status];

  const doReply = async () => {
    if (!text.trim() || reply.isPending) return;
    try {
      await reply.mutateAsync({ id: c.id, text: text.trim() });
      setText("");
      setReplyOpen(false);
    } catch { /* surfaced below */ }
  };

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

      {/* manual reply */}
      {!c.isOwn && (
        <div className="mt-2">
          {!replyOpen ? (
            <button
              onClick={() => setReplyOpen(true)}
              className="text-[10.5px] font-semibold"
              style={{ color: "var(--accent)" }}
            >
              Reply…
            </button>
          ) : (
            <div className="flex flex-col gap-1.5">
              {reply.isError && (
                <div className="text-[10px]" style={{ color: "#ef4444" }}>
                  {(reply.error as Error)?.message || "Reply failed"}
                </div>
              )}
              <div className="flex gap-1.5">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doReply()}
                  autoFocus
                  placeholder={`Reply to @${c.fromUsername || "user"}…`}
                  className="flex-1 rounded-lg px-2.5 py-1.5 text-[12px] outline-none"
                  style={{ background: "var(--bg-elev)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
                <button
                  onClick={doReply}
                  disabled={!text.trim() || reply.isPending}
                  className="rounded-lg px-3 text-[11px] font-semibold disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {reply.isPending ? "…" : "Send"}
                </button>
                <button onClick={() => setReplyOpen(false)} className="text-[10.5px]" style={{ color: "var(--text-subtle)" }}>
                  cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
