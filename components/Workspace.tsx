"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MiraFeed } from "./MiraFeed";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  ExternalLink,
  Send,
  RotateCcw,
  Pencil,
  Loader2,
  HelpCircle,
  Check,
  ArrowRight,
  RefreshCw,
  Save,
  Plus,
  Trash2,
  Link as LinkIcon,
  Wand2,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Eye,
  PlayCircle,
  Inbox,
  Images,
  AtSign,
  Activity,
} from "lucide-react";

const SPRING = { type: "spring" as const, stiffness: 320, damping: 30 };
const MODES = ["shadow", "assisted", "balanced", "auto"] as const;
const MODE_HINT: Record<string, string> = {
  shadow: "Mira drafts silently. Nothing is sent.",
  assisted: "Mira drafts. You approve before sending.",
  balanced: "Mira sends the safe ones, drafts the rest.",
  auto: "Mira handles everything on its own.",
};
const LINK_TYPES = ["location", "song", "gear", "shop", "other"] as const;

// ── types ────────────────────────────────────────────────────────────────
type Draft = {
  id: string;
  kind: string;
  threadOrMediaId: string;
  fromUserId: string;
  fromUsername?: string;
  inboundText: string;
  draftText: string;
  intent: string;
  postId?: string;
  createdAt: number;
};
type Clar = {
  id: string;
  commentId?: string;
  postId: string;
  commentText: string;
  question: string;
  kind?: "context" | "link";
  fromUserId: string;
  fromUsername?: string;
  createdAt: number;
};
type Log = {
  id: string;
  inbound: string;
  outbound: string;
  intent: string;
  postId?: string;
  toUserId: string;
  sentAt: number;
  status: string;
};
type Row = {
  id: string;
  postId: string;
  postCaption: string;
  postThumb?: string;
  postPermalink?: string;
  text: string;
  fromUserId: string;
  fromUsername?: string;
  ts: number;
  timestamp: string;
  isOwn?: boolean;
  status?: "replied" | "skipped" | "pending" | "needs_info" | "none";
  skipReason?: string;
  draftText?: string;
  ownReply?: { text: string; ts: number };
  isSuperfan?: boolean;
};
type PostLink = {
  id: string;
  label: string;
  url: string;
  type: "location" | "song" | "gear" | "shop" | "other";
};
type Insights = {
  likes?: number;
  comments?: number;
  reach?: number;
  saved?: number;
  shares?: number;
  plays?: number;
  totalInteractions?: number;
  fetchedAt: number;
};
type Post = {
  id: string;
  caption: string;
  mediaType: string;
  permalink?: string;
  thumbnailUrl?: string;
  timestamp: string;
  notes: string;
  qa: { q: string; a: string; ts: number }[];
  links: PostLink[];
  insights?: Insights;
  updatedAt: number;
};
type QItem =
  | { type: "draft"; id: string; at: number; draft: Draft }
  | { type: "clar"; id: string; at: number; clar: Clar };
type Mention = {
  id: string;
  kind: "caption" | "comment" | "tag";
  mediaId: string;
  permalink?: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  commentId?: string;
  commentText?: string;
  fromUserId?: string;
  fromUsername?: string;
  mediaType?: string;
  likeCount?: number;
  commentsCount?: number;
  ts: number;
  seenAt: number;
  read: boolean;
};

// ── helpers ──────────────────────────────────────────────────────────────
function ago(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function dur(ms: number): string {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}
function hashtags(caption: string): string[] {
  return (caption.match(/#[\p{L}\d_]+/gu) || []).slice(0, 4);
}
function stripTags(caption: string): string {
  return caption.replace(/#[\p{L}\d_]+/gu, "").trim();
}
const AV_TINTS = ["#c1623e", "#d99a5b", "#8a9a6b", "#b07d57", "#7a8a9a", "#c98a9b"];
function tintFor(s: string): string {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n + s.charCodeAt(i)) % AV_TINTS.length;
  return AV_TINTS[n];
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const tint = tintFor(name || "?");
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `color-mix(in srgb, ${tint} 20%, var(--bg-elev))`,
        color: tint,
      }}
    >
      {(name || "?").replace(/^@/, "").slice(0, 1).toUpperCase()}
    </div>
  );
}

// ── main ─────────────────────────────────────────────────────────────────
export function Workspace() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [clars, setClars] = useState<Clar[]>([]);
  const [postList, setPostList] = useState<Post[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [rowInfo, setRowInfo] = useState<
    Record<string, { caption: string; thumb?: string; permalink?: string; comments: number }>
  >({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<{
    newToday: number;
    autoSent: number;
    topTheme: string | null;
  }>({ newToday: 0, autoSent: 0, topTheme: null });
  const [mode, setModeState] = useState<string>("balanced");
  const [shiftStart, setShiftStart] = useState<number>(0);
  const [account, setAccount] = useState<string>("");
  const [pane, setPane] = useState<"inbox" | "posts" | "mentions">("inbox");
  const [tab, setTab] = useState<"all" | "low" | "asks">("all");
  const [selId, setSelId] = useState<string | null>(null);
  const [selPost, setSelPost] = useState<string | null>(null);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [selMention, setSelMention] = useState<string | null>(null);
  const [refreshingMentions, setRefreshingMentions] = useState(false);
  const [brainOpen, setBrainOpen] = useState(false);
  const [brainStats, setBrainStats] = useState<{
    stats: { tool: string; count: number; errorRate: number; p50: number; p95: number; open: boolean }[];
    tools: { name: string; description: string }[];
  }>({ stats: [], tools: [] });
  const [syncing, setSyncing] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [, force] = useState(0);

  const load = useCallback(async () => {
    try {
      const [cRes, dRes, clRes, dashRes, stRes, wRes, pRes, mRes] = await Promise.all([
        fetch("/api/ig/comments").then((r) => r.json()).catch(() => ({})),
        fetch("/api/ig/drafts").then((r) => r.json()).catch(() => ({})),
        fetch("/api/ig/clarifications").then((r) => r.json()).catch(() => ({})),
        fetch("/api/ig/dashboard").then((r) => r.json()).catch(() => ({})),
        fetch("/api/ig/status").then((r) => r.json()).catch(() => ({})),
        fetch("/api/ig/watcher").then((r) => r.json()).catch(() => ({})),
        fetch("/api/ig/posts").then((r) => r.json()).catch(() => ({})),
        fetch("/api/ig/mentions").then((r) => r.json()).catch(() => ({})),
      ]);

      const rows: Row[] = cRes.rows || [];
      const info: Record<
        string,
        { caption: string; thumb?: string; permalink?: string; comments: number }
      > = {};
      const nMap: Record<string, string> = {};
      for (const r of rows) {
        if (!info[r.postId])
          info[r.postId] = {
            caption: r.postCaption || "",
            thumb: r.postThumb,
            permalink: r.postPermalink,
            comments: 0,
          };
        info[r.postId].comments++;
        if (r.fromUsername) nMap[r.fromUserId] = r.fromUsername;
      }
      const pend: Draft[] = (dRes.pending || []).filter(
        (d: Draft) => d.kind === "comment"
      );
      const open: Clar[] = clRes.open || [];
      for (const d of pend) if (d.fromUsername) nMap[d.fromUserId] = d.fromUsername;
      for (const c of open) if (c.fromUsername) nMap[c.fromUserId] = c.fromUsername;

      setRowInfo(info);
      setRows(rows);
      setNames(nMap);
      setDrafts(pend);
      setClars(open);
      setPostList(pRes.posts || []);
      setMentions(mRes.mentions || []);
      setStats({
        newToday: dashRes?.today?.comments ?? 0,
        autoSent: dashRes?.today?.autoReplied ?? 0,
        topTheme:
          dashRes?.knowledge?.top?.q ||
          Object.keys(dashRes?.themes || {})[0] ||
          null,
      });
      if (stRes?.replyMode) setModeState(stRes.replyMode);
      if (stRes?.account?.username) setAccount(stRes.account.username);
      if (wRes?.startedAt) setShiftStart(wRes.startedAt);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    const bt = setInterval(() => {
      if (brainOpen) loadBrainStats();
    }, 3_000);
    const tick = setInterval(() => force((n) => n + 1), 30_000);
    const es = new EventSource("/api/ig/stream");
    let deb: ReturnType<typeof setTimeout>;
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (["comment", "draft", "sent", "log"].includes(ev.type)) {
          clearTimeout(deb);
          deb = setTimeout(load, 200);
        }
      } catch {}
    };
    return () => {
      clearInterval(t);
      clearInterval(bt);
      clearInterval(tick);
      es.close();
    };
  }, [load, brainOpen]);

  // keep the OPEN post live — the watcher only sweeps older posts every few
  // ticks, so while a post detail is showing, poll THAT post's comments
  // directly. New comments + replies land without leaving the page.
  useEffect(() => {
    if (pane !== "posts" || !selPost) return;
    const iv = setInterval(async () => {
      try {
        await fetch(`/api/ig/posts/${selPost}/comments`);
        await load();
      } catch {
        /* ignore — next tick retries */
      }
    }, 12_000);
    return () => clearInterval(iv);
  }, [pane, selPost, load]);

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

  async function setMode(m: string) {
    setModeState(m);
    await fetch("/api/ig/mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: m }),
    }).catch(() => {});
  }

  async function sync() {
    setSyncing(true);
    await fetch("/api/ig/posts/sync", { method: "POST" }).catch(() => {});
    await load();
    setSyncing(false);
    toast.success("Synced from Instagram");
  }

  async function refreshMentions() {
    setRefreshingMentions(true);
    try {
      const r = await fetch("/api/ig/mentions", { method: "POST" }).then((x) =>
        x.json()
      );
      if (r?.error) toast.error(r.error);
      else toast.success(`+${r.added ?? 0} mentions`);
    } catch {
      toast.error("Mention refresh failed");
    }
    await load();
    setRefreshingMentions(false);
  }

  async function loadBrainStats() {
    try {
      const r = await fetch("/api/ig/brain-stats").then((x) => x.json());
      setBrainStats(r);
    } catch {
      /* ignore */
    }
  }

  async function markMentionRead(id: string) {
    setMentions((ms) => ms.map((m) => (m.id === id ? { ...m, read: true } : m)));
    await fetch("/api/ig/mentions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true }),
    }).catch(() => {});
  }

  // open a post → live-fetch THAT post's comments on demand, so the detail
  // shows them immediately instead of waiting for the next watcher sweep.
  async function openPost(id: string) {
    setPane("posts");
    setSelPost(id);
    setPostLoading(true);
    try {
      await fetch(`/api/ig/posts/${id}/comments`);
    } catch {
      /* ignore — any already-cached comments still render */
    }
    await load();
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
        onToggleBrain={() => {
          const next = !brainOpen;
          setBrainOpen(next);
          if (next) loadBrainStats();
        }}
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
            reload={load}
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
            reload={load}
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

// ── top strip ────────────────────────────────────────────────────────────
function TopStrip({
  account,
  mode,
  setMode,
  newToday,
  autoSent,
  inDraft,
  needYou,
  topTheme,
  shiftStart,
  syncing,
  onSync,
  brainOpen,
  onToggleBrain,
}: {
  account: string;
  mode: string;
  setMode: (m: string) => void;
  newToday: number;
  autoSent: number;
  inDraft: number;
  needYou: number;
  topTheme: string | null;
  shiftStart: number;
  syncing: boolean;
  onSync: () => void;
  brainOpen: boolean;
  onToggleBrain: () => void;
}) {
  return (
    <div
      className="shrink-0 border-b"
      style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
    >
      <div className="flex items-center gap-3 px-5 h-14">
        <div className="flex items-center gap-2">
          <span className="glow-dot" />
          <span className="text-[13.5px] font-bold">
            {account ? `@${account}` : "Mira"}
          </span>
          <button
            onClick={async () => {
              await fetch("/api/ig/disconnect", { method: "POST" });
              window.location.href = "/api/ig/connect?switch=1";
            }}
            className="text-[10.5px] px-2 py-0.5 rounded-lg"
            style={{ background: "var(--bg-inset)", color: "var(--text-subtle)" }}
            title="Switch Instagram account"
          >
            switch
          </button>
        </div>
        <div className="mx-auto flex items-center gap-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: "var(--text-subtle)" }}
          >
            Autonomy
          </span>
          <div
            className="flex items-center gap-0.5 p-1 rounded-2xl"
            style={{ background: "var(--bg-inset)" }}
          >
            {MODES.map((m) => (
              <motion.button
                key={m}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMode(m)}
                title={MODE_HINT[m]}
                className="h-8 px-3 rounded-xl text-[12px] font-semibold capitalize transition-colors"
                style={
                  mode === m
                    ? {
                        background: "var(--accent)",
                        color: "var(--accent-fg)",
                        boxShadow: "var(--shadow-card)",
                      }
                    : { color: "var(--text-muted)" }
                }
              >
                {m}
              </motion.button>
            ))}
          </div>
          <span
            className="text-[11.5px] italic max-w-[220px] truncate"
            style={{ color: "var(--text-subtle)" }}
          >
            {MODE_HINT[mode]}
          </span>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onToggleBrain}
          className="h-9 px-3 rounded-xl text-[12px] font-semibold flex items-center gap-1.5"
          style={
            brainOpen
              ? { background: "var(--accent)", color: "var(--accent-fg)" }
              : { background: "var(--bg-inset)", color: "var(--text-muted)" }
          }
        >
          <Activity size={13} />
          Brain
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onSync}
          disabled={syncing}
          className="h-9 px-3 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 disabled:opacity-60"
          style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
        >
          {syncing ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
          Sync
        </motion.button>
        {shiftStart > 0 && (
          <span className="text-[11.5px]" style={{ color: "var(--text-subtle)" }}>
            shift · {dur(Date.now() - shiftStart)}
          </span>
        )}
      </div>
      <div
        className="flex items-center gap-6 px-5 h-10 border-t text-[12px]"
        style={{ borderColor: "var(--border)" }}
      >
        <Stat n={newToday} label="new today" />
        <Stat n={autoSent} label="auto-sent" />
        <Stat n={inDraft} label="in draft" />
        <Stat n={needYou} label="need you" accent={needYou > 0} />
        {topTheme && (
          <div className="flex items-center gap-1.5">
            <span style={{ color: "var(--text-subtle)" }}>most-asked</span>
            <span
              className="font-semibold lowercase"
              style={{ color: "var(--accent)" }}
            >
              {topTheme.length > 26 ? topTheme.slice(0, 26) + "…" : topTheme}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ n, label, accent }: { n: number; label: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="font-bold tabular-nums text-[13px]"
        style={{ color: accent ? "var(--accent)" : "var(--text)" }}
      >
        {n}
      </span>
      <span style={{ color: "var(--text-subtle)" }}>{label}</span>
    </div>
  );
}

// ── left pane (toggle: needs you / posts) ────────────────────────────────
function LeftPane({
  pane,
  setPane,
  items,
  tab,
  setTab,
  selId,
  onSelectItem,
  counts,
  posts,
  selPost,
  onSelectPost,
  clars,
  names,
  postInfo,
  mentions,
  selMention,
  onSelectMention,
  mentionUnread,
}: {
  pane: "inbox" | "posts" | "mentions";
  setPane: (p: "inbox" | "posts" | "mentions") => void;
  items: QItem[];
  tab: "all" | "low" | "asks";
  setTab: (t: "all" | "low" | "asks") => void;
  selId: string | null;
  onSelectItem: (id: string) => void;
  counts: { all: number; low: number; asks: number };
  posts: Post[];
  selPost: string | null;
  onSelectPost: (id: string) => void;
  clars: Clar[];
  names: Record<string, string>;
  postInfo: (id?: string) => { caption: string } | undefined;
  mentions: Mention[];
  selMention: string | null;
  onSelectMention: (id: string) => void;
  mentionUnread: number;
}) {
  return (
    <div
      className="w-[316px] shrink-0 border-r flex flex-col"
      style={{ borderColor: "var(--border)", background: "var(--bg-sidebar)" }}
    >
      {/* pane toggle */}
      <div className="px-3 pt-3">
        <div
          className="flex p-1 rounded-2xl"
          style={{ background: "var(--bg-inset)" }}
        >
          <PaneTab
            active={pane === "inbox"}
            onClick={() => setPane("inbox")}
            icon={<Inbox size={14} />}
            label="Needs you"
            badge={counts.asks + counts.low}
          />
          <PaneTab
            active={pane === "posts"}
            onClick={() => setPane("posts")}
            icon={<Images size={14} />}
            label="Posts"
            badge={posts.length}
          />
          <PaneTab
            active={pane === "mentions"}
            onClick={() => setPane("mentions")}
            icon={<AtSign size={14} />}
            label="Mentions"
            badge={mentionUnread || mentions.length}
          />
        </div>
      </div>

      {pane === "inbox" ? (
        <>
          <div className="px-5 pt-4 pb-2">
            <p
              className="text-[11.5px]"
              style={{ color: "var(--text-subtle)" }}
            >
              Decisions Mira couldn&apos;t make alone
            </p>
            <div className="flex gap-1 mt-2.5">
              {(
                [
                  { k: "all", label: "All" },
                  { k: "low", label: "Drafts" },
                  { k: "asks", label: "Direct asks" },
                ] as const
              ).map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className="h-7 px-2.5 rounded-lg text-[11.5px] font-semibold transition-colors"
                  style={
                    tab === t.k
                      ? { background: "var(--accent)", color: "var(--accent-fg)" }
                      : { background: "var(--bg-inset)", color: "var(--text-muted)" }
                  }
                >
                  {t.label}
                  <span className="ml-1 opacity-70 tabular-nums">
                    {counts[t.k]}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3 space-y-1.5">
            {items.length === 0 && (
              <div
                className="text-[12px] text-center py-10"
                style={{ color: "var(--text-subtle)" }}
              >
                Nothing waiting. All clear.
              </div>
            )}
            <AnimatePresence initial={false}>
              {items.map((q) => {
                const isDraft = q.type === "draft";
                const userId = isDraft ? q.draft.fromUserId : q.clar.fromUserId;
                const uname =
                  (isDraft ? q.draft.fromUsername : q.clar.fromUsername) ||
                  names[userId] ||
                  userId.slice(0, 8);
                const text = isDraft ? q.draft.inboundText : q.clar.commentText;
                const postId = isDraft ? q.draft.postId : q.clar.postId;
                const cap = postInfo(postId)?.caption || "";
                const active = q.id === selId;
                return (
                  <motion.button
                    key={q.id}
                    layout
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={SPRING}
                    onClick={() => onSelectItem(q.id)}
                    className="w-full text-left rounded-2xl p-3 transition-colors"
                    style={
                      active
                        ? {
                            background: "var(--bg-elev)",
                            boxShadow: "var(--shadow-card)",
                            border:
                              "1px solid color-mix(in srgb, var(--accent) 34%, transparent)",
                          }
                        : {
                            background: "transparent",
                            border: "1px solid transparent",
                          }
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Avatar name={uname} size={26} />
                      <span className="text-[12.5px] font-bold truncate">
                        @{uname}
                      </span>
                      <span
                        className="ml-auto text-[10px] shrink-0"
                        style={{ color: "var(--text-subtle)" }}
                      >
                        {ago(q.at)}
                      </span>
                    </div>
                    <div
                      className="text-[12.5px] mt-1.5 line-clamp-2 leading-snug"
                      style={{ color: "var(--text)" }}
                    >
                      {text}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                        style={
                          isDraft
                            ? {
                                background: "var(--bg-inset)",
                                color: "var(--text-muted)",
                              }
                            : {
                                background: "var(--accent-soft)",
                                color: "var(--accent-deep)",
                              }
                        }
                      >
                        {isDraft ? "draft" : "asks you"}
                      </span>
                      {cap && (
                        <span
                          className="text-[10.5px] truncate"
                          style={{ color: "var(--text-subtle)" }}
                        >
                          on “{stripTags(cap).slice(0, 28) || "post"}”
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      ) : pane === "mentions" ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pt-3 pb-3 space-y-1.5">
          {mentions.length === 0 && (
            <div
              className="text-[12px] text-center py-10"
              style={{ color: "var(--text-subtle)" }}
            >
              No mentions yet. Hit Refresh in the panel.
            </div>
          )}
          {mentions
            .slice()
            .sort((a, b) => b.ts - a.ts)
            .map((m) => {
              const active = m.id === selMention;
              const label =
                m.kind === "comment"
                  ? "comment"
                  : m.kind === "caption"
                  ? "caption"
                  : "photo tag";
              return (
                <motion.button
                  key={m.id}
                  layout
                  onClick={() => onSelectMention(m.id)}
                  whileTap={{ scale: 0.98 }}
                  className="w-full text-left rounded-2xl p-2.5 flex items-start gap-2.5 transition-colors"
                  style={
                    active
                      ? {
                          background: "var(--bg-elev)",
                          boxShadow: "var(--shadow-card)",
                          border:
                            "1px solid color-mix(in srgb, var(--accent) 34%, transparent)",
                        }
                      : {
                          background: "transparent",
                          border: "1px solid transparent",
                        }
                  }
                >
                  <div
                    className="w-12 h-12 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
                    style={{ background: "var(--bg-inset)" }}
                  >
                    {m.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <AtSign size={16} style={{ color: "var(--text-subtle)" }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[9.5px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
                        style={{
                          background: "var(--accent-soft)",
                          color: "var(--accent-deep)",
                        }}
                      >
                        {label}
                      </span>
                      {!m.read && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: "var(--accent)" }}
                        />
                      )}
                    </div>
                    <div className="text-[12px] font-semibold line-clamp-1 mt-1">
                      @{m.fromUsername || "unknown"}
                    </div>
                    <div
                      className="text-[11px] line-clamp-2 mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {m.commentText || m.mediaCaption || "(no text)"}
                    </div>
                    <div
                      className="text-[9.5px] mt-1"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {ago(m.ts)}
                    </div>
                  </div>
                </motion.button>
              );
            })}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pt-3 pb-3 space-y-1.5">
          {posts.length === 0 && (
            <div
              className="text-[12px] text-center py-10"
              style={{ color: "var(--text-subtle)" }}
            >
              No posts. Hit Sync above.
            </div>
          )}
          {posts.map((p) => {
            const pend = clars.filter((c) => c.postId === p.id).length;
            const hasCtx = !!(p.notes || p.links?.length || p.qa.length);
            const active = p.id === selPost;
            return (
              <motion.button
                key={p.id}
                layout
                onClick={() => onSelectPost(p.id)}
                whileTap={{ scale: 0.98 }}
                className="w-full text-left rounded-2xl p-2.5 flex items-center gap-2.5 transition-colors"
                style={
                  active
                    ? {
                        background: "var(--bg-elev)",
                        boxShadow: "var(--shadow-card)",
                        border:
                          "1px solid color-mix(in srgb, var(--accent) 34%, transparent)",
                      }
                    : {
                        background: "transparent",
                        border: "1px solid transparent",
                      }
                }
              >
                <div
                  className="w-12 h-12 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ background: "var(--bg-inset)" }}
                >
                  {p.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span
                      className="text-[8px] font-bold"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {p.mediaType?.slice(0, 4)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold line-clamp-1">
                    {stripTags(p.caption) || "(no caption)"}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {hasCtx && (
                      <span
                        className="text-[9.5px] px-1.5 py-0.5 rounded font-semibold"
                        style={{
                          background: "var(--accent-soft)",
                          color: "var(--accent-deep)",
                        }}
                      >
                        ✓ context
                      </span>
                    )}
                    {pend > 0 && (
                      <span
                        className="text-[9.5px] px-1.5 py-0.5 rounded font-semibold"
                        style={{
                          background: "var(--accent)",
                          color: "var(--accent-fg)",
                        }}
                      >
                        {pend} ask{pend === 1 ? "" : "s"}
                      </span>
                    )}
                    <span
                      className="text-[9.5px]"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {new Date(p.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PaneTab({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge: number;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 h-9 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
      style={
        active
          ? {
              background: "var(--accent)",
              color: "var(--accent-fg)",
              boxShadow: "var(--shadow-card)",
            }
          : { color: "var(--text-muted)" }
      }
    >
      {icon}
      {label}
      <span className="opacity-70 tabular-nums">{badge}</span>
    </button>
  );
}

// ── center stage — inbox triage ──────────────────────────────────────────
function Stage({
  item,
  index,
  total,
  postInfo,
  onNext,
  onOpenPost,
  reload,
}: {
  item: QItem | null;
  index: number;
  total: number;
  postInfo: (id?: string) => PostInfoT | undefined;
  onNext: () => void;
  onOpenPost: (id: string) => void;
  reload: () => Promise<void>;
}) {
  if (!item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center"
          style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
        >
          <Check size={28} />
        </div>
        <div className="display" style={{ fontSize: 24 }}>
          All clear
        </div>
        <p className="text-[12.5px]" style={{ color: "var(--text-subtle)" }}>
          Nothing needs you right now. Mira is on it.
        </p>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-[680px] mx-auto px-8 py-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRING}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11.5px]" style={{ color: "var(--text-muted)" }}>
                {index + 1} of {total} ·{" "}
                {item.type === "draft" ? "draft to review" : "needs your answer"} ·{" "}
                {ago(item.at)}
              </span>
              <span
                className="ml-auto text-[10px] flex items-center gap-1"
                style={{ color: "var(--text-subtle)" }}
              >
                <Kbd>J</Kbd>
                <Kbd>K</Kbd>
                to navigate
              </span>
            </div>

            {item.type === "draft" ? (
              <DraftStage
                key={item.draft.id}
                draft={item.draft}
                post={postInfo(item.draft.postId)}
                onNext={onNext}
                onOpenPost={onOpenPost}
                reload={reload}
              />
            ) : (
              <ClarStage
                key={item.clar.id}
                clar={item.clar}
                post={postInfo(item.clar.postId)}
                onNext={onNext}
                onOpenPost={onOpenPost}
                reload={reload}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

type PostInfoT = {
  caption: string;
  thumb?: string;
  permalink?: string;
  comments: number;
};

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold"
      style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
    >
      {children}
    </span>
  );
}

function PostCard({
  post,
  postId,
  onOpenPost,
}: {
  post?: PostInfoT;
  postId?: string;
  onOpenPost?: (id: string) => void;
}) {
  if (!post) return null;
  const tags = hashtags(post.caption);
  const title = stripTags(post.caption) || "Untitled post";
  return (
    <div
      className="rounded-2xl p-3.5 flex items-center gap-3.5 mb-4"
      style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <button
        onClick={() => postId && onOpenPost?.(postId)}
        className="w-16 h-16 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
        style={{ background: "var(--bg-inset)" }}
        title="Open post"
      >
        {post.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.thumb}
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            className="text-[9px] font-bold tracking-widest"
            style={{ color: "var(--text-subtle)" }}
          >
            POST
          </span>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold leading-snug line-clamp-1">
          {title}
        </div>
        {tags.length > 0 && (
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {tags.map((t) => (
              <span
                key={t}
                className="text-[10.5px] font-semibold"
                style={{ color: "var(--accent)" }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="text-[11px] mt-1" style={{ color: "var(--text-subtle)" }}>
          💬 {post.comments} comment{post.comments === 1 ? "" : "s"} cached
        </div>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        {postId && onOpenPost && (
          <button
            onClick={() => onOpenPost(postId)}
            className="h-8 px-3 rounded-xl text-[11.5px] font-semibold flex items-center gap-1.5"
            style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
          >
            Manage
          </button>
        )}
        {post.permalink && (
          <a
            href={post.permalink}
            target="_blank"
            rel="noreferrer"
            className="h-8 px-3 rounded-xl text-[11.5px] font-semibold flex items-center gap-1.5"
            style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
          >
            <ExternalLink size={12} /> open
          </a>
        )}
      </div>
    </div>
  );
}

function CommentBlock({
  username,
  text,
  at,
}: {
  username: string;
  text: string;
  at: number;
}) {
  return (
    <div className="flex items-start gap-3 mb-3">
      <Avatar name={username} size={34} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold">@{username}</span>
          <span className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
            {ago(at)}
          </span>
        </div>
        <div className="text-[14px] mt-0.5 leading-snug">{text}</div>
      </div>
    </div>
  );
}

function DraftStage({
  draft,
  post,
  onNext,
  onOpenPost,
  reload,
}: {
  draft: Draft;
  post?: PostInfoT;
  onNext: () => void;
  onOpenPost: (id: string) => void;
  reload: () => Promise<void>;
}) {
  const [text, setText] = useState(draft.draftText);
  const [busy, setBusy] = useState<null | "send" | "rewrite">(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  async function approve() {
    if (busy || !text.trim()) return;
    setBusy("send");
    await fetch(`/api/ig/drafts/${draft.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", text }),
    }).catch(() => {});
    await reload();
    setBusy(null);
  }
  async function rewrite() {
    if (busy) return;
    setBusy("rewrite");
    await fetch(`/api/ig/drafts/${draft.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    }).catch(() => {});
    await fetch("/api/ig/reprocess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: draft.threadOrMediaId }),
    }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1400));
    await reload();
    setBusy(null);
  }

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div>
      <PostCard post={post} postId={draft.postId} onOpenPost={onOpenPost} />
      <CommentBlock
        username={draft.fromUsername || draft.fromUserId.slice(0, 8)}
        text={draft.inboundText}
        at={draft.createdAt}
      />

      <div
        className="rounded-2xl p-4 ml-[46px]"
        style={{
          background: "var(--accent-soft)",
          border: "1px solid color-mix(in srgb, var(--accent) 26%, transparent)",
        }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={12} style={{ color: "var(--accent-deep)" }} />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.1em]"
            style={{ color: "var(--accent-deep)" }}
          >
            Mira drafts
          </span>
          <span
            className="ml-auto text-[10px] capitalize"
            style={{ color: "var(--text-muted)" }}
          >
            {draft.intent.replace(/_/g, " ")}
          </span>
        </div>
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="w-full bg-transparent text-[15px] leading-relaxed outline-none resize-none font-medium"
        />
        <div className="text-[10.5px] mt-1" style={{ color: "var(--text-muted)" }}>
          {text.length} chars · {words} word{words === 1 ? "" : "s"}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 ml-[46px]">
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          onClick={approve}
          disabled={!!busy || !text.trim()}
          className="h-11 px-5 rounded-2xl text-[13.5px] font-bold flex items-center gap-2 disabled:opacity-50"
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          {busy === "send" ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}
          Approve &amp; send
        </motion.button>
        <ActionBtn onClick={rewrite} disabled={!!busy}>
          {busy === "rewrite" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RotateCcw size={13} />
          )}
          Rewrite
        </ActionBtn>
        <ActionBtn onClick={() => ref.current?.focus()} disabled={!!busy}>
          <Pencil size={13} /> Edit
        </ActionBtn>
        <button
          onClick={onNext}
          disabled={!!busy}
          className="ml-auto text-[12px] font-semibold flex items-center gap-1 disabled:opacity-50"
          style={{ color: "var(--text-muted)" }}
        >
          Skip for now <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

function ClarStage({
  clar,
  post,
  onNext,
  onOpenPost,
  reload,
}: {
  clar: Clar;
  post?: PostInfoT;
  onNext: () => void;
  onOpenPost: (id: string) => void;
  reload: () => Promise<void>;
}) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy || !answer.trim()) return;
    setBusy(true);
    await fetch(`/api/ig/clarifications/${clar.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "answer", answer: answer.trim() }),
    }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));
    await reload();
    setBusy(false);
  }
  async function dismiss() {
    if (busy) return;
    setBusy(true);
    await fetch(`/api/ig/clarifications/${clar.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "skip" }),
    }).catch(() => {});
    await reload();
    setBusy(false);
  }

  return (
    <div>
      <PostCard post={post} postId={clar.postId} onOpenPost={onOpenPost} />
      <CommentBlock
        username={clar.fromUsername || clar.fromUserId.slice(0, 8)}
        text={clar.commentText}
        at={clar.createdAt}
      />

      <div
        className="rounded-2xl p-4 ml-[46px]"
        style={{
          background: "var(--accent-soft)",
          border: "1px solid color-mix(in srgb, var(--accent) 26%, transparent)",
        }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <HelpCircle size={12} style={{ color: "var(--accent-deep)" }} />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.1em]"
            style={{ color: "var(--accent-deep)" }}
          >
            Mira needs you
          </span>
        </div>
        <div className="text-[14px] font-semibold leading-snug">
          {clar.question}
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          rows={2}
          autoFocus
          placeholder={
            clar.kind === "link" ? "Paste the link…" : "Type the answer…"
          }
          className="w-full mt-2.5 px-3 py-2.5 rounded-xl bg-transparent text-[14px] outline-none resize-none"
          style={{
            border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
          }}
        />
      </div>

      <div className="flex items-center gap-2 mt-4 ml-[46px]">
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          onClick={submit}
          disabled={busy || !answer.trim()}
          className="h-11 px-5 rounded-2xl text-[13.5px] font-bold flex items-center gap-2 disabled:opacity-50"
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          {busy ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Check size={15} />
          )}
          Save &amp; let Mira reply
        </motion.button>
        <ActionBtn onClick={dismiss} disabled={busy}>
          Dismiss
        </ActionBtn>
        <button
          onClick={onNext}
          disabled={busy}
          className="ml-auto text-[12px] font-semibold flex items-center gap-1 disabled:opacity-50"
          style={{ color: "var(--text-muted)" }}
        >
          Skip for now <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className="h-11 px-3.5 rounded-2xl text-[12.5px] font-semibold flex items-center gap-1.5 disabled:opacity-50"
      style={{
        background: "var(--bg-elev)",
        color: "var(--text-muted)",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </motion.button>
  );
}

// ── center stage — post detail ───────────────────────────────────────────
function PostStage({
  post,
  clars,
  comments,
  loading,
  reload,
}: {
  post: Post | null;
  clars: Clar[];
  comments: Row[];
  loading: boolean;
  reload: () => Promise<void>;
}) {
  const [notes, setNotes] = useState(post?.notes || "");
  const [busy, setBusy] = useState(false);
  const [insBusy, setInsBusy] = useState(false);
  const [insights, setInsights] = useState<Insights | undefined>(post?.insights);
  const [paraOpen, setParaOpen] = useState(false);
  const [paragraph, setParagraph] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [replyAllBusy, setReplyAllBusy] = useState(false);
  const [replyAllResult, setReplyAllResult] = useState<string | null>(null);

  async function stopReplyAll() {
    await fetch(`/api/ig/posts/${post?.id}/reply-all/stop`, { method: "POST" }).catch(() => {});
  }
  const [commentPage, setCommentPage] = useState(0);
  const COMMENTS_PER_PAGE = 10;

  useEffect(() => {
    setNotes(post?.notes || "");
    setInsights(post?.insights);
    setParaOpen(false);
    setAddOpen(false);
    setCommentPage(0);
  }, [post?.id, post?.notes, post?.insights]);

  if (!post) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center"
          style={{ background: "var(--accent-soft)", color: "var(--accent-deep)" }}
        >
          <Images size={28} />
        </div>
        <div className="display" style={{ fontSize: 24 }}>
          No post selected
        </div>
        <p className="text-[12.5px]" style={{ color: "var(--text-subtle)" }}>
          Pick a post on the left to add links and context.
        </p>
      </div>
    );
  }

  async function save() {
    if (!post) return;
    setBusy(true);
    await fetch(`/api/ig/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    }).catch(() => {});
    setBusy(false);
    toast.success("Notes saved");
    await reload();
  }
  async function fetchInsights() {
    if (!post) return;
    setInsBusy(true);
    const r = await fetch(`/api/ig/posts/${post.id}/insights`)
      .then((r) => r.json())
      .catch(() => ({}));
    setInsights(r.insights);
    setInsBusy(false);
  }
  async function extract() {
    if (!post || !paragraph.trim()) return;
    setExtracting(true);
    const r = await fetch(`/api/ig/posts/${post.id}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paragraph: paragraph.trim() }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    setExtracting(false);
    setParaOpen(false);
    setParagraph("");
    if (r.post) {
      toast.success(`Extracted ${r.extracted?.links?.length || 0} link(s)`);
      await reload();
    }
  }
  async function addLink(l: { label: string; url: string; type: string }) {
    if (!post) return;
    await fetch(`/api/ig/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addLink: l }),
    }).catch(() => {});
    setAddOpen(false);
    toast.success("Link added");
    await reload();
  }
  async function removeLink(id: string) {
    if (!post) return;
    await fetch(`/api/ig/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeLink: id }),
    }).catch(() => {});
    await reload();
  }

  async function replyAll() {
    if (!post) return;
    setReplyAllBusy(true);
    setReplyAllResult(null);
    try {
      const r = await fetch(`/api/ig/posts/${post.id}/reply-all`, { method: "POST" });
      const j = (await r.json()) as { processed?: number; replied?: number; skipped?: number; error?: string };
      if (j.error) {
        setReplyAllResult(`Error: ${j.error}`);
        toast.error(j.error);
      } else {
        const msg = `Replied to ${j.replied ?? 0}, skipped ${j.skipped ?? 0} of ${j.processed ?? 0} comments`;
        setReplyAllResult(msg);
        toast.success(msg);
      }
    } catch (e) {
      const msg = `Failed: ${e instanceof Error ? e.message : String(e)}`;
      setReplyAllResult(msg);
      toast.error(msg);
    }
    setReplyAllBusy(false);
  }

  const tags = hashtags(post.caption);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-[680px] mx-auto px-8 py-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRING}
          >
            {/* hero */}
            <div
              className="rounded-3xl overflow-hidden mb-5"
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              {post.thumbnailUrl && (
                <div
                  className="w-full flex items-center justify-center"
                  style={{ background: "var(--bg-inset)", maxHeight: 300 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.thumbnailUrl}
                    alt=""
                    className="w-full object-contain"
                    style={{ maxHeight: 300 }}
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[16px] font-bold leading-snug">
                      {stripTags(post.caption) || "Untitled post"}
                    </div>
                    {tags.length > 0 && (
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="text-[11px] font-semibold"
                            style={{ color: "var(--accent)" }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div
                      className="text-[11px] mt-1.5"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {new Date(post.timestamp).toLocaleDateString()} ·{" "}
                      {post.mediaType}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <div className="flex gap-1.5">
                      <button
                        onClick={replyAll}
                        disabled={replyAllBusy}
                        className="h-8 px-3 rounded-xl text-[11.5px] font-semibold flex items-center gap-1.5"
                        style={{
                          background: replyAllBusy ? "var(--bg-inset)" : "var(--accent-soft)",
                          color: replyAllBusy ? "var(--text-subtle)" : "var(--accent-deep)",
                          cursor: replyAllBusy ? "not-allowed" : "pointer",
                        }}
                      >
                        {replyAllBusy ? (
                          <><Loader2 size={11} className="animate-spin" /> Replying…</>
                        ) : (
                          <><Send size={11} /> Reply all</>
                        )}
                      </button>
                      {replyAllBusy && (
                        <button
                          onClick={stopReplyAll}
                          className="h-8 px-3 rounded-xl text-[11.5px] font-semibold flex items-center gap-1"
                          style={{ background: "color-mix(in srgb, #b3402e 15%, transparent)", color: "#c0392b" }}
                        >
                          Stop
                        </button>
                      )}
                    </div>
                    {post.permalink && (
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="h-8 px-3 rounded-xl text-[11.5px] font-semibold flex items-center gap-1.5"
                        style={{
                          background: "var(--bg-inset)",
                          color: "var(--text-muted)",
                        }}
                      >
                        <ExternalLink size={12} /> open
                      </a>
                    )}
                    {replyAllResult && (
                      <p className="text-[10.5px] text-center max-w-[120px]" style={{ color: "var(--text-subtle)" }}>
                        {replyAllResult}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* insights */}
            <Section
              title="Insights"
              action={
                <button
                  onClick={fetchInsights}
                  disabled={insBusy}
                  className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
                >
                  {insBusy ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <RefreshCw size={11} />
                  )}
                  {insights ? "refresh" : "fetch"}
                </button>
              }
            >
              {insights ? (
                <div className="grid grid-cols-3 gap-2">
                  <InsightStat icon={<Heart size={12} />} label="Likes" v={insights.likes} />
                  <InsightStat icon={<MessageCircle size={12} />} label="Comments" v={insights.comments} />
                  <InsightStat icon={<Bookmark size={12} />} label="Saved" v={insights.saved} />
                  <InsightStat icon={<Share2 size={12} />} label="Shares" v={insights.shares} />
                  <InsightStat icon={<Eye size={12} />} label="Reach" v={insights.reach} />
                  {insights.plays !== undefined && (
                    <InsightStat icon={<PlayCircle size={12} />} label="Plays" v={insights.plays} />
                  )}
                </div>
              ) : (
                <Muted>Fetch to load reach, likes and saves.</Muted>
              )}
            </Section>

            {/* owner notes */}
            <Section
              title="Owner notes"
              action={
                <button
                  onClick={() => setParaOpen((o) => !o)}
                  className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
                >
                  <Wand2 size={11} /> paragraph → extract
                </button>
              }
            >
              <AnimatePresence>
                {paraOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-2.5"
                  >
                    <textarea
                      value={paragraph}
                      onChange={(e) => setParagraph(e.target.value)}
                      rows={3}
                      placeholder="Paste a paragraph — 'Shot at Munnar tea estates on a KTM Duke 390 at sunrise. Song: Tum Hi Ho. Maps: https://...'"
                      className="w-full px-3 py-2.5 rounded-xl bg-transparent text-[13px] outline-none resize-y"
                      style={{ border: "1px solid var(--border-strong)" }}
                    />
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={extract}
                      disabled={extracting || !paragraph.trim()}
                      className="mt-2 h-9 px-3.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 disabled:opacity-40"
                      style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                    >
                      {extracting ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Wand2 size={12} />
                      )}
                      Extract
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Free-form notes — Mira uses these to answer comments on this post."
                className="w-full px-3 py-2.5 rounded-xl bg-transparent text-[13.5px] outline-none resize-y"
                style={{ border: "1px solid var(--border-strong)" }}
              />
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={save}
                disabled={busy || notes === post.notes}
                className="mt-2 h-9 px-3.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 disabled:opacity-40"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                {busy ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Save size={12} />
                )}
                Save notes
              </motion.button>
            </Section>

            {/* link vault */}
            <Section
              title={`Link vault · ${post.links?.length || 0}`}
              action={
                <button
                  onClick={() => setAddOpen((o) => !o)}
                  className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                >
                  <Plus size={11} /> add link
                </button>
              }
            >
              <AnimatePresence>
                {addOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-2.5"
                  >
                    <AddLinkForm onAdd={addLink} onCancel={() => setAddOpen(false)} />
                  </motion.div>
                )}
              </AnimatePresence>
              {(post.links || []).length === 0 && !addOpen && (
                <Muted>
                  No links yet. Add location / song / gear URLs — Mira DMs them
                  when someone asks on this post.
                </Muted>
              )}
              <div className="space-y-1.5">
                {(post.links || []).map((l) => (
                  <div
                    key={l.id}
                    className="group flex items-center gap-2.5 rounded-xl px-3 py-2"
                    style={{
                      background: "var(--bg-elev)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <LinkIcon size={13} style={{ color: "var(--accent)" }} />
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-semibold capitalize"
                      style={{
                        background: "var(--accent-soft)",
                        color: "var(--accent-deep)",
                      }}
                    >
                      {l.type}
                    </span>
                    <span className="text-[12.5px] font-medium flex-1 truncate">
                      {l.label}
                    </span>
                    {l.url && (
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                    <button
                      onClick={() => removeLink(l.id)}
                      className="opacity-0 group-hover:opacity-100 transition"
                      style={{ color: "var(--text-muted)" }}
                      aria-label="Remove link"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </Section>

            {/* open clarifications on this post */}
            {clars.length > 0 && (
              <Section title="Mira needs your input">
                <div className="space-y-2">
                  {clars.map((c) => (
                    <MiniClar key={c.id} clar={c} reload={reload} />
                  ))}
                </div>
              </Section>
            )}

            {/* knowledge */}
            <Section title={`Knowledge · ${post.qa.length}`}>
              {post.qa.length === 0 ? (
                <Muted>
                  Nothing learned yet. Answers Mira learns get saved here.
                </Muted>
              ) : (
                <div className="space-y-1.5">
                  {post.qa
                    .slice()
                    .reverse()
                    .map((qa, i) => (
                      <div
                        key={i}
                        className="rounded-xl px-3 py-2.5"
                        style={{
                          background: "var(--bg-elev)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          className="text-[11px] font-semibold mb-0.5"
                          style={{ color: "var(--text-subtle)" }}
                        >
                          {qa.q}
                        </div>
                        <div className="text-[13px]">{qa.a}</div>
                      </div>
                    ))}
                </div>
              )}
            </Section>

            {/* comments — paginated */}
            {(() => {
              const sorted = comments.slice().sort((a, b) => b.ts - a.ts);
              const totalPages = Math.ceil(sorted.length / COMMENTS_PER_PAGE);
              const page = Math.min(commentPage, Math.max(0, totalPages - 1));
              const pageComments = sorted.slice(page * COMMENTS_PER_PAGE, (page + 1) * COMMENTS_PER_PAGE);
              return (
                <Section title={`Comments · ${comments.length}`}>
                  {loading && comments.length === 0 ? (
                    <Muted>Loading comments…</Muted>
                  ) : comments.length === 0 ? (
                    <Muted>No comments on this post yet.</Muted>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {pageComments.map((c) => (
                          <CommentRow key={c.id} c={c} />
                        ))}
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                          <button
                            onClick={() => setCommentPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="h-8 px-3 rounded-xl text-[12px] font-semibold disabled:opacity-30"
                            style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
                          >
                            ← Prev
                          </button>
                          <span className="text-[11.5px]" style={{ color: "var(--text-subtle)" }}>
                            {page + 1} / {totalPages}
                          </span>
                          <button
                            onClick={() => setCommentPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page === totalPages - 1}
                            className="h-8 px-3 rounded-xl text-[12px] font-semibold disabled:opacity-30"
                            style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
                          >
                            Next →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </Section>
              );
            })()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center mb-2">
        <span
          className="text-[10.5px] font-bold uppercase tracking-[0.09em]"
          style={{ color: "var(--text-subtle)" }}
        >
          {title}
        </span>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] leading-5" style={{ color: "var(--text-subtle)" }}>
      {children}
    </div>
  );
}

function CommentRow({ c }: { c: Row }) {
  const uname = c.fromUsername || c.fromUserId.slice(0, 8);
  const reply = c.ownReply?.text || (c.status === "pending" ? c.draftText : "");
  const badge =
    c.status === "replied"
      ? { label: "replied", soft: false }
      : c.status === "needs_info"
      ? { label: "needs you", soft: true }
      : c.status === "pending"
      ? { label: "draft", soft: true }
      : null;
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={uname} size={28} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-bold truncate">@{uname}</span>
            {c.isSuperfan && (
              <span style={{ color: "var(--accent)" }} title="Top commenter">
                ★
              </span>
            )}
            <span
              className="text-[10px] shrink-0"
              style={{ color: "var(--text-subtle)" }}
            >
              {ago(c.ts)}
            </span>
            {badge && (
              <span
                className="ml-auto text-[9.5px] px-1.5 py-0.5 rounded font-semibold shrink-0"
                style={
                  badge.soft
                    ? {
                        background: "var(--accent-soft)",
                        color: "var(--accent-deep)",
                      }
                    : {
                        background: "var(--bg-inset)",
                        color: "var(--text-muted)",
                      }
                }
              >
                {badge.label}
              </span>
            )}
          </div>
          <div className="text-[13px] mt-0.5 leading-snug">{c.text}</div>
          {reply && (
            <div className="flex items-start gap-1.5 mt-1.5">
              <Sparkles
                size={11}
                className="mt-[3px] shrink-0"
                style={{ color: "var(--accent)" }}
              />
              <span
                className="text-[12px] leading-snug font-medium"
                style={{ color: "var(--accent-deep)" }}
              >
                {reply}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightStat({
  icon,
  label,
  v,
}: {
  icon: React.ReactNode;
  label: string;
  v?: number;
}) {
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}
    >
      <div
        className="text-[10px] flex items-center gap-1"
        style={{ color: "var(--text-subtle)" }}
      >
        {icon}
        {label}
      </div>
      <div className="text-[17px] font-bold tabular-nums mt-0.5">
        {v != null ? v.toLocaleString() : "—"}
      </div>
    </div>
  );
}

function AddLinkForm({
  onAdd,
  onCancel,
}: {
  onAdd: (l: { label: string; url: string; type: string }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<string>("location");
  const ok = label.trim() && url.trim();
  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}
    >
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label — e.g. Munnar tea estate"
        className="w-full h-9 px-3 rounded-lg bg-transparent text-[13px] outline-none"
        style={{ border: "1px solid var(--border-strong)" }}
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…"
        className="w-full h-9 px-3 rounded-lg bg-transparent text-[13px] outline-none"
        style={{ border: "1px solid var(--border-strong)" }}
      />
      <div className="flex items-center gap-1.5 flex-wrap">
        {LINK_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className="h-7 px-2.5 rounded-lg text-[11px] font-semibold capitalize transition-colors"
            style={
              type === t
                ? { background: "var(--accent)", color: "var(--accent-fg)" }
                : { background: "var(--bg-inset)", color: "var(--text-muted)" }
            }
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => ok && onAdd({ label: label.trim(), url: url.trim(), type })}
          disabled={!ok}
          className="h-9 px-3.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          <Plus size={12} /> Add link
        </motion.button>
        <button
          onClick={onCancel}
          className="h-9 px-3 rounded-xl text-[12px] font-semibold"
          style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function MiniClar({
  clar,
  reload,
}: {
  clar: Clar;
  reload: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function answer() {
    if (!text.trim() || busy) return;
    setBusy(true);
    await fetch(`/api/ig/clarifications/${clar.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "answer", answer: text.trim() }),
    }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1000));
    await reload();
    setBusy(false);
  }
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}
    >
      <div className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
        @{clar.fromUsername || clar.fromUserId.slice(0, 6)}: “{clar.commentText}”
      </div>
      <div className="text-[12.5px] font-semibold mt-0.5 mb-2">
        {clar.question}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && answer()}
          placeholder={clar.kind === "link" ? "Paste link…" : "Answer…"}
          className="flex-1 h-9 px-3 rounded-lg bg-transparent text-[12.5px] outline-none"
          style={{ border: "1px solid var(--border-strong)" }}
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={answer}
          disabled={busy || !text.trim()}
          className="h-9 px-3 rounded-lg text-[12px] font-bold flex items-center gap-1 disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
        </motion.button>
      </div>
    </div>
  );
}

// the reply / status line under a comment in the shift feed
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

// ── brain panel — live tool latency + breaker state ─────────────────────
function BrainPanel({
  open,
  stats,
  tools,
  onClose,
}: {
  open: boolean;
  stats: {
    tool: string;
    count: number;
    errorRate: number;
    p50: number;
    p95: number;
    open: boolean;
  }[];
  tools: { name: string; description: string }[];
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={SPRING}
          className="absolute z-20 right-4 top-16 w-[420px] rounded-2xl overflow-hidden"
          style={{
            background: "var(--bg-elev)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <Activity size={14} />
              <span className="text-[13px] font-bold">Brain MCP</span>
              <span
                className="text-[10.5px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent-deep)",
                }}
              >
                {tools.length} tools
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-[11px] font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              close
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            <div
              className="grid grid-cols-[1fr_60px_60px_50px_50px] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider font-semibold border-b"
              style={{ borderColor: "var(--border)", color: "var(--text-subtle)" }}
            >
              <span>tool</span>
              <span className="text-right">p50ms</span>
              <span className="text-right">p95ms</span>
              <span className="text-right">err</span>
              <span className="text-right">n</span>
            </div>

            {stats.length === 0 ? (
              <div
                className="px-4 py-6 text-[12px] text-center"
                style={{ color: "var(--text-subtle)" }}
              >
                No calls yet. Send a comment to populate.
              </div>
            ) : (
              stats.map((s) => (
                <div
                  key={s.tool}
                  className="grid grid-cols-[1fr_60px_60px_50px_50px] gap-2 px-4 py-2 text-[11.5px] items-center"
                  style={{
                    borderTop: "1px solid var(--border)",
                    opacity: s.open ? 0.5 : 1,
                  }}
                >
                  <span className="font-mono truncate">
                    {s.tool}
                    {s.open && (
                      <span
                        className="ml-2 text-[9.5px] px-1 py-0.5 rounded font-bold uppercase"
                        style={{ background: "#7a1f1f", color: "#fff" }}
                      >
                        open
                      </span>
                    )}
                  </span>
                  <span className="text-right tabular-nums">{s.p50}</span>
                  <span className="text-right tabular-nums">{s.p95}</span>
                  <span
                    className="text-right tabular-nums"
                    style={{
                      color:
                        s.errorRate > 0 ? "#d97757" : "var(--text-subtle)",
                    }}
                  >
                    {(s.errorRate * 100).toFixed(0)}%
                  </span>
                  <span
                    className="text-right tabular-nums"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    {s.count}
                  </span>
                </div>
              ))
            )}

            <div
              className="px-4 py-3 border-t text-[10.5px]"
              style={{ borderColor: "var(--border)", color: "var(--text-subtle)" }}
            >
              Available tools:{" "}
              {tools.map((t) => t.name).join(" · ")}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── mention stage — post-style listing of every mention/tag ──────────────
function MentionStage({
  mention,
  mentions,
  refreshing,
  onRefresh,
  onSelectMention,
}: {
  mention: Mention | null;
  mentions: Mention[];
  refreshing: boolean;
  onRefresh: () => void;
  onSelectMention: (id: string) => void;
}) {
  const list = mentions.slice().sort((a, b) => b.ts - a.ts);
  if (mention) {
    return (
      <MentionDetail mention={mention} onBack={() => onSelectMention("")} />
    );
  }
  const totalLikes = list.reduce((a, m) => a + (m.likeCount || 0), 0);
  const totalComments = list.reduce((a, m) => a + (m.commentsCount || 0), 0);
  const uniqueAuthors = new Set(list.map((m) => m.fromUsername).filter(Boolean))
    .size;

  return (
    <div
      className="flex-1 min-w-0 flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div>
          <div className="text-[15px] font-bold flex items-center gap-2">
            <AtSign size={16} />
            Mentions
          </div>
          <div
            className="text-[11.5px] mt-0.5"
            style={{ color: "var(--text-subtle)" }}
          >
            Posts that @-mention or photo-tag your account.
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          disabled={refreshing}
          className="h-9 px-3 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 disabled:opacity-60"
          style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
        >
          {refreshing ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
          Refresh
        </motion.button>
      </div>

      <div
        className="flex items-center gap-6 px-6 py-3 border-b text-[12px]"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-elev)",
        }}
      >
        <Stat n={list.length} label="mentions" />
        <Stat n={uniqueAuthors} label="accounts" />
        <Stat n={totalLikes} label="likes" />
        <Stat n={totalComments} label="comments" />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {list.length === 0 ? (
          <div
            className="h-full flex items-center justify-center text-[12.5px]"
            style={{ color: "var(--text-subtle)" }}
          >
            No mentions yet. Hit Refresh.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map((m) => (
              <MentionCard
                key={m.id}
                m={m}
                onClick={() => onSelectMention(m.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MentionCard({ m, onClick }: { m: Mention; onClick: () => void }) {
  const label =
    m.kind === "comment"
      ? "comment"
      : m.kind === "caption"
      ? "caption"
      : "photo tag";
  return (
    <motion.button
      layout
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="text-left rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "var(--bg-elev)",
        boxShadow: "var(--shadow-card)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="aspect-square w-full overflow-hidden relative"
        style={{ background: "var(--bg-inset)" }}
      >
        {m.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <AtSign size={22} style={{ color: "var(--text-subtle)" }} />
          </div>
        )}
        <span
          className="absolute top-2 left-2 text-[9.5px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
          }}
        >
          {label}
        </span>
        {!m.read && (
          <span
            className="absolute top-2 right-2 w-2 h-2 rounded-full"
            style={{ background: "var(--accent)" }}
          />
        )}
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-bold truncate">
            @{m.fromUsername || "unknown"}
          </span>
          <span
            className="text-[10px] shrink-0"
            style={{ color: "var(--text-subtle)" }}
          >
            {ago(m.ts)}
          </span>
        </div>
        <div
          className="text-[11.5px] line-clamp-2"
          style={{ color: "var(--text-muted)" }}
        >
          {m.commentText || m.mediaCaption || "(no text)"}
        </div>
        <div
          className="flex items-center gap-3 text-[10.5px] pt-1"
          style={{ color: "var(--text-subtle)" }}
        >
          {typeof m.likeCount === "number" && (
            <span className="flex items-center gap-1">
              <Heart size={11} /> {m.likeCount}
            </span>
          )}
          {typeof m.commentsCount === "number" && (
            <span className="flex items-center gap-1">
              <MessageCircle size={11} /> {m.commentsCount}
            </span>
          )}
          {m.permalink && (
            <a
              href={m.permalink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ml-auto flex items-center gap-1"
              style={{ color: "var(--accent)" }}
            >
              open <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function MentionDetail({
  mention,
  onBack,
}: {
  mention: Mention;
  onBack: () => void;
}) {
  return (
    <div
      className="flex-1 min-w-0 flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          onClick={onBack}
          className="text-[12px] font-semibold flex items-center gap-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to mentions
        </button>
        {mention.permalink && (
          <a
            href={mention.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-semibold flex items-center gap-1.5"
            style={{ color: "var(--accent)" }}
          >
            Open on Instagram <ExternalLink size={12} />
          </a>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <span
              className="text-[10.5px] px-2 py-1 rounded-md font-semibold uppercase tracking-wide"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent-deep)",
              }}
            >
              {mention.kind === "comment"
                ? "comment mention"
                : mention.kind === "caption"
                ? "caption mention"
                : "photo tag"}
            </span>
            <span
              className="text-[11.5px]"
              style={{ color: "var(--text-subtle)" }}
            >
              {ago(mention.ts)}
            </span>
          </div>

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "var(--bg-elev)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            {mention.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mention.thumbnailUrl}
                alt=""
                className="w-full max-h-[520px] object-cover"
                referrerPolicy="no-referrer"
              />
            ) : null}
            <div className="p-5 space-y-3">
              <div className="text-[14px] font-bold">
                @{mention.fromUsername || "unknown"}
              </div>
              {mention.mediaCaption && (
                <div
                  className="text-[13px] whitespace-pre-wrap"
                  style={{ color: "var(--text-muted)" }}
                >
                  {mention.mediaCaption}
                </div>
              )}

              {mention.commentText && (
                <div
                  className="rounded-xl p-3 text-[12.5px]"
                  style={{
                    background: "var(--bg-inset)",
                    color: "var(--text)",
                  }}
                >
                  <div
                    className="text-[10px] uppercase tracking-wider mb-1 font-semibold"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    Comment
                  </div>
                  {mention.commentText}
                </div>
              )}

              <div
                className="flex items-center gap-5 pt-2 text-[12px]"
                style={{ color: "var(--text-subtle)" }}
              >
                {typeof mention.likeCount === "number" && (
                  <span className="flex items-center gap-1.5">
                    <Heart size={13} /> {mention.likeCount} likes
                  </span>
                )}
                {typeof mention.commentsCount === "number" && (
                  <span className="flex items-center gap-1.5">
                    <MessageCircle size={13} /> {mention.commentsCount} comments
                  </span>
                )}
                {mention.mediaType && (
                  <span
                    className="text-[10.5px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: "var(--bg-inset)" }}
                  >
                    {mention.mediaType}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── right shift feed — every comment on the account, live, with its reply ──
function ShiftFeed({
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
                    on “{stripTags(cap).slice(0, 28) || "post"}”
                  </div>
                )}
                <div
                  className="text-[11.5px] mt-1 line-clamp-2 italic"
                  style={{ color: "var(--text-muted)" }}
                >
                  “{c.text}”
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
