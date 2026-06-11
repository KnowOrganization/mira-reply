"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";
import type { Digest, FeedEntry } from "./types";
import { Stat } from "./SmallParts";
import { fmtTime } from "./utils";

export function LiveFeedRail({
  digest,
  feed,
}: {
  digest: Digest | null;
  feed: FeedEntry[];
}) {
  return (
    <aside
      className="border-l overflow-hidden flex flex-col"
      style={{ borderColor: "var(--border)", background: "var(--bg-sidebar)" }}
    >
      {digest && (
        <div
          className="grid grid-cols-2 gap-px border-b"
          style={{ borderColor: "var(--border)", background: "var(--border)" }}
        >
          <Stat label="Today" value={digest.inbox} sub="new" />
          <Stat label="Auto-replied" value={digest.repliedAuto} sub="sent" />
          <Stat label="Pending" value={digest.pending} sub="drafts" />
          <Stat
            label="Needs you"
            value={digest.needsInput}
            sub="open"
            accent={digest.needsInput > 0}
          />
        </div>
      )}
      <div
        className="px-4 py-2.5 border-b flex items-center gap-2 text-xs shrink-0"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
      >
        <Activity size={12} /> Live feed
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-1.5">
        {feed.length === 0 && (
          <div className="text-[11.5px]" style={{ color: "var(--text-subtle)" }}>
            Listening for new comments…
          </div>
        )}
        <AnimatePresence initial={false}>
          {feed.map((f) => (
            <motion.div
              key={f.id}
              layout
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-[11.5px] leading-5"
            >
              <span style={{ color: "var(--text-subtle)" }}>{fmtTime(f.ts)} </span>
              <span style={{ color: "var(--text)" }}>
                @{f.who} · &ldquo;{f.text.slice(0, 54)}&rdquo;
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </aside>
  );
}
