"use client";
// Inbox (spec Phase 1): unified inbox — DMs (thread list, window-aware composer,
// assign/notes/tags), Comments (cached comments + draft approval + manual reply),
// Mentions (tags/caption/comment mentions with read state). Tab state syncs with
// the sidebar sub-nav. Every list state: loading / empty / error.
import { useEffect, useState } from "react";
import { TABS, type InboxTab } from "./inbox/constants";
import { DmsTab } from "./inbox/dms/DmsTab";
import { CommentsTab } from "./inbox/comments/CommentsTab";
import { MentionsTab } from "./inbox/mentions/MentionsTab";

export function InboxView({ tab, onTabChange }: { tab?: string; onTabChange?: (t: string) => void } = {}) {
  const active: InboxTab = tab === "comments" || tab === "mentions" ? tab : "dms";
  const [local, setLocal] = useState<InboxTab>(active);
  // sidebar sub-nav drives the tab; clicking the in-view strip reports back up
  useEffect(() => setLocal(active), [active]);
  const switchTab = (t: InboxTab) => { setLocal(t); onTabChange?.(t); };

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "var(--bg-frame)" }}>
      {/* ── tab strip ── */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold flex items-center gap-1.5"
            style={{
              background: local === t.id ? "var(--accent-soft)" : "transparent",
              color: local === t.id ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {local === "dms" && <DmsTab />}
      {local === "comments" && <CommentsTab />}
      {local === "mentions" && <MentionsTab />}
    </div>
  );
}
