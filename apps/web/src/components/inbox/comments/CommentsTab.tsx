"use client";

import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { AlertTriangle, MessageCircle, RefreshCw } from "lucide-react";
import { useComments } from "@/lib/api/hooks";
import { api } from "@/lib/api/client";
import { SkCommentCard, SkRepeat } from "@/components/skeleton";
import type { CommentRow } from "./types";
import { COMMENT_FILTERS } from "./constants";
import { CommentCard } from "./CommentCard";

export function CommentsTab() {
  const [filter, setFilter] = useState<(typeof COMMENT_FILTERS)[number]["id"]>("all");
  const list = useComments<{ rows: CommentRow[]; count: number }>();
  const qc = useQueryClient();
  // live sync pulls from Instagram (reconcile), then re-reads the cache
  const sync = useMutation({
    mutationFn: () => api.get("/api/ig/comments?refresh=1"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ig", "comments"] }),
  });

  const rows = list.data?.rows ?? [];
  const filtered = rows.filter((c) => {
    if (filter === "open") return !c.isOwn && (c.status === "none" || c.status === "pending" || c.status === "needs_info");
    if (filter === "replied") return c.status === "replied";
    if (filter === "skipped") return c.status === "skipped";
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-[680px] mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1">
            {COMMENT_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="px-2 py-1 rounded-md text-[11px] font-semibold capitalize"
                style={{
                  background: filter === f.id ? "var(--accent-soft)" : "transparent",
                  color: filter === f.id ? "var(--accent)" : "var(--text-muted)",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-50"
            style={{ background: "var(--bg-elev)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
          >
            <RefreshCw size={11} className={sync.isPending ? "animate-spin" : ""} />
            {sync.isPending ? "Syncing…" : "Sync from Instagram"}
          </button>
        </div>

        {list.isLoading && (
          <div className="flex flex-col gap-2.5">
            <SkRepeat n={5}>{(i) => <SkCommentCard key={i} i={i} />}</SkRepeat>
          </div>
        )}
        {list.isError && (
          <div className="p-8 text-center text-xs flex flex-col items-center gap-2" style={{ color: "#ef4444" }}>
            <AlertTriangle size={16} /> Failed to load. <button className="underline" onClick={() => list.refetch()}>Retry</button>
          </div>
        )}
        {!list.isLoading && !list.isError && filtered.length === 0 && (
          <div className="p-10 text-center text-xs flex flex-col items-center gap-2" style={{ color: "var(--text-subtle)" }}>
            <MessageCircle size={18} style={{ opacity: 0.4 }} />
            {rows.length === 0
              ? "No comments yet. New comments on your posts land here — try Sync from Instagram."
              : "Nothing in this filter."}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {filtered.map((c) => <CommentCard key={c.id} c={c} />)}
        </div>
      </div>
    </div>
  );
}
