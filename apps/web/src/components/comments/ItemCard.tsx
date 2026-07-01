"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import type { Item, PendingDraft, Clarification } from "./types";
import { Avatar } from "./Avatar";
import { ClarBox } from "./ClarBox";
import { DraftBox } from "./DraftBox";
import { ReplyBubble } from "./ReplyBubble";
import { Chip, StateChip } from "./SmallParts";
import { timeAgo } from "./utils";

export function ItemCard({
  item,
  onApprove,
  onReject,
  onAnswer,
  onSkip,
  onReprocess,
}: {
  item: Item;
  onApprove: (d: PendingDraft, text: string) => Promise<void>;
  onReject: (d: PendingDraft) => Promise<void>;
  onAnswer: (c: Clarification, answer: string) => Promise<void>;
  onSkip: (c: Clarification) => Promise<void>;
  onReprocess: (commentId: string) => Promise<void>;
}) {
  const [reprocessing, setReprocessing] = useState(false);
  const showState = item.state === "needs_you" || item.state === "draft";

  return (
    <div className="px-3.5 py-3 flex gap-2.5">
      <Avatar name={item.fromUsername || item.fromUserId} superfan={item.isSuperfan} />
      <div className="flex-1 min-w-0">
        {/* meta */}
        <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
          <span className="font-bold" style={{ color: "var(--text)" }}>
            {item.fromUsername || item.fromUserId.slice(0, 10)}
          </span>
          <span style={{ color: "var(--text-subtle)" }}>· {timeAgo(item.ts)}</span>
          {item.intent && <Chip>{item.intent.replace(/_/g, " ")}</Chip>}
          {showState && <StateChip state={item.state} />}
        </div>

        {/* comment text */}
        <div className="text-[13px] leading-[1.5] mt-0.5 break-words">{item.text}</div>

        {/* action zone */}
        {item.state === "needs_you" && item.clar && (
          <ClarBox clar={item.clar} onAnswer={onAnswer} onSkip={onSkip} />
        )}
        {item.state === "draft" && item.draft && (
          <DraftBox draft={item.draft} onApprove={onApprove} onReject={onReject} />
        )}
        {item.state === "replied" && item.ownReply && (
          <ReplyBubble text={item.ownReply.text} />
        )}
        {item.state === "open" && item.commentId && (
          <button
            onClick={async () => {
              if (reprocessing) return;
              setReprocessing(true);
              try { await onReprocess(item.commentId!); } finally { setReprocessing(false); }
            }}
            disabled={reprocessing}
            className="mt-2 h-7 px-3 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5 transition hover:opacity-80"
            style={{ background: "var(--bg-inset)", color: "var(--text-muted)", opacity: reprocessing ? 0.6 : 1, cursor: reprocessing ? "default" : "pointer" }}
          >
            {reprocessing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            {reprocessing ? "Working…" : "Reply with Mira"}
          </button>
        )}
      </div>
    </div>
  );
}
