"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Pause, Play, Plug, RefreshCw, Unplug, AlertTriangle } from "lucide-react";
import {
  useDraftAction,
  useClarificationAction,
  useSetMode,
  useReprocess,
  useDisconnect,
  useWatcherAction,
} from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

import { MODES } from "./comments/types";
import type { Tab, PendingDraft, Clarification, ReplyMode } from "./comments/types";
import { useCommentsData } from "./comments/useCommentsData";
import { useItemList } from "./comments/useItemList";
import { ItemCard } from "./comments/ItemCard";
import { PostHeader } from "./comments/PostHeader";
import { PostLinksPanel } from "./comments/PostLinksPanel";
import { DigestBanner } from "./comments/DigestBanner";
import { LiveFeedRail } from "./comments/LiveFeedRail";
import { IconBtn, Center } from "./comments/SmallParts";

// ── master Comments page ─────────────────────────────────────────────────
export function Comments() {
  const [tab, setTab] = useState<Tab>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [linksOpen, setLinksOpen] = useState<Set<string>>(new Set());

  const {
    status,
    rows,
    pending,
    clars,
    digest,
    watching,
    liveError,
    loading,
    feed,
    search,
    setSearch,
    searchRef,
    reloadCache,
    refreshLive,
  } = useCommentsData();

  const { items, counts, filtered, postGroups } = useItemList(rows, pending, clars, tab, search);

  // ── actions ──
  const draftAction = useDraftAction();
  const clarAction = useClarificationAction();
  const setModeMut = useSetMode();
  const reprocessMut = useReprocess();
  const disconnectMut = useDisconnect();
  const watcherAction = useWatcherAction();

  async function approve(d: PendingDraft, text: string) {
    await draftAction.mutateAsync({ id: d.id, body: { action: "approve", text } });
    toast.success("Reply sent.");
    reloadCache();
  }
  async function reject(d: PendingDraft) {
    await draftAction.mutateAsync({ id: d.id, body: { action: "reject" } });
    reloadCache();
  }
  async function answerClar(c: Clarification, answer: string) {
    await clarAction.mutateAsync({ id: c.id, body: { action: "answer", answer } });
    toast.success("Answered. Mira is drafting…");
    reloadCache();
    setTimeout(reloadCache, 1800);
  }
  async function skipClar(c: Clarification) {
    await clarAction.mutateAsync({ id: c.id, body: { action: "skip" } });
    reloadCache();
  }
  async function setMode(mode: ReplyMode) {
    await setModeMut.mutateAsync(mode);
    toast.success(`Mode: ${mode}`);
  }
  async function toggleWatcher() {
    const r = await watcherAction.mutateAsync(watching ? "stop" : "start");
    toast(`Watcher ${r.running ? "running" : "paused"}`);
  }
  async function disconnect() {
    if (!confirm("Disconnect Instagram?")) return;
    await disconnectMut.mutateAsync();
    toast("Disconnected.");
  }
  async function reprocess(commentId: string) {
    await reprocessMut.mutateAsync(commentId);
    toast.success("Mira is on it…");
    setTimeout(reloadCache, 2500);
    setTimeout(reloadCache, 6000);
  }

  const connected = status?.connected;

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--bg)" }}>
      {/* top bar */}
      <div className="h-12 border-b flex items-center px-4 gap-3 shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="text-sm font-medium tracking-tight">Comments</div>
        {watching && (
          <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
            <span className="glow-dot" /> Live
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {connected ? (
            <>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                @{status?.account?.username}
              </span>
              <IconBtn onClick={toggleWatcher} title={watching ? "Pause watcher" : "Resume watcher"}>
                {watching ? <Pause size={12} /> : <Play size={12} />}
              </IconBtn>
              <IconBtn onClick={() => refreshLive()} disabled={loading} title="Refresh">
                {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              </IconBtn>
              <IconBtn onClick={disconnect} title="Disconnect">
                <Unplug size={12} />
              </IconBtn>
            </>
          ) : (
            <a
              href="/api/ig/connect"
              className="text-xs h-7 px-3 rounded-md flex items-center gap-1.5"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              <Plug size={12} /> Connect Instagram
            </a>
          )}
        </div>
      </div>

      {status && !status.configured && (
        <div
          className="px-4 py-2.5 text-xs border-b shrink-0"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg-elev)" }}
        >
          ⚠ Meta app not configured. Set credentials in <code className="font-mono">.env.local</code>.
        </div>
      )}

      {liveError && (
        <div
          className="px-4 py-2 text-[11.5px] border-b shrink-0 flex items-center gap-2"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, #b3402e 11%, transparent)", color: "#9a3525" }}
        >
          <AlertTriangle size={13} className="shrink-0" />
          <span>
            Instagram fetch failed — showing cached data. Reconnect via Settings if this persists.{" "}
            <span style={{ opacity: 0.7 }}>{liveError.slice(0, 120)}</span>
          </span>
        </div>
      )}

      {/* mode bar */}
      {connected && (
        <div className="px-4 py-2.5 border-b flex items-center gap-2 text-xs shrink-0" style={{ borderColor: "var(--border)" }}>
          <span style={{ color: "var(--text-subtle)" }}>Mode</span>
          {MODES.map((m) => (
            <motion.button
              key={m.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setMode(m.id)}
              title={m.hint}
              className={cn(
                "h-7 px-2.5 rounded-md border transition",
                status?.replyMode === m.id
                  ? "bg-black/[0.06] dark:bg-white/[0.08]"
                  : "hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
              )}
              style={{
                borderColor: "var(--border-strong)",
                color: status?.replyMode === m.id ? "var(--text)" : "var(--text-muted)",
              }}
            >
              {m.id}
            </motion.button>
          ))}
        </div>
      )}

      {/* filter bar */}
      <div className="px-4 py-2.5 border-b flex items-center gap-2 flex-wrap text-xs shrink-0" style={{ borderColor: "var(--border)" }}>
        {(
          [
            ["all", "All"],
            ["needs_you", "Needs you"],
            ["draft", "Drafts"],
            ["replied", "Replied"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "h-7 px-2.5 rounded-md border transition flex items-center gap-1.5",
              tab === k ? "bg-black/[0.06] dark:bg-white/[0.08]" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
            )}
            style={{
              borderColor: k === "needs_you" && counts.needs_you > 0 ? "var(--accent)" : "var(--border-strong)",
              color: tab === k ? "var(--text)" : "var(--text-muted)",
            }}
          >
            <span>{label}</span>
            <span
              className="text-[10px] px-1 rounded"
              style={{
                background: k === "needs_you" && counts.needs_you > 0 ? "var(--accent-soft)" : "var(--bg-sidebar)",
                color: k === "needs_you" && counts.needs_you > 0 ? "var(--accent)" : "var(--text-subtle)",
              }}
            >
              {counts[k]}
            </span>
          </button>
        ))}
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…  ( / )"
          className="ml-auto h-7 px-2.5 rounded-md border bg-transparent text-xs outline-none focus:border-strong w-[180px]"
          style={{ borderColor: "var(--border-strong)" }}
        />
      </div>

      {/* body */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_320px] overflow-hidden">
        <div className="overflow-y-auto scrollbar-thin">
          {connected && <DigestBanner />}
          {!connected ? (
            <Center>Connect Instagram to start managing comments.</Center>
          ) : filtered.length === 0 ? (
            <Center>{loading ? "Loading…" : items.length === 0 ? "No comments yet." : "Nothing here."}</Center>
          ) : (
            <div className="px-5 py-5 gap-5 columns-1 md:columns-2 2xl:columns-3">
              {postGroups.map((g) => {
                const exp = expanded.has(g.postId);
                const shown = exp ? g.items : g.items.slice(0, 3);
                return (
                  <motion.div
                    key={g.postId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="break-inside-avoid mb-5 rounded-2xl overflow-hidden"
                    style={{
                      background: "var(--bg-elev)",
                      border: "1px solid var(--border)",
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    <PostHeader
                      caption={g.caption}
                      thumb={g.thumb}
                      permalink={g.permalink}
                      count={g.items.length}
                      linksOpen={linksOpen.has(g.postId)}
                      onToggleLinks={
                        g.postId === "_none"
                          ? undefined
                          : () =>
                              setLinksOpen((p) => {
                                const n = new Set(p);
                                if (n.has(g.postId)) n.delete(g.postId);
                                else n.add(g.postId);
                                return n;
                              })
                      }
                    />
                    {linksOpen.has(g.postId) && g.postId !== "_none" && (
                      <PostLinksPanel postId={g.postId} />
                    )}
                    {shown.map((item) => (
                      <div key={item.key} style={{ borderTop: "1px solid var(--border)" }}>
                        <ItemCard
                          item={item}
                          onApprove={approve}
                          onReject={reject}
                          onAnswer={answerClar}
                          onSkip={skipClar}
                          onReprocess={reprocess}
                        />
                      </div>
                    ))}
                    {g.items.length > 3 && (
                      <button
                        onClick={() =>
                          setExpanded((p) => {
                            const n = new Set(p);
                            if (n.has(g.postId)) n.delete(g.postId);
                            else n.add(g.postId);
                            return n;
                          })
                        }
                        className="w-full py-3 text-[12px] font-semibold transition hover:bg-black/[0.03]"
                        style={{
                          borderTop: "1px solid var(--border)",
                          background: "var(--bg-inset)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {exp ? "Show less ↑" : `View all ${g.items.length} comments ↓`}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <LiveFeedRail digest={digest} feed={feed} />
      </div>
    </div>
  );
}
