"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import {
  useComments,
  useDrafts,
  useClarifications,
  useDashboard,
  useStatus,
  useWatcher,
  usePosts,
  useMentions,
  useBrainStats,
  useSetMode,
  useSyncPosts,
  useRefreshMentions,
  useMarkMentionRead,
  type IgStatus,
} from "@/lib/api/hooks";

// ── sub-components ────────────────────────────────────────────────────────
import { TopStrip } from "./workspace/TopStrip";
import { BrainPanel } from "./workspace/BrainPanel";
import { LeftPane } from "./workspace/LeftPane";
import { Stage } from "./workspace/Stage";
import { PostStage } from "./workspace/PostStage";
import { MentionStage } from "./workspace/MentionStage";
import { ShiftFeed } from "./workspace/ShiftFeed";

// ── types (re-exported from sub-module) ───────────────────────────────────
import type {
  Draft,
  Clar,
  Row,
  Post,
  QItem,
  Mention,
  DashResp,
  BrainStats,
} from "./workspace/types";

export function Workspace() {
  const qc = useQueryClient();
  const [pane, setPane] = useState<"inbox" | "posts" | "mentions">("inbox");
  const [tab, setTab] = useState<"all" | "low" | "asks">("all");
  const [selId, setSelId] = useState<string | null>(null);
  const [selPost, setSelPost] = useState<string | null>(null);
  const [selMention, setSelMention] = useState<string | null>(null);
  const [brainOpen, setBrainOpen] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [, force] = useState(0);

  // ── reads — each was a leg of the old Promise.all; the watcher keeps these
  // caches fresh, and refetchInterval mirrors the previous 20s poll. ──
  const commentsQ = useComments<{ rows?: Row[] }>(false, { refetchInterval: 20_000 });
  const draftsQ = useDrafts<{ pending?: Draft[] }>({ refetchInterval: 20_000 });
  const clarsQ = useClarifications<{ open?: Clar[] }>({ refetchInterval: 20_000 });
  const dashQ = useDashboard<DashResp>({ refetchInterval: 20_000 });
  const statusQ = useStatus<IgStatus>({ refetchInterval: 20_000 });
  const watcherQ = useWatcher<{ startedAt?: number }>({ refetchInterval: 20_000 });
  const postsQ = usePosts<{ posts?: Post[] }>({ refetchInterval: 20_000 });
  const mentionsQ = useMentions<{ mentions?: Mention[] }>({ refetchInterval: 20_000 });
  const brainStatsQ = useBrainStats<BrainStats>({
    enabled: brainOpen,
    refetchInterval: brainOpen ? 3_000 : false,
  });

  const rows = useMemo<Row[]>(() => commentsQ.data?.rows ?? [], [commentsQ.data]);
  const drafts = useMemo<Draft[]>(
    () => (draftsQ.data?.pending ?? []).filter((d) => d.kind === "comment"),
    [draftsQ.data]
  );
  const clars = useMemo<Clar[]>(() => clarsQ.data?.open ?? [], [clarsQ.data]);
  const postList = useMemo<Post[]>(() => postsQ.data?.posts ?? [], [postsQ.data]);
  const mentions = useMemo<Mention[]>(() => mentionsQ.data?.mentions ?? [], [mentionsQ.data]);
  const brainStats: BrainStats = brainStatsQ.data ?? { stats: [], tools: [] };

  // post → {caption,thumb,permalink,comments} index + userId → username map,
  // both derived from comment rows + queue items (same logic as before).
  const { rowInfo, names } = useMemo(() => {
    const info: Record<string, { caption: string; thumb?: string; permalink?: string; comments: number }> = {};
    const nMap: Record<string, string> = {};
    for (const r of rows) {
      if (!info[r.postId])
        info[r.postId] = { caption: r.postCaption || "", thumb: r.postThumb, permalink: r.postPermalink, comments: 0 };
      info[r.postId].comments++;
      if (r.fromUsername) nMap[r.fromUserId] = r.fromUsername;
    }
    for (const d of drafts) if (d.fromUsername) nMap[d.fromUserId] = d.fromUsername;
    for (const c of clars) if (c.fromUsername) nMap[c.fromUserId] = c.fromUsername;
    return { rowInfo: info, names: nMap };
  }, [rows, drafts, clars]);

  const stats = useMemo(() => {
    const dash = dashQ.data;
    return {
      newToday: dash?.today?.comments ?? 0,
      autoSent: dash?.today?.autoReplied ?? 0,
      topTheme: dash?.knowledge?.top?.q || Object.keys(dash?.themes || {})[0] || null,
    };
  }, [dashQ.data]);

  const mode = statusQ.data?.replyMode || "balanced";
  const account = statusQ.data?.account?.username || "";
  const shiftStart = watcherQ.data?.startedAt ?? 0;

  // children call reload() after a write — refetch every workspace query
  const reload = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["ig"] });
  }, [qc]);

  // SSE-driven freshness (debounced) + a 30s tick to re-render relative times
  useEffect(() => {
    const tick = setInterval(() => force((n) => n + 1), 30_000);
    const es = new EventSource("/api/ig/stream");
    let deb: ReturnType<typeof setTimeout>;
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (["comment", "draft", "sent", "log"].includes(ev.type)) {
          clearTimeout(deb);
          deb = setTimeout(() => reload(), 200);
        }
      } catch {}
    };
    return () => {
      clearInterval(tick);
      es.close();
    };
  }, [reload]);

  // keep the OPEN post live — the watcher only sweeps older posts every few
  // ticks, so while a post detail is showing, poll THAT post's comments
  // directly. New comments + replies land without leaving the page.
  useEffect(() => {
    if (pane !== "posts" || !selPost) return;
    const iv = setInterval(async () => {
      try {
        await api.get(`/api/ig/posts/${selPost}/comments`);
        await reload();
      } catch {
        /* ignore — next tick retries */
      }
    }, 12_000);
    return () => clearInterval(iv);
  }, [pane, selPost, reload]);

  // post info — prefer the full post record, fall back to comment-row data
  const postInfo = useCallback(
    (id?: string) => {
      if (!id) return undefined;
      const p = postList.find((x) => x.id === id);
      const ri = rowInfo[id];
      if (!p && !ri) return undefined;
      return {
        caption: p?.caption || ri?.caption || "",
        thumb: p?.thumbnailUrl || ri?.thumb,
        permalink: p?.permalink || ri?.permalink,
        comments: ri?.comments ?? 0,
      };
    },
    [postList, rowInfo]
  );

  const queue = useMemo<QItem[]>(() => {
    const items: QItem[] = [
      ...drafts.map(
        (d): QItem => ({ type: "draft", id: d.id, at: d.createdAt, draft: d })
      ),
      ...clars.map(
        (c): QItem => ({ type: "clar", id: c.id, at: c.createdAt, clar: c })
      ),
    ];
    return items.sort((a, b) => b.at - a.at);
  }, [drafts, clars]);

  const filtered = useMemo(
    () =>
      queue.filter((q) =>
        tab === "all" ? true : tab === "low" ? q.type === "draft" : q.type === "clar"
      ),
    [queue, tab]
  );

  useEffect(() => {
    if (pane !== "inbox") return;
    if (filtered.length === 0) {
      if (selId !== null) setSelId(null);
    } else if (!filtered.some((q) => q.id === selId)) {
      setSelId(filtered[0].id);
    }
  }, [filtered, selId, pane]);

  const sortedPosts = useMemo(
    () => [...postList].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)),
    [postList]
  );
  useEffect(() => {
    if (pane !== "posts") return;
    if (sortedPosts.length === 0) {
      if (selPost !== null) setSelPost(null);
    } else if (!sortedPosts.some((p) => p.id === selPost)) {
      setSelPost(sortedPosts[0].id);
    }
  }, [sortedPosts, selPost, pane]);

  const selIdx = filtered.findIndex((q) => q.id === selId);
  const selected = selIdx >= 0 ? filtered[selIdx] : null;
  const activePost = selPost ? postList.find((p) => p.id === selPost) : null;

  const move = useCallback(
    (dir: 1 | -1) => {
      if (filtered.length === 0) return;
      const i = Math.max(0, filtered.findIndex((q) => q.id === selId));
      const next = (i + dir + filtered.length) % filtered.length;
      setSelId(filtered[next].id);
    },
    [filtered, selId]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (pane !== "inbox") return;
      if (e.key === "j") move(1);
      if (e.key === "k") move(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, pane]);

  const setModeMut = useSetMode();
  const syncMut = useSyncPosts();
  const refreshMentionsMut = useRefreshMentions();
  const markReadMut = useMarkMentionRead();
  const syncing = syncMut.isPending;
  const refreshingMentions = refreshMentionsMut.isPending;

  function setMode(m: string) {
    setModeMut.mutate(m);
  }

  async function sync() {
    await syncMut.mutateAsync().catch(() => {});
    await reload();
    toast.success("Synced from Instagram");
  }

  async function refreshMentions() {
    try {
      const r = await refreshMentionsMut.mutateAsync();
      if (r?.error) toast.error(r.error);
      else toast.success(`+${r.added ?? 0} mentions`);
    } catch {
      toast.error("Mention refresh failed");
    }
    await reload();
  }

  function markMentionRead(id: string) {
    markReadMut.mutate(id);
  }

  // open a post → live-fetch THAT post's comments on demand, so the detail
  // shows them immediately instead of waiting for the next watcher sweep.
  async function openPost(id: string) {
    setPane("posts");
    setSelPost(id);
    setPostLoading(true);
    try {
      await api.get(`/api/ig/posts/${id}/comments`);
    } catch {
      /* ignore — any already-cached comments still render */
    }
    await reload();
    setPostLoading(false);
  }

  return (
    <div className="h-full flex flex-col relative" style={{ background: "var(--bg)" }}>
      <TopStrip
        account={account}
        mode={mode}
        setMode={setMode}
        newToday={stats.newToday}
        autoSent={stats.autoSent}
        inDraft={drafts.length}
        needYou={clars.length}
        topTheme={stats.topTheme}
        shiftStart={shiftStart}
        syncing={syncing}
        onSync={sync}
        brainOpen={brainOpen}
        onToggleBrain={() => setBrainOpen((v) => !v)}
      />
      <BrainPanel
        open={brainOpen}
        stats={brainStats.stats}
        tools={brainStats.tools}
        onClose={() => setBrainOpen(false)}
      />
      <div className="flex-1 flex min-h-0">
        <LeftPane
          pane={pane}
          setPane={setPane}
          items={filtered}
          tab={tab}
          setTab={setTab}
          selId={selId}
          onSelectItem={setSelId}
          counts={{ all: queue.length, low: drafts.length, asks: clars.length }}
          posts={sortedPosts}
          selPost={selPost}
          onSelectPost={openPost}
          clars={clars}
          names={names}
          postInfo={postInfo}
          mentions={mentions}
          selMention={selMention}
          onSelectMention={(id) => {
            setSelMention(id);
            markMentionRead(id);
          }}
          mentionUnread={mentions.filter((m) => !m.read).length}
        />
        {pane === "inbox" ? (
          <Stage
            item={selected}
            index={selIdx}
            total={filtered.length}
            postInfo={postInfo}
            onNext={() => move(1)}
            onOpenPost={openPost}
            reload={reload}
          />
        ) : pane === "mentions" ? (
          <MentionStage
            mention={mentions.find((m) => m.id === selMention) || null}
            mentions={mentions}
            refreshing={refreshingMentions}
            onRefresh={refreshMentions}
            onSelectMention={(id) => {
              if (!id) setSelMention(null);
              else {
                setSelMention(id);
                markMentionRead(id);
              }
            }}
          />
        ) : (
          <PostStage
            post={activePost || null}
            clars={clars.filter((c) => c.postId === activePost?.id)}
            comments={rows.filter(
              (r) => r.postId === activePost?.id && !r.isOwn
            )}
            loading={postLoading}
            reload={reload}
          />
        )}
        <ShiftFeed
          comments={rows.filter((r) => !r.isOwn)}
          postInfo={postInfo}
          names={names}
        />
      </div>
    </div>
  );
}
