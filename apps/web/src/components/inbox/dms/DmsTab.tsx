"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clock, Send, AlertTriangle, User, Tag, StickyNote, Sparkles, Megaphone, RefreshCw,
} from "lucide-react";
import {
  useConversations, useConversation, useSendReply, usePatchConversation, useCrmAnalytics, useGenerateDraft,
  useSyncDms, useInboxStream, type CrmConversationListItem,
} from "@/lib/api/hooks";
import { SkThreadRow, SkMessageBubble, SkRepeat } from "@/components/skeleton";
import { Avatar, Segmented } from "@/components/ui";
import { FOLDERS } from "../constants";
import { fmtAgo, windowLeft } from "../utils";
import { Bubble } from "./Bubble";
import { GuidedTestEmptyState } from "./GuidedTestEmptyState";

// module-level guard so the login DM import runs once per page load, not on
// every tab switch back to DMs
let dmSyncedThisSession = false;

export function DmsTab() {
  const [folder, setFolder] = useState<(typeof FOLDERS)[number]>("all");
  const [selected, setSelected] = useState<string | null>(null);
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
  const generate = useGenerateDraft();
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
    if (!selected || !conv?.ai_draft?.trim() || send.isPending) return;
    try {
      await send.mutateAsync({ id: selected, text: conv.ai_draft.trim() });
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
                    onClick={() => generate.mutate(selected!)}
                    disabled={generate.isPending}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: "var(--accent)", border: "1px solid var(--border)", background: "var(--bg-elev)", opacity: generate.isPending ? 0.6 : 1 }}
                  >
                    {generate.isPending ? "Regenerating…" : "Regenerate"}
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
              {generate.isError && (
                <div className="text-[11px] mb-2 px-1" style={{ color: "#ef4444" }}>
                  {(generate.error as Error)?.message || "Draft generation failed"}
                </div>
              )}
              {!conv.ai_draft ? (
                <button
                  onClick={() => generate.mutate(selected!)}
                  disabled={generate.isPending}
                  className="w-full rounded-lg px-4 py-2.5 flex items-center justify-center gap-1.5 text-[12.5px] font-semibold"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--border)", opacity: generate.isPending ? 0.6 : 1 }}
                >
                  <Sparkles size={13} /> {generate.isPending ? "Mira is drafting…" : "Generate reply with Mira"}
                </button>
              ) : (
                <button
                  onClick={doSend}
                  disabled={!canType || send.isPending}
                  className="w-full rounded-lg px-4 py-2.5 flex items-center justify-center gap-1.5 text-[12.5px] font-semibold"
                  style={{
                    background: canType ? "var(--accent)" : "var(--bg-elev)",
                    color: canType ? "#fff" : "var(--text-subtle)",
                    border: "1px solid var(--border)",
                    opacity: canType ? 1 : 0.55,
                  }}
                >
                  <Send size={13} /> {send.isPending ? "…" : canType ? "Send Mira's draft" : "Window closed — replies blocked by Meta policy"}
                </button>
              )}
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
