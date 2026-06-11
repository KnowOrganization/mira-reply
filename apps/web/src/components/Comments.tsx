"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import {
  useStatus,
  useComments,
  useDrafts,
  useClarifications,
  useDigest,
  usePost,
  usePatchPost,
  useWatcher,
  useWatcherAction,
  useDraftAction,
  useClarificationAction,
  useSetMode,
  useReprocess,
  useDisconnect,
  qk,
} from "@/lib/api/hooks";
import {
  RefreshCw,
  Loader2,
  ExternalLink,
  HelpCircle,
  Send,
  X,
  Activity,
  Plug,
  Unplug,
  Pause,
  Play,
  Star,
  AlertTriangle,
  CornerDownRight,
  Image as ImageIcon,
  Sparkles,
  Link2,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── types ────────────────────────────────────────────────────────────────
type CommentRow = {
  id: string;
  postId: string;
  postCaption: string;
  postThumb?: string;
  postPermalink?: string;
  text: string;
  fromUserId: string;
  fromUsername: string;
  timestamp: string;
  ts: number;
  isOwn: boolean;
  status: "replied" | "pending" | "needs_info" | "skipped" | "none";
  draftText?: string;
  ownReply?: { text: string; ts: number };
  isSuperfan?: boolean;
};

type PendingDraft = {
  id: string;
  kind: "comment" | "dm";
  threadOrMediaId: string;
  fromUserId: string;
  fromUsername?: string;
  inboundText: string;
  draftText: string;
  intent: string;
  postId?: string;
  createdAt: number;
};

type Clarification = {
  id: string;
  postId: string;
  commentText: string;
  question: string;
  kind?: "context" | "link";
  fromUserId: string;
  fromUsername?: string;
  status: "open" | "answered" | "skipped";
  createdAt: number;
};

type Status = {
  configured: boolean;
  connected: boolean;
  account: { username: string } | null;
  replyMode: ReplyMode;
};

type ReplyMode = "shadow" | "assisted" | "balanced" | "auto";

type ItemState = "needs_you" | "draft" | "replied" | "open" | "mine";

type Item = {
  key: string;
  ts: number;
  state: ItemState;
  commentId?: string;
  text: string;
  fromUserId: string;
  fromUsername: string;
  isOwn: boolean;
  postId: string;
  postCaption: string;
  postThumb?: string;
  postPermalink?: string;
  intent?: string;
  isSuperfan?: boolean;
  draft?: PendingDraft;
  clar?: Clarification;
  ownReply?: { text: string; ts: number };
};

type Tab = "all" | "needs_you" | "draft" | "replied";

type PostLink = {
  id: string;
  label: string;
  url: string;
  type: "location" | "song" | "gear" | "shop" | "other";
};
const LINK_TYPES: PostLink["type"][] = ["gear", "location", "song", "shop", "other"];

type Digest = {
  inbox: number;
  repliedAuto: number;
  pending: number;
  needsInput: number;
};

const MODES: { id: ReplyMode; hint: string }[] = [
  { id: "shadow", hint: "Draft only — never sends" },
  { id: "assisted", hint: "You approve every reply" },
  { id: "balanced", hint: "Auto acks + confident answers, queue the rest" },
  { id: "auto", hint: "Sends everything within safety limits" },
];

// ── master Comments page ─────────────────────────────────────────────────
export function Comments() {
  const qc = useQueryClient();
  const [feed, setFeed] = useState<{ id: string; ts: number; who: string; text: string }[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [linksOpen, setLinksOpen] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  // ── reads — the background watcher keeps these caches fresh; cache reads are
  // instant, so the UI never blocks. Periodic refetch mirrors the old 20s poll.
  const statusQ = useStatus<Status>();
  const status = statusQ.data ?? null;
  const commentsQ = useComments<{ rows?: CommentRow[]; live?: { ok: boolean; error?: string } }>(false, {
    refetchInterval: 20_000,
  });
  const draftsQ = useDrafts<{ pending?: PendingDraft[] }>({ refetchInterval: 20_000 });
  const clarsQ = useClarifications<{ open?: Clarification[] }>({ refetchInterval: 20_000 });
  const digestQ = useDigest<Digest>({ refetchInterval: 20_000 });
  const watcherQ = useWatcher<{ running?: boolean }>({ refetchInterval: 30_000 });

  const rows = useMemo(() => commentsQ.data?.rows ?? [], [commentsQ.data]);
  const pending = useMemo(() => draftsQ.data?.pending ?? [], [draftsQ.data]);
  const clars = useMemo(() => clarsQ.data?.open ?? [], [clarsQ.data]);
  const digest = digestQ.data && typeof digestQ.data.inbox === "number" ? digestQ.data : null;
  const watching = !!watcherQ.data?.running;
  const live = commentsQ.data?.live;
  const liveError = live ? (live.ok ? null : live.error || "Instagram fetch failed") : null;

  // re-read all cached queries (cheap, no live IG tick)
  const reloadCache = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["ig", "comments"] });
    qc.invalidateQueries({ queryKey: qk.drafts });
    qc.invalidateQueries({ queryKey: qk.clarifications });
    qc.invalidateQueries({ queryKey: qk.digest });
  }, [qc]);

  // refresh=true does a live Instagram pull (slow): hit the refresh endpoint,
  // then re-read the now-updated caches.
  const [refreshing, setRefreshing] = useState(false);
  const refreshLive = useCallback(async () => {
    setRefreshing(true);
    try {
      await api.get("/api/ig/comments?refresh=1");
    } catch {
      /* ignore — cache re-read below still reflects whatever landed */
    }
    reloadCache();
    setRefreshing(false);
  }, [reloadCache]);

  const loading = refreshing || commentsQ.isFetching;

  // start the watcher once on mount + SSE-driven freshness
  const watcherAction = useWatcherAction();
  useEffect(() => {
    watcherAction.mutate(undefined);
    const es = new EventSource("/api/ig/stream");
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === "comment") {
          setFeed((f) =>
            [
              {
                id: `c-${ev.commentId}`,
                ts: ev.ts,
                who: ev.fromUsername || (ev.fromUserId || "").slice(0, 8),
                text: ev.text || "",
              },
              ...f.filter((x) => x.id !== `c-${ev.commentId}`),
            ].slice(0, 50)
          );
          reloadCache();
        }
        if (ev.type === "draft" || ev.type === "sent") reloadCache();
      } catch {
        /* ignore malformed event */
      }
    };
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadCache]);

  // global "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── join comments + drafts + clarifications into one timeline ──
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const usedDrafts = new Set<string>();
    const usedClars = new Set<string>();

    for (const row of rows) {
      const draft = pending.find(
        (d) =>
          !usedDrafts.has(d.id) &&
          (d.threadOrMediaId === row.id ||
            (d.inboundText === row.text && d.fromUserId === row.fromUserId))
      );
      if (draft) usedDrafts.add(draft.id);
      const clar = clars.find(
        (c) =>
          !usedClars.has(c.id) &&
          c.commentText === row.text &&
          c.fromUserId === row.fromUserId
      );
      if (clar) usedClars.add(clar.id);

      let state: ItemState;
      if (row.isOwn) state = "mine";
      else if (clar) state = "needs_you";
      else if (draft) state = "draft";
      else if (row.ownReply) state = "replied";
      else state = "open";

      out.push({
        key: row.id,
        ts: row.ts,
        state,
        commentId: row.id,
        text: row.text,
        fromUserId: row.fromUserId,
        fromUsername: row.fromUsername,
        isOwn: row.isOwn,
        postId: row.postId,
        postCaption: row.postCaption,
        postThumb: row.postThumb,
        postPermalink: row.postPermalink,
        intent: draft?.intent,
        isSuperfan: row.isSuperfan,
        draft,
        clar,
        ownReply: row.ownReply,
      });
    }
    // drafts / clarifications with no cached comment (e.g. injected tests)
    for (const d of pending) {
      if (usedDrafts.has(d.id)) continue;
      out.push({
        key: `d-${d.id}`,
        ts: d.createdAt,
        state: "draft",
        text: d.inboundText,
        fromUserId: d.fromUserId,
        fromUsername: d.fromUsername || "",
        isOwn: false,
        postId: d.postId || "",
        postCaption: "",
        intent: d.intent,
        draft: d,
      });
    }
    for (const c of clars) {
      if (usedClars.has(c.id)) continue;
      out.push({
        key: `c-${c.id}`,
        ts: c.createdAt,
        state: "needs_you",
        text: c.commentText,
        fromUserId: c.fromUserId,
        fromUsername: c.fromUsername || "",
        isOwn: false,
        postId: c.postId || "",
        postCaption: "",
        clar: c,
      });
    }
    return out.sort((a, b) => b.ts - a.ts);
  }, [rows, pending, clars]);

  const counts = useMemo(() => {
    // own comments never appear in the timeline — don't count them
    const v = items.filter((i) => !i.isOwn);
    return {
      all: v.length,
      needs_you: v.filter((i) => i.state === "needs_you").length,
      draft: v.filter((i) => i.state === "draft").length,
      replied: v.filter((i) => i.state === "replied").length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (i.isOwn) return false; // own replies are shown nested, not as rows
      if (tab !== "all" && i.state !== tab) return false;
      if (q) {
        return (
          i.text.toLowerCase().includes(q) ||
          i.fromUsername.toLowerCase().includes(q) ||
          i.postCaption.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, tab, search]);

  // group the timeline by post — each post is a section
  const postGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        postId: string;
        caption: string;
        thumb?: string;
        permalink?: string;
        items: Item[];
        latest: number;
      }
    >();
    for (const it of filtered) {
      const key = it.postId || "_none";
      let g = map.get(key);
      if (!g) {
        g = {
          postId: key,
          caption: it.postCaption,
          thumb: it.postThumb,
          permalink: it.postPermalink,
          items: [],
          latest: 0,
        };
        map.set(key, g);
      }
      g.items.push(it);
      if (it.ts > g.latest) g.latest = it.ts;
      if (!g.caption && it.postCaption) g.caption = it.postCaption;
      if (!g.thumb && it.postThumb) g.thumb = it.postThumb;
      if (!g.permalink && it.postPermalink) g.permalink = it.postPermalink;
    }
    return Array.from(map.values()).sort((a, b) => b.latest - a.latest);
  }, [filtered]);

  // ── actions ──
  const draftAction = useDraftAction();
  const clarAction = useClarificationAction();
  const setModeMut = useSetMode();
  const reprocessMut = useReprocess();
  const disconnectMut = useDisconnect();

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
                    className="break-inside-avoid mb-5 rounded-3xl overflow-hidden"
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
                      <div
                        key={item.key}
                        style={{ borderTop: "1px solid var(--border)" }}
                      >
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

        {/* right rail */}
        <aside
          className="border-l overflow-hidden flex flex-col"
          style={{ borderColor: "var(--border)", background: "var(--bg-sidebar)" }}
        >
          {digest && (
            <div className="grid grid-cols-2 gap-px border-b" style={{ borderColor: "var(--border)", background: "var(--border)" }}>
              <Stat label="Today" value={digest.inbox} sub="new" />
              <Stat label="Auto-replied" value={digest.repliedAuto} sub="sent" />
              <Stat label="Pending" value={digest.pending} sub="drafts" />
              <Stat label="Needs you" value={digest.needsInput} sub="open" accent={digest.needsInput > 0} />
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
      </div>
    </div>
  );
}

// ── avatar — monogram circle ─────────────────────────────────────────────
function Avatar({ name, superfan }: { name: string; superfan?: boolean }) {
  const letter = (name || "?").replace(/^@/, "").charAt(0).toUpperCase() || "?";
  return (
    <div className="relative shrink-0">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[12.5px] font-bold"
        style={{
          background: "var(--bg-inset)",
          color: "var(--text-muted)",
          border: "1px solid var(--border)",
        }}
      >
        {letter}
      </div>
      {superfan && (
        <div
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
          style={{ background: "var(--accent)" }}
        >
          <Star size={7} fill="var(--accent-fg)" style={{ color: "var(--accent-fg)" }} />
        </div>
      )}
    </div>
  );
}

// ── post group header — the card's top ───────────────────────────────────
function PostHeader({
  caption,
  thumb,
  permalink,
  count,
  linksOpen,
  onToggleLinks,
}: {
  caption: string;
  thumb?: string;
  permalink?: string;
  count: number;
  linksOpen?: boolean;
  onToggleLinks?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3.5">
      <div
        className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative"
        style={{ background: "var(--bg-inset)" }}
      >
        <ImageIcon
          size={16}
          className="absolute inset-0 m-auto"
          style={{ color: "var(--text-subtle)" }}
        />
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[12.5px] font-bold leading-snug"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            letterSpacing: "-0.01em",
          }}
        >
          {caption || "Untitled post"}
        </div>
        <div
          className="text-[10.5px] font-semibold uppercase tracking-[0.06em] mt-1"
          style={{ color: "var(--text-subtle)" }}
        >
          {count} comment{count === 1 ? "" : "s"}
        </div>
      </div>
      {onToggleLinks && (
        <button
          onClick={onToggleLinks}
          className="h-7 px-2.5 rounded-lg flex items-center gap-1 text-[11px] font-semibold transition shrink-0"
          style={{
            background: linksOpen ? "var(--accent)" : "var(--bg-inset)",
            color: linksOpen ? "var(--accent-fg)" : "var(--text-muted)",
          }}
        >
          <Link2 size={11} /> Links
        </button>
      )}
      {permalink && (
        <a
          href={permalink}
          target="_blank"
          rel="noreferrer"
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 hover:bg-black/[0.04] transition"
          style={{ color: "var(--text-subtle)" }}
        >
          <ExternalLink size={13} />
        </a>
      )}
    </div>
  );
}

// ── per-post link attachments — Mira DMs these on request ────────────────
function PostLinksPanel({ postId }: { postId: string }) {
  const [links, setLinks] = useState<PostLink[] | null>(null);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<PostLink["type"]>("gear");

  const postQ = usePost<{ post?: { links?: PostLink[] } }>(postId);
  const patchPost = usePatchPost();
  const busy = patchPost.isPending;

  // seed local links from the post query (the panel mirrors PATCH responses too)
  useEffect(() => {
    if (postQ.data) setLinks(postQ.data.post?.links || []);
    else if (postQ.isError) setLinks([]);
  }, [postQ.data, postQ.isError]);

  async function add() {
    if (!label.trim() || !url.trim() || busy) return;
    const d = await patchPost.mutateAsync({
      id: postId,
      patch: { addLink: { label: label.trim(), url: url.trim(), type } },
    }) as { post?: { links?: PostLink[] } };
    setLinks(d.post?.links || []);
    setLabel("");
    setUrl("");
    toast.success("Link attached — Mira will DM it on request");
  }
  async function remove(id: string) {
    const d = await patchPost.mutateAsync({ id: postId, patch: { removeLink: id } }) as { post?: { links?: PostLink[] } };
    setLinks(d.post?.links || []);
  }

  return (
    <div
      className="px-3.5 py-3"
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--bg-inset)",
      }}
    >
      <div
        className="text-[9.5px] font-bold uppercase tracking-[0.09em] mb-2 flex items-center gap-1"
        style={{ color: "var(--text-subtle)" }}
      >
        <Link2 size={9} /> Attached links — Mira DMs these when asked
      </div>
      {links === null ? (
        <div className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
          Loading…
        </div>
      ) : (
        links.length > 0 && (
          <div className="space-y-1 mb-2">
            {links.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-2 text-[11.5px] rounded-lg px-2 py-1.5"
                style={{ background: "var(--bg-elev)" }}
              >
                <span className="font-semibold shrink-0">{l.label}</span>
                <span
                  className="truncate flex-1"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {l.url}
                </span>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: "var(--bg-inset)", color: "var(--text-subtle)" }}
                >
                  {l.type}
                </span>
                <button
                  onClick={() => remove(l.id)}
                  className="shrink-0"
                  style={{ color: "var(--text-subtle)" }}
                  aria-label="Remove"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label"
          className="h-7 px-2 rounded-md border bg-transparent text-[11.5px] outline-none focus:border-strong w-[100px]"
          style={{ borderColor: "var(--border-strong)" }}
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="h-7 px-2 rounded-md border bg-transparent text-[11.5px] outline-none focus:border-strong flex-1 min-w-[120px]"
          style={{ borderColor: "var(--border-strong)" }}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as PostLink["type"])}
          className="h-7 px-1.5 rounded-md border bg-transparent text-[11px] outline-none"
          style={{ borderColor: "var(--border-strong)" }}
        >
          {LINK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          onClick={add}
          disabled={busy || !label.trim() || !url.trim()}
          className="h-7 px-2.5 rounded-md text-[11px] font-semibold flex items-center gap-1 disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          {busy ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Plus size={11} />
          )}
          Attach
        </button>
      </div>
    </div>
  );
}

// ── reply bubble — Mira's sent reply, nested ─────────────────────────────
function ReplyBubble({ text }: { text: string }) {
  return (
    <div className="mt-2 flex items-start gap-1.5">
      <CornerDownRight
        size={13}
        className="mt-1.5 shrink-0"
        style={{ color: "var(--text-subtle)" }}
      />
      <div
        className="rounded-2xl rounded-tl-md px-3 py-2 min-w-0"
        style={{ background: "var(--bg-inset)" }}
      >
        <div
          className="text-[9px] font-bold uppercase tracking-[0.09em] flex items-center gap-1"
          style={{ color: "var(--text-subtle)" }}
        >
          <Sparkles size={8} /> Mira replied
        </div>
        <div className="text-[12.5px] leading-snug mt-0.5 break-words">{text}</div>
      </div>
    </div>
  );
}

// ── item card — one comment row ──────────────────────────────────────────
function ItemCard({
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
  onReprocess: (commentId: string) => void;
}) {
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
        <div className="text-[13px] leading-[1.5] mt-0.5 break-words">
          {item.text}
        </div>

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
            onClick={() => onReprocess(item.commentId!)}
            className="mt-2 h-7 px-3 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5 transition hover:opacity-80"
            style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
          >
            <Sparkles size={11} /> Reply with Mira
          </button>
        )}
      </div>
    </div>
  );
}

function ClarBox({
  clar,
  onAnswer,
  onSkip,
}: {
  clar: Clarification;
  onAnswer: (c: Clarification, answer: string) => Promise<void>;
  onSkip: (c: Clarification) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    await onAnswer(clar, text.trim()).finally(() => setBusy(false));
    setText("");
  }
  return (
    <div
      className="mt-2 rounded-2xl border p-3.5"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-elev)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="text-[12px] mb-2 leading-5 flex items-start gap-1.5">
        <HelpCircle size={13} style={{ color: "var(--accent)" }} className="mt-0.5 shrink-0" />
        <span>{clar.question}</span>
      </div>
      <div className="flex items-end gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Your answer…"
          className="flex-1 h-8 px-2.5 rounded-md border bg-transparent text-[12.5px] outline-none focus:border-strong"
          style={{ borderColor: "var(--border-strong)" }}
        />
        <button
          onClick={submit}
          disabled={busy || !text.trim()}
          className="h-8 px-2.5 rounded-md text-[11.5px] font-medium flex items-center gap-1 disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          Answer
        </button>
        <button
          onClick={() => onSkip(clar)}
          className="h-8 px-2 rounded-md text-[11.5px] border"
          style={{ borderColor: "var(--border-strong)", color: "var(--text-muted)" }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function DraftBox({
  draft,
  onApprove,
  onReject,
}: {
  draft: PendingDraft;
  onApprove: (d: PendingDraft, text: string) => Promise<void>;
  onReject: (d: PendingDraft) => Promise<void>;
}) {
  const [text, setText] = useState(draft.draftText);
  const [busy, setBusy] = useState(false);
  return (
    <div
      className="mt-2 rounded-2xl border p-3.5"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-elev)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 rounded-lg border bg-transparent text-[13px] outline-none focus:border-strong resize-y"
        style={{ borderColor: "var(--border-strong)" }}
      />
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={async () => {
            setBusy(true);
            await onApprove(draft, text).finally(() => setBusy(false));
          }}
          disabled={busy || !text.trim()}
          className="h-8 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Send
        </button>
        <button
          onClick={async () => {
            setBusy(true);
            await onReject(draft).finally(() => setBusy(false));
          }}
          disabled={busy}
          className="h-8 px-3 rounded-md text-xs border flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5"
          style={{ borderColor: "var(--border-strong)", color: "var(--text-muted)" }}
        >
          <X size={12} /> Reject
        </button>
      </div>
    </div>
  );
}

// ── small parts ──────────────────────────────────────────────────────────
function IconBtn({
  children,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-7 w-7 rounded-md border flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40"
      style={{ borderColor: "var(--border-strong)", color: "var(--text-muted)" }}
    >
      {children}
    </button>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-1.5 py-0.5 rounded border text-[10px]" style={{ borderColor: "var(--border-strong)" }}>
      {children}
    </span>
  );
}

function StateChip({ state }: { state: ItemState }) {
  if (state === "needs_you")
    return (
      <span
        className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1"
        style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
      >
        <HelpCircle size={9} /> Needs you
      </span>
    );
  if (state === "draft")
    return (
      <span
        className="text-[10px] px-1.5 py-0.5 rounded"
        style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
      >
        Draft
      </span>
    );
  return null;
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="px-3 py-2.5" style={{ background: "var(--bg-sidebar)" }}>
      <div className="text-[10px] uppercase tracking-[0.07em]" style={{ color: "var(--text-subtle)" }}>
        {label}
      </div>
      <div className="text-[17px] font-medium leading-tight mt-0.5" style={{ color: accent && value > 0 ? "var(--accent)" : "var(--text)" }}>
        {value}
      </div>
      <div className="text-[10px]" style={{ color: "var(--text-subtle)" }}>
        {sub}
      </div>
    </div>
  );
}

// daily digest — a once-a-day overnight summary, dismissable
type DigestBannerData = {
  inbox: number;
  repliedAuto: number;
  pending: number;
  needsInput: number;
  topTheme: { name: string; count: number } | null;
};
function DigestBanner() {
  const [dismissed, setDismissed] = useState(false);
  // only fetch if it hasn't already been dismissed today
  const [alreadyShown] = useState(() => {
    if (typeof window === "undefined") return false;
    const key = "mira.digest." + new Date().toISOString().slice(0, 10);
    return !!localStorage.getItem(key);
  });

  const { data: dg } = useDigest<DigestBannerData>({ enabled: !alreadyShown && !dismissed });
  const show = !alreadyShown && !dismissed && !!dg && typeof dg.inbox === "number";

  if (!show || !dg) return null;

  function dismiss() {
    setDismissed(true);
    localStorage.setItem(
      "mira.digest." + new Date().toISOString().slice(0, 10),
      "1"
    );
  }

  return (
    <div className="px-5 pt-5">
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border p-3.5 flex items-start gap-2.5"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-elev)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <Activity size={14} className="mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
        <div className="flex-1 text-[12.5px] leading-5" style={{ color: "var(--text-muted)" }}>
          <span className="font-medium" style={{ color: "var(--text)" }}>
            Your daily digest.{" "}
          </span>
          Mira saw <b style={{ color: "var(--text)" }}>{dg.inbox}</b> new comment
          {dg.inbox === 1 ? "" : "s"}, auto-replied to{" "}
          <b style={{ color: "var(--text)" }}>{dg.repliedAuto}</b>, has{" "}
          <b style={{ color: "var(--text)" }}>{dg.pending}</b> waiting for you
          {dg.needsInput > 0 && (
            <>
              {" "}and <b style={{ color: "var(--accent)" }}>{dg.needsInput}</b> that need your input
            </>
          )}
          .
          {dg.topTheme && (
            <>
              {" "}Most-asked: <b style={{ color: "var(--text)" }}>{dg.topTheme.name}</b>.
            </>
          )}
        </div>
        <button
          onClick={dismiss}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
          style={{ color: "var(--text-subtle)" }}
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      </motion.div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-10 text-center text-xs" style={{ color: "var(--text-subtle)" }}>
      {children}
    </div>
  );
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
