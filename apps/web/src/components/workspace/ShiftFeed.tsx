"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Pencil } from "lucide-react";
import { MiraFeed } from "../MiraFeed";
import { SPRING, ago, stripTags } from "./utils";
import type { Row, PostInfoT } from "./types";

function ShiftReplyLine({ c }: { c: Row }) {
  if (c.status === "replied" && c.ownReply) {
    return (
      <div className="flex items-start gap-1 mt-0.5">
        <Sparkles
          size={10}
          className="mt-[3px] shrink-0"
          style={{ color: "var(--accent)" }}
        />
        <span
          className="text-[11.5px] line-clamp-2 leading-snug font-medium"
          style={{ color: "var(--accent-deep)" }}
        >
          {c.ownReply.text}
        </span>
      </div>
    );
  }
  if (c.status === "pending" && c.draftText) {
    return (
      <div className="flex items-start gap-1 mt-0.5">
        <Pencil
          size={10}
          className="mt-[3px] shrink-0"
          style={{ color: "var(--text-muted)" }}
        />
        <span
          className="text-[11.5px] line-clamp-2 leading-snug"
          style={{ color: "var(--text-muted)" }}
        >
          {c.draftText}{" "}
          <span className="opacity-60 font-semibold">· draft</span>
        </span>
      </div>
    );
  }
  if (c.status === "needs_info") {
    return (
      <div
        className="text-[11px] mt-1 font-semibold"
        style={{ color: "var(--accent-deep)" }}
      >
        Mira needs your input
      </div>
    );
  }
  if (c.status === "skipped") {
    return (
      <div className="text-[11px] mt-1" style={{ color: "var(--text-subtle)" }}>
        skipped{c.skipReason ? ` · ${c.skipReason}` : ""}
      </div>
    );
  }
  // status "none" — not yet concluded. Recent → the watcher will get to it;
  // older than the catch-up window → pre-existing backlog, left alone.
  const recent = Date.now() - c.ts < 48 * 60 * 60 * 1000;
  return (
    <div className="text-[11px] mt-1" style={{ color: "var(--text-subtle)" }}>
      {recent ? "queued…" : "— backlog (not auto-replied)"}
    </div>
  );
}

export function ShiftFeed({
  comments,
  postInfo,
  names,
}: {
  comments: Row[];
  postInfo: (id?: string) => PostInfoT | undefined;
  names: Record<string, string>;
}) {
  const feed = comments
    .slice()
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 150);
  return (
    <div
      className="w-[300px] shrink-0 border-l flex flex-col"
      style={{ borderColor: "var(--border)", background: "var(--bg-sidebar)" }}
    >
      <div className="flex items-center gap-2 px-5 pt-5 pb-3">
        <span className="glow-dot" />
        <h2 className="text-[14px] font-bold">Mira&apos;s shift</h2>
        <span
          className="ml-auto text-[10px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: "var(--accent)" }}
        >
          live
        </span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-4 space-y-1">
        {feed.length === 0 && (
          <div
            className="text-[12px] text-center py-10"
            style={{ color: "var(--text-subtle)" }}
          >
            No comments yet.
          </div>
        )}
        <AnimatePresence initial={false}>
          {feed.map((c) => {
            const uname =
              c.fromUsername || names[c.fromUserId] || c.fromUserId.slice(0, 8);
            const cap = postInfo(c.postId)?.caption || "";
            return (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={SPRING}
                className="rounded-xl p-2.5"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "var(--accent)" }}
                  />
                  <span className="text-[12px] font-bold truncate">@{uname}</span>
                  <span
                    className="ml-auto text-[9.5px] shrink-0"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    {ago(c.ts)}
                  </span>
                </div>
                {cap && (
                  <div
                    className="text-[10px] mt-0.5 truncate"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    on "{stripTags(cap).slice(0, 28) || "post"}"
                  </div>
                )}
                <div
                  className="text-[11.5px] mt-1 line-clamp-2 italic"
                  style={{ color: "var(--text-muted)" }}
                >
                  "{c.text}"
                </div>
                <ShiftReplyLine c={c} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {/* Mira live activity feed */}
      <div className="px-3 pb-4 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
        <MiraFeed />
      </div>
    </div>
  );
}
