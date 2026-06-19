"use client";
// Inbox (spec Phase 1): unified inbox — DMs (thread list, window-aware composer,
// assign/notes/tags), Comments (cached comments + draft approval + manual reply),
// Mentions (tags/caption/comment mentions with read state). Tab state syncs with
// the sidebar sub-nav. Every list state: loading / empty / error.
import { useEffect, useMemo, useState } from "react";
import {
  Clock, Send, AlertTriangle, Inbox as InboxIcon, User, Tag, StickyNote, Sparkles,
  CheckCheck, Megaphone, MessagesSquare, MessageCircle, AtSign, RefreshCw, Star,
  ExternalLink, Check, X, CornerDownRight, Copy,
} from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  useConversations, useConversation, useSendReply, usePatchConversation, useCrmAnalytics,
  useComments, useReplyToComment, useDraftAction, useSyncDms, useInboxStream,
  useMentions, useRefreshMentions, useMarkMentionRead, useStatus, type IgStatus,
  type CrmConversationListItem, type CrmMessage,
} from "../lib/api/hooks";
import { api } from "../lib/api/client";
import { SkThreadRow, SkMessageBubble, SkCommentCard, SkMentionRow, SkRepeat } from "./skeleton";
import { Avatar, Segmented } from "./ui";

const FOLDERS = ["all", "primary", "general"] as const;
const TABS = [
  { id: "dms", label: "DMs", icon: <MessagesSquare size={12} /> },
  { id: "comments", label: "Comments", icon: <MessageCircle size={12} /> },
  { id: "mentions", label: "Mentions", icon: <AtSign size={12} /> },
] as const;
type InboxTab = (typeof TABS)[number]["id"];

function fmtAgo(ts: number | null | undefined): string {
  if (!ts) return "";
  const d = Date.now() - ts;
  if (d < 60_000) return "now";
  if (d < 3600_000) return `${Math.floor(d / 60_000)}m`;
  if (d < 86400_000) return `${Math.floor(d / 3600_000)}h`;
  return `${Math.floor(d / 86400_000)}d`;
}

function windowLeft(expiresAt: number | null, now: number): { label: string; open: boolean } {
  if (!expiresAt || expiresAt <= now) return { label: "window closed", open: false };
  const ms = expiresAt - now;
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return { label: h > 0 ? `${h}h ${m}m left` : `${m}m left`, open: true };
}

function Bubble({ m }: { m: CrmMessage }) {
  const mine = m.direction === "out";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} px-4 py-1`}>
      <div
        className="max-w-[70%] rounded-2xl px-3.5 py-2 text-[13px] leading-[1.45]"
        style={{
          background: mine ? "var(--accent)" : "var(--bg-elev)",
          color: mine ? "#fff" : "var(--text)",
          border: mine ? "none" : "1px solid var(--border)",
        }}
      >
        {m.body?.text || <span style={{ opacity: 0.6 }}>[{m.type}]</span>}
        <div className="text-[10px] mt-1 flex items-center gap-1" style={{ opacity: 0.65 }}>
          {mine ? (m.sent_by === "human" ? "you" : "mira") + " · " : ""}{fmtAgo(m.created_at)}
          {mine && m.seen_at && <CheckCheck size={10} style={{ color: "#7dd3fc" }} />}
        </div>
      </div>
    </div>
  );
}

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

// ── DMs (unchanged behaviour: threads / messages / detail rail) ──────────────
// Empty-inbox state with a guided live test: tells the owner exactly which
// handle to DM and gives a ready-to-send suggested message to copy.
function GuidedTestEmptyState({ syncing }: { syncing: boolean }) {
  const status = useStatus<IgStatus>();
  const username = status.data?.account?.username;
  const [copied, setCopied] = useState(false);
  const suggested = "Hey! Do you have the catalog?";
  const copy = () => {
    navigator.clipboard.writeText(suggested).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (syncing) {
    return (
      <div className="p-8 text-center text-xs flex flex-col items-center gap-2" style={{ color: "var(--text-subtle)" }}>
        <RefreshCw size={16} className="animate-spin" style={{ opacity: 0.6 }} />
        Loading your latest DMs from Instagram…
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col items-center gap-3 text-center">
      <InboxIcon size={20} style={{ opacity: 0.4, color: "var(--text-subtle)" }} />
      <div className="text-[12.5px] font-semibold" style={{ color: "var(--text)" }}>No conversations yet</div>
      <div className="text-[11px] leading-relaxed max-w-[230px]" style={{ color: "var(--text-subtle)" }}>
        Test it live — from another Instagram account, DM{" "}
        {username ? <b style={{ color: "var(--accent)" }}>@{username}</b> : "your connected account"} and it shows up here within seconds.
      </div>
      <div className="w-full rounded-xl p-3 mt-1" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
        <div className="text-[9px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-subtle)" }}>
          Suggested test message
        </div>
        <div className="text-[12.5px]" style={{ color: "var(--text)" }}>“{suggested}”</div>
        <button
          onClick={copy}
          className="mt-2.5 text-[10.5px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 mx-auto"
          style={{ background: copied ? "rgba(34,197,94,0.15)" : "var(--accent)", color: copied ? "#22c55e" : "#fff" }}
        >
          {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy message</>}
        </button>
      </div>
    </div>
  );
}

// module-level guard so the login DM import runs once per page load, not on
// every tab switch back to DMs
let dmSyncedThisSession = false;

function DmsTab() {
  const [folder, setFolder] = useState<(typeof FOLDERS)[number]>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // handoff from the Opportunities board → "Open in Inbox" stashes a conversation
  // id; pick it up once on mount and select that thread.
  useEffect(() => {
    try {
      const stashed = localStorage.getItem("mira_open_conversation");
      if (stashed) { setSelected(stashed); localStorage.removeItem("mira_open_conversation"); }
    } catch { /* ignore */ }
  }, []);

  const list = useConversations(folder === "all" ? undefined : folder);
  const analytics = useCrmAnalytics();
  const detail = useConversation(selected);
  const send = useSendReply();
  const patch = usePatchConversation();
  const syncDms = useSyncDms();
  // real-time: webhook → Redis → SSE → here. New DMs/drafts/sent replies push in
  // and refetch instantly (no waiting on the poll).
  const { connected: live } = useInboxStream();

  // on first inbox open after login, import the latest 50 DM threads from
  // Instagram so the inbox shows real history instead of an empty list
  useEffect(() => {
    if (dmSyncedThisSession) return;
    dmSyncedThisSession = true;
    syncDms.mutate(50);
  }, [syncDms]);

  const conversations = list.data?.conversations ?? [];
  const conv = detail.data?.conversation;
  const messages = detail.data?.messages ?? [];
  const win = useMemo(
    () => windowLeft(conv?.window_expires_at ?? null, now),
    [conv?.window_expires_at, now]
  );
  const haWin = useMemo(
    () => windowLeft(conv?.human_agent_window_expires_at ?? null, now),
    [conv?.human_agent_window_expires_at, now]
  );
  const canType = win.open || haWin.open;

  const doSend = async () => {
    if (!selected || !draft.trim() || send.isPending) return;
    try {
      await send.mutateAsync({ id: selected, text: draft.trim() });
      setDraft("");
    } catch {
      /* error surfaced below via send.error */
    }
  };

  return (
    <div className="flex-1 flex min-h-0">
      {/* ── thread list ── */}
      <div className="w-[300px] shrink-0 flex flex-col border-r" style={{ borderColor: "var(--border)" }}>
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold" style={{ color: "var(--text)" }}>Inbox</span>
              {/* real-time SSE link — green when connected; new DMs push in instantly */}
              <span
                className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: live ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.12)", color: live ? "#22c55e" : "var(--text-subtle)" }}
                title={live ? "Live — connected to the real-time stream; new DMs appear instantly" : "Reconnecting to the live stream…"}
              >
                <span style={{ width: 5, height: 5, borderRadius: 999, background: live ? "#22c55e" : "var(--text-subtle)", display: "inline-block" }} className={live ? "animate-pulse" : ""} /> {live ? "live" : "…"}
              </span>
            </div>
            <button
              onClick={() => syncDms.mutate(50)}
              disabled={syncDms.isPending}
              className="flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded-md disabled:opacity-50"
              style={{ background: "var(--bg-elev)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
              title="Import your latest 50 DM threads from Instagram"
            >
              <RefreshCw size={10} className={syncDms.isPending ? "animate-spin" : ""} />
              {syncDms.isPending ? "Syncing…" : "Sync"}
            </button>
          </div>
          {syncDms.isSuccess && (
            <div className="text-[9.5px] mt-0.5" style={{ color: "var(--text-subtle)" }}>
              pulling your latest DMs from Instagram…
            </div>
          )}
          {analytics.data && (
            <div className="flex gap-2 mt-1 text-[9.5px]" style={{ color: "var(--text-subtle)" }}>
              <span>
                avg response{" "}
                {analytics.data.avgResponseMs == null
                  ? "—"
                  : analytics.data.avgResponseMs < 3600_000
                    ? `${Math.round(analytics.data.avgResponseMs / 60_000)}m`
                    : `${(analytics.data.avgResponseMs / 3600_000).toFixed(1)}h`}
              </span>
              <span>·</span>
              <span>{analytics.data.leadsCaptured} leads captured</span>
            </div>
          )}
          <div className="mt-2">
            <Segmented
              size="sm"
              options={FOLDERS.map((f) => ({ id: f, label: f.charAt(0).toUpperCase() + f.slice(1) }))}
              value={folder}
              onChange={(f) => setFolder(f)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.isLoading && (
            <SkRepeat n={7}>{(i) => <SkThreadRow key={i} i={i} />}</SkRepeat>
          )}
          {list.isError && (
            <div className="p-6 text-center text-xs flex flex-col items-center gap-2" style={{ color: "#ef4444" }}>
              <AlertTriangle size={16} /> Failed to load. <button className="underline" onClick={() => list.refetch()}>Retry</button>
            </div>
          )}
          {!list.isLoading && !list.isError && conversations.length === 0 && (
            <GuidedTestEmptyState syncing={syncDms.isPending} />
          )}
          {conversations.map((c: CrmConversationListItem) => {
            const w = windowLeft(c.window_expires_at, now);
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className="w-full text-left px-4 py-2.5 flex gap-2.5 relative transition-colors"
                style={{ background: selected === c.id ? "var(--bg-inset)" : "transparent" }}
                onMouseEnter={(e) => { if (selected !== c.id) e.currentTarget.style.background = "var(--bg-inset)"; }}
                onMouseLeave={(e) => { if (selected !== c.id) e.currentTarget.style.background = "transparent"; }}
              >
                {selected === c.id && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full" style={{ background: "var(--accent)" }} />}
                <Avatar name={c.display_name || c.igsid} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-semibold truncate" style={{ color: "var(--text)" }}>
                      {c.display_name || c.igsid}
                    </span>
                    <span className="text-[10px] shrink-0 tabular-nums" style={{ color: "var(--text-subtle)" }}>{fmtAgo(c.updated_at)}</span>
                  </div>
                  <div className="text-[11.5px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {c.last_direction === "out" ? "↩ " : ""}{c.last_text || "—"}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock size={9} style={{ color: w.open ? "var(--st-done)" : "var(--text-subtle)" }} />
                    <span className="text-[9.5px]" style={{ color: w.open ? "var(--st-done)" : "var(--text-subtle)" }}>{w.label}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── message view ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-xs" style={{ color: "var(--text-subtle)" }}>
            Select a conversation
          </div>
        ) : detail.isLoading ? (
          <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-1">
            <SkRepeat n={6}>{(i) => <SkMessageBubble key={i} i={i} />}</SkRepeat>
          </div>
        ) : detail.isError || !conv ? (
          <div className="flex-1 flex items-center justify-center text-xs gap-2" style={{ color: "#ef4444" }}>
            <AlertTriangle size={14} /> Failed to load conversation.
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <div>
                <div className="text-[13px] font-bold" style={{ color: "var(--text)" }}>
                  {conv.display_name || conv.igsid}
                </div>
                <div className="flex items-center gap-2 text-[10.5px]" style={{ color: win.open ? "#22c55e" : "#ef4444" }}>
                  <Clock size={10} />
                  {win.open ? `24h window: ${win.label}` : haWin.open ? `human-agent window: ${haWin.label}` : "all windows closed"}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {conv.referral?.source && (
                  <span className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1" style={{ background: "rgba(168,85,247,0.12)", color: "#a855f7" }}>
                    <Megaphone size={9} /> via {conv.referral.source.toLowerCase()}
                  </span>
                )}
                <span className="text-[10px] px-2 py-1 rounded-full capitalize" style={{ background: "var(--bg-elev)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  {conv.ai_mode}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-3">
              {messages.length === 0 ? (
                <div className="p-8 text-center text-xs" style={{ color: "var(--text-subtle)" }}>No messages recorded yet.</div>
              ) : (
                messages.map((m) => <Bubble key={m.id} m={m} />)
              )}
            </div>

            {conv.ai_draft && (() => {
              const waiting = conv.pending_slot?.type === "disambiguate_resource";
              const conf = conv.ai_confidence != null ? Math.round(conv.ai_confidence * 100) : null;
              const riskColor = conv.ai_risk === "high" ? "#ef4444" : conv.ai_risk === "medium" ? "#f59e0b" : "#22c55e";
              return (
              <div className="mx-3 mb-1 rounded-lg p-3" style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
                    <Sparkles size={10} /> {waiting ? "Mira is asking which one" : "Mira's draft"}
                    {conf != null && (
                      <span className="px-1.5 py-px rounded-full font-bold" style={{ fontSize: 9, background: `${riskColor}1e`, color: riskColor }}>
                        {conf}%
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => setDraft(conv.ai_draft || "")}
                    className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    Use draft
                  </button>
                </div>
                <div className="text-[12px] leading-[1.45]" style={{ color: "var(--text)" }}>{conv.ai_draft}</div>
                {conv.ai_reason && (
                  <div className="mt-1.5 pt-1.5 text-[10px] leading-[1.4] flex items-start gap-1" style={{ color: "var(--text-subtle)", borderTop: "1px solid var(--border)" }}>
                    <span style={{ opacity: 0.6 }}>why:</span><span>{conv.ai_reason}</span>
                  </div>
                )}
              </div>
              );
            })()}
            <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
              {send.isError && (
                <div className="text-[11px] mb-2 px-1" style={{ color: "#ef4444" }}>
                  {(send.error as Error)?.message || "Send failed"}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && doSend()}
                  disabled={!canType || send.isPending}
                  placeholder={canType ? "Reply (sent as you — human)" : "Window closed — replies blocked by Meta policy"}
                  className="flex-1 rounded-lg px-3.5 py-2.5 text-[13px] outline-none"
                  style={{
                    background: "var(--bg-elev)", color: "var(--text)",
                    border: "1px solid var(--border)", opacity: canType ? 1 : 0.55,
                  }}
                />
                <button
                  onClick={doSend}
                  disabled={!canType || !draft.trim() || send.isPending}
                  className="rounded-lg px-4 flex items-center gap-1.5 text-[12.5px] font-semibold"
                  style={{
                    background: canType && draft.trim() ? "var(--accent)" : "var(--bg-elev)",
                    color: canType && draft.trim() ? "#fff" : "var(--text-subtle)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <Send size={13} /> {send.isPending ? "…" : "Send"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── detail rail: assign / tags / notes ── */}
      {selected && conv && (
        <div className="w-[240px] shrink-0 border-l p-4 flex flex-col gap-4 overflow-y-auto" style={{ borderColor: "var(--border)" }}>
          <div>
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-subtle)" }}>
              <User size={10} /> Assigned to
            </div>
            <input
              defaultValue={conv.assigned_to ?? ""}
              key={`assign-${conv.id}`}
              placeholder="unassigned"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (conv.assigned_to ?? "")) patch.mutate({ id: conv.id, patch: { assigned_to: v || null } });
              }}
              className="w-full rounded-lg px-2.5 py-1.5 text-[12px] outline-none"
              style={{ background: "var(--bg-elev)", color: "var(--text)", border: "1px solid var(--border)" }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-subtle)" }}>
              <Tag size={10} /> Folder
            </div>
            <select
              value={conv.folder}
              onChange={(e) => patch.mutate({ id: conv.id, patch: { folder: e.target.value } })}
              className="w-full rounded-lg px-2 py-1.5 text-[12px] outline-none"
              style={{ background: "var(--bg-elev)", color: "var(--text)", border: "1px solid var(--border)" }}
            >
              {FOLDERS.filter((f) => f !== "all").map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-subtle)" }}>
              <StickyNote size={10} /> Notes
            </div>
            <textarea
              defaultValue={conv.notes}
              key={`notes-${conv.id}`}
              placeholder="Private notes about this thread…"
              onBlur={(e) => {
                if (e.target.value !== conv.notes) patch.mutate({ id: conv.id, patch: { notes: e.target.value } });
              }}
              className="flex-1 min-h-[120px] rounded-lg px-2.5 py-2 text-[12px] outline-none resize-none"
              style={{ background: "var(--bg-elev)", color: "var(--text)", border: "1px solid var(--border)" }}
            />
            <div className="text-[9.5px] mt-1" style={{ color: "var(--text-subtle)" }}>saves on blur</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Comments tab ──────────────────────────────────────────────────────────────
type CommentRow = {
  id: string; postId: string; postCaption: string; postThumb?: string; postPermalink?: string;
  text: string; fromUserId: string; fromUsername: string; ts: number; isOwn: boolean;
  status: "replied" | "skipped" | "pending" | "needs_info" | "none";
  skipReason?: string; draftText?: string; draftId?: string;
  ownReply?: { text: string; ts: number }; isSuperfan?: boolean;
};

const COMMENT_FILTERS = [
  { id: "all", label: "all" },
  { id: "open", label: "needs reply" },
  { id: "replied", label: "replied" },
  { id: "skipped", label: "skipped" },
] as const;

const STATUS_BADGE: Record<CommentRow["status"], { label: string; color: string }> = {
  replied: { label: "replied", color: "#22c55e" },
  pending: { label: "draft ready", color: "#0095f6" },
  needs_info: { label: "needs info", color: "#f59e0b" },
  skipped: { label: "skipped", color: "#64748b" },
  none: { label: "open", color: "#a855f7" },
};

function CommentCard({ c }: { c: CommentRow }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [text, setText] = useState("");
  const reply = useReplyToComment();
  const draftAction = useDraftAction();
  const badge = STATUS_BADGE[c.status];

  const doReply = async () => {
    if (!text.trim() || reply.isPending) return;
    try {
      await reply.mutateAsync({ id: c.id, text: text.trim() });
      setText("");
      setReplyOpen(false);
    } catch { /* surfaced below */ }
  };

  return (
    <div className="card rounded-xl p-3.5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
          {(c.fromUsername || "??").slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[12.5px] font-semibold truncate" style={{ color: "var(--text)" }}>
              {c.fromUsername || c.fromUserId}
            </span>
            {c.isOwn && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-elev)", color: "var(--text-subtle)", border: "1px solid var(--border)" }}>you</span>
            )}
            {c.isSuperfan && <Star size={10} style={{ color: "#f59e0b" }} />}
            <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>{fmtAgo(c.ts)}</span>
          </div>
          {c.postCaption && (
            <div className="text-[9.5px] truncate" style={{ color: "var(--text-subtle)" }}>
              on “{c.postCaption.slice(0, 48)}”
            </div>
          )}
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0"
          style={{ background: `${badge.color}1e`, color: badge.color }}>
          {badge.label}
        </span>
      </div>

      <div className="text-[12.5px] mt-2 leading-[1.5]" style={{ color: "var(--text)" }}>{c.text}</div>
      {c.status === "skipped" && c.skipReason && (
        <div className="text-[10px] mt-1" style={{ color: "var(--text-subtle)" }}>skip reason: {c.skipReason}</div>
      )}

      {c.ownReply && (
        <div className="flex items-start gap-1.5 mt-2 pl-2 py-1.5 rounded-lg" style={{ background: "var(--bg-elev)" }}>
          <CornerDownRight size={11} style={{ color: "var(--text-subtle)", marginTop: 2 }} />
          <div>
            <div className="text-[11.5px]" style={{ color: "var(--text-muted)" }}>{c.ownReply.text}</div>
            <div className="text-[9px] mt-0.5" style={{ color: "var(--text-subtle)" }}>your reply · {fmtAgo(c.ownReply.ts)}</div>
          </div>
        </div>
      )}

      {/* Mira's pending draft → approve / reject */}
      {c.status === "pending" && c.draftText && c.draftId && (
        <div className="mt-2 rounded-lg p-2.5" style={{ background: "rgba(0,149,246,0.07)", border: "1px solid rgba(0,149,246,0.25)" }}>
          <div className="text-[10px] font-bold flex items-center gap-1 mb-1" style={{ color: "var(--accent)" }}>
            <Sparkles size={9} /> Mira&apos;s draft
          </div>
          <div className="text-[12px]" style={{ color: "var(--text)" }}>{c.draftText}</div>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => draftAction.mutate({ id: c.draftId!, body: { action: "approve" } })}
              disabled={draftAction.isPending}
              className="px-2.5 py-1 rounded-md text-[10.5px] font-semibold flex items-center gap-1 disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              <Check size={10} /> Approve &amp; send
            </button>
            <button
              onClick={() => draftAction.mutate({ id: c.draftId!, body: { action: "reject" } })}
              disabled={draftAction.isPending}
              className="px-2.5 py-1 rounded-md text-[10.5px] font-semibold flex items-center gap-1 disabled:opacity-40"
              style={{ background: "var(--bg-elev)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              <X size={10} /> Reject
            </button>
          </div>
        </div>
      )}

      {/* manual reply */}
      {!c.isOwn && (
        <div className="mt-2">
          {!replyOpen ? (
            <button
              onClick={() => setReplyOpen(true)}
              className="text-[10.5px] font-semibold"
              style={{ color: "var(--accent)" }}
            >
              Reply…
            </button>
          ) : (
            <div className="flex flex-col gap-1.5">
              {reply.isError && (
                <div className="text-[10px]" style={{ color: "#ef4444" }}>
                  {(reply.error as Error)?.message || "Reply failed"}
                </div>
              )}
              <div className="flex gap-1.5">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doReply()}
                  autoFocus
                  placeholder={`Reply to @${c.fromUsername || "user"}…`}
                  className="flex-1 rounded-lg px-2.5 py-1.5 text-[12px] outline-none"
                  style={{ background: "var(--bg-elev)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
                <button
                  onClick={doReply}
                  disabled={!text.trim() || reply.isPending}
                  className="rounded-lg px-3 text-[11px] font-semibold disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {reply.isPending ? "…" : "Send"}
                </button>
                <button onClick={() => setReplyOpen(false)} className="text-[10.5px]" style={{ color: "var(--text-subtle)" }}>
                  cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CommentsTab() {
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

// ── Mentions tab ──────────────────────────────────────────────────────────────
type MentionRow = {
  id: string; kind: "caption" | "comment" | "tag"; mediaId: string;
  permalink?: string; thumbnailUrl?: string; mediaCaption?: string;
  commentText?: string; fromUsername?: string; mediaType?: string;
  likeCount?: number; commentsCount?: number; ts: number; read: boolean;
};

const KIND_LABEL: Record<MentionRow["kind"], { label: string; color: string }> = {
  tag: { label: "tagged you", color: "#a855f7" },
  caption: { label: "caption mention", color: "#0095f6" },
  comment: { label: "comment mention", color: "#22c55e" },
};

function MentionsTab() {
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
          {mentions.map((m) => {
            const kind = KIND_LABEL[m.kind] ?? KIND_LABEL.tag;
            return (
              <div key={m.id} className="card rounded-xl p-3.5 flex gap-3" style={{ opacity: m.read ? 0.65 : 1 }}>
                {m.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" style={{ border: "1px solid var(--border)" }} />
                ) : (
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
                    <AtSign size={14} style={{ color: "var(--text-subtle)" }} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase" style={{ background: `${kind.color}1e`, color: kind.color }}>
                      {kind.label}
                    </span>
                    {m.fromUsername && (
                      <span className="text-[11.5px] font-semibold" style={{ color: "var(--text)" }}>@{m.fromUsername}</span>
                    )}
                    <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>{fmtAgo(m.ts)}</span>
                  </div>
                  <div className="text-[11.5px] mt-1 truncate" style={{ color: "var(--text-muted)" }}>
                    {m.commentText || m.mediaCaption || m.mediaType || "—"}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    {m.permalink && (
                      <a
                        href={m.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10.5px] font-semibold flex items-center gap-1"
                        style={{ color: "var(--accent)" }}
                      >
                        <ExternalLink size={9} /> Open on Instagram
                      </a>
                    )}
                    {!m.read && (
                      <button
                        onClick={() => markRead.mutate(m.id)}
                        className="text-[10.5px] font-semibold"
                        style={{ color: "var(--text-subtle)" }}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
