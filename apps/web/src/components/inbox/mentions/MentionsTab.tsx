"use client";

import { useQueryClient, useMutation } from "@tanstack/react-query";
import { AtSign, AlertTriangle, RefreshCw } from "lucide-react";
import { useMentions, useRefreshMentions, useMarkMentionRead } from "@/lib/api/hooks";
import { api } from "@/lib/api/client";
import { SkMentionRow, SkRepeat } from "@/components/skeleton";
import type { MentionRow } from "./types";
import { MentionCard } from "./MentionCard";

export function MentionsTab() {
  const list = useMentions<{ mentions: MentionRow[] }>();
  const refresh = useRefreshMentions();
  const markRead = useMarkMentionRead();
  const qc = useQueryClient();
  const markAll = useMutation({
    mutationFn: () => api.patch("/api/ig/mentions", { all: true, read: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ig", "mentions"] }),
  });

  const mentions = list.data?.mentions ?? [];
  const unread = mentions.filter((m) => !m.read).length;

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-[680px] mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
            {unread > 0 ? <><b style={{ color: "var(--text)" }}>{unread}</b> unread</> : "All caught up"}
          </div>
          <div className="flex gap-1.5">
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-50"
                style={{ background: "var(--bg-elev)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
              >
                Mark all read
              </button>
            )}
            <button
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: "var(--bg-elev)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              <RefreshCw size={11} className={refresh.isPending ? "animate-spin" : ""} />
              {refresh.isPending ? "Checking…" : "Check for new"}
            </button>
          </div>
        </div>

        {list.isLoading && (
          <div className="flex flex-col gap-2.5">
            <SkRepeat n={5}>{(i) => <SkMentionRow key={i} i={i} />}</SkRepeat>
          </div>
        )}
        {list.isError && (
          <div className="p-8 text-center text-xs flex flex-col items-center gap-2" style={{ color: "#ef4444" }}>
            <AlertTriangle size={16} /> Failed to load. <button className="underline" onClick={() => list.refetch()}>Retry</button>
          </div>
        )}
        {!list.isLoading && !list.isError && mentions.length === 0 && (
          <div className="p-10 text-center text-xs flex flex-col items-center gap-2" style={{ color: "var(--text-subtle)" }}>
            <AtSign size={18} style={{ opacity: 0.4 }} />
            No mentions yet. When someone tags or @-mentions you, it lands here.
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {mentions.map((m) => (
            <MentionCard key={m.id} m={m} onMarkRead={(id) => markRead.mutate(id)} />
          ))}
        </div>
      </div>
    </div>
  );
}
