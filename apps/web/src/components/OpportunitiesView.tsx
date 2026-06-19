"use client";
// Opportunities — Kanban pipeline (Linear-style). Detected by the opportunity
// engine on inbound DMs (sponsorships, brand deals, collabs…). Drag a card
// between columns to move it through the pipeline; click a card → a centered
// modal detail (Linear-style), rendered fixed so it can't be clipped by the board.
import { useState } from "react";
import { X, MessageSquare, Inbox, ArrowUpRight, AlertTriangle, Gem } from "lucide-react";
import {
  useOpportunities, useOpportunity, usePatchOpportunity, useOpportunityStream,
  type Opportunity, type CrmMessage,
} from "../lib/api/hooks";
import { SkOppCard, SkOppDrawerBody, SkRepeat } from "./skeleton";
import { BoardCard, ColumnHeader, StatusIcon, Modal, IconButton, type StatusVariant } from "./ui";

const TYPE_COLORS: Record<string, string> = {
  sponsorship: "#8b5cf6", brand_deal: "#3b82f6", collab: "#10b981",
  podcast: "#f59e0b", investor: "#ef4444", partnership: "#14b8a6", media: "#64748b",
};

// column → Linear-style status glyph (color + variant). Presentation only.
const COLUMNS: { id: string; label: string; color: string; variant: StatusVariant }[] = [
  { id: "needs_review", label: "Needs Review", color: "var(--st-progress)", variant: "progress" },
  { id: "open", label: "Open", color: "var(--st-review)", variant: "empty" },
  { id: "in_progress", label: "In Progress", color: "var(--st-review)", variant: "progress" },
  { id: "won", label: "Won", color: "var(--st-done)", variant: "done" },
  { id: "lost", label: "Lost", color: "var(--st-blocked)", variant: "dashed" },
  { id: "archived", label: "Archived", color: "var(--st-backlog)", variant: "dashed" },
];

function fmtVal(v: number | null) {
  return v != null ? `₹${v.toLocaleString("en-IN")}` : "";
}
function ago(ts: number) {
  const d = Date.now() - ts;
  if (d < 3600_000) return `${Math.max(1, Math.floor(d / 60_000))}m`;
  if (d < 86400_000) return `${Math.floor(d / 3600_000)}h`;
  return `${Math.floor(d / 86400_000)}d`;
}

function Card({ o, onClick, onDragStart }: { o: Opportunity; onClick: () => void; onDragStart: (e: React.DragEvent) => void }) {
  const color = TYPE_COLORS[o.type] ?? "#64748b";
  const linked = o.display_name || o.igsid;
  const subtitle = linked || (o.reason ? o.reason : "flagged in DMs");
  return (
    <BoardCard
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      breadcrumb={
        <span className="inline-flex items-center gap-1.5">
          <span style={{ width: 7, height: 7, borderRadius: 999, background: color, display: "inline-block" }} />
          <span className="capitalize">{o.type.replace("_", " ")}</span>
        </span>
      }
      title={
        <span className={linked ? "" : "italic font-normal"} style={!linked ? { color: "var(--text-muted)" } : undefined}>
          {linked ? subtitle : `“${subtitle}”`}
        </span>
      }
      chips={
        <>
          <span className="text-[10.5px] font-medium px-1.5 h-[18px] inline-flex items-center rounded-md tabular-nums" style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}>{Math.round(o.confidence * 100)}%</span>
          {o.value_estimate != null && (
            <span className="text-[10.5px] font-semibold tabular-nums" style={{ color: "var(--text)" }}>{fmtVal(o.value_estimate)}</span>
          )}
        </>
      }
      footer={`Detected ${ago(o.detected_at)} ago`}
    />
  );
}

export function OpportunitiesView({ onOpenConversation }: { onOpenConversation?: (conversationId: string) => void } = {}) {
  const list = useOpportunities();
  const patch = usePatchOpportunity();
  const { connected: live } = useOpportunityStream();
  const [selected, setSelected] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const all = list.data?.opportunities ?? [];
  const byStatus = (s: string) => all.filter((o) => o.status === s);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative" style={{ background: "var(--bg-frame)" }}>
      {/* header */}
      <div className="px-6 pt-5 pb-3 flex items-center gap-2.5 shrink-0">
        <span className="text-[15px] font-semibold" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>Opportunities</span>
        <span className="flex items-center gap-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md"
          style={{ background: "var(--bg-inset)", color: live ? "#10b981" : "var(--text-subtle)" }}>
          <span style={{ width: 5, height: 5, borderRadius: 999, background: live ? "#10b981" : "var(--text-subtle)", display: "inline-block" }} className={live ? "animate-pulse" : ""} /> {live ? "Live" : "Idle"}
        </span>
        <span className="text-[11px] ml-0.5 tabular-nums" style={{ color: "var(--text-subtle)" }}>{all.length} opportunities</span>
      </div>

      {list.isError && (
        <div className="px-6 py-8 text-[12px] flex items-center gap-2" style={{ color: "#ef4444" }}>
          <AlertTriangle size={15} /> Failed to load. <button className="underline" onClick={() => list.refetch()}>Retry</button>
        </div>
      )}
      {!list.isError && all.length === 0 && !list.isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-inset)" }}>
            <Gem size={16} style={{ color: "var(--text-subtle)" }} />
          </div>
          <div className="text-[12.5px] font-medium" style={{ color: "var(--text)" }}>No opportunities yet</div>
          <div className="text-[11.5px] max-w-xs" style={{ color: "var(--text-subtle)" }}>Sponsorships, brand deals and collabs in your DMs surface here automatically.</div>
        </div>
      )}

      {/* board */}
      {(all.length > 0 || list.isLoading) && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-5">
          <div className="flex gap-5 h-full" style={{ minWidth: "max-content" }}>
            {COLUMNS.map((col, ci) => {
              const items = byStatus(col.id);
              const over = dragOverCol === col.id;
              return (
                <div
                  key={col.id}
                  onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
                  onDragLeave={() => setDragOverCol((c) => (c === col.id ? null : c))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverCol(null);
                    const id = e.dataTransfer.getData("opportunityId");
                    if (id) patch.mutate({ id, status: col.id });
                  }}
                  className="w-[260px] shrink-0 flex flex-col rounded-xl transition-colors"
                  style={{ background: over ? "var(--accent-soft)" : "transparent", outline: over ? "1px dashed var(--accent)" : "none", outlineOffset: -1 }}
                >
                  <ColumnHeader
                    icon={<StatusIcon color={col.color} variant={col.variant} />}
                    label={col.label}
                    count={items.length}
                  />
                  <div className="flex-1 overflow-y-auto pt-1 pb-2 flex flex-col gap-2 scrollbar-thin">
                    {list.isLoading
                      ? <SkRepeat n={2 + (ci % 2)}>{(i) => <SkOppCard key={i} i={i} />}</SkRepeat>
                      : items.map((o) => (
                          <Card key={o.id} o={o} onClick={() => setSelected(o.id)} onDragStart={(e) => e.dataTransfer.setData("opportunityId", o.id)} />
                        ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* centered modal detail (Linear-style) */}
      <Modal open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <OpportunityDrawer id={selected} onClose={() => setSelected(null)} onOpenConversation={onOpenConversation} />
        )}
      </Modal>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[9.5px] font-semibold uppercase tracking-[0.06em] mb-1.5" style={{ color: "var(--text-subtle)" }}>{children}</div>;
}

function OpportunityDrawer({ id, onClose, onOpenConversation }: { id: string; onClose: () => void; onOpenConversation?: (c: string) => void }) {
  const detail = useOpportunity(id);
  const patch = usePatchOpportunity();
  const o = detail.data?.opportunity;
  const messages = detail.data?.messages ?? [];
  const color = o ? (TYPE_COLORS[o.type] ?? "var(--text)") : "var(--text)";

  return (
    <>
      <div className="px-5 h-12 flex items-center justify-between border-b shrink-0 sticky top-0 z-10" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text-subtle)" }}>Opportunity</span>
        <span className="-mr-1"><IconButton onClick={onClose} title="Close"><X size={15} /></IconButton></span>
      </div>

      <div className="flex-1 overflow-y-auto">
      {detail.isLoading || !o ? (
        <SkOppDrawerBody />
      ) : (
        <div className="p-5 flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
              <span className="text-[16px] font-semibold capitalize" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>{o.type.replace("_", " ")}</span>
              <span className="text-[10.5px] font-medium px-1.5 py-0.5 rounded-md ml-auto tabular-nums" style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}>{Math.round(o.confidence * 100)}% sure</span>
            </div>
            <div className="text-[11.5px] mt-1" style={{ color: "var(--text-subtle)" }}>{o.display_name || o.igsid || "Unlinked"} · lead {o.lead_status}</div>
          </div>

          {o.reason && (
            <div>
              <Label>Why flagged</Label>
              <div className="rounded-lg p-3 text-[12px] italic leading-relaxed" style={{ background: "var(--bg-frame)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>“{o.reason}”</div>
            </div>
          )}

          <div>
            <Label>Value estimate (₹)</Label>
            <input
              type="number" defaultValue={o.value_estimate ?? ""} key={`val-${o.id}`} placeholder="—"
              onBlur={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); if (v !== (o.value_estimate ?? null)) patch.mutate({ id: o.id, value_estimate: v }); }}
              className="w-full rounded-lg px-3 py-2 text-[13px] outline-none transition-colors"
              style={{ background: "var(--bg-elev)", color: "var(--text)", border: "1px solid var(--border)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />
          </div>

          <div>
            <Label>Stage</Label>
            <div className="flex flex-wrap gap-1.5">
              {COLUMNS.map((c) => {
                const on = o.status === c.id;
                return (
                  <button key={c.id} onClick={() => patch.mutate({ id: o.id, status: c.id })}
                    className="text-[11px] font-medium px-2.5 py-1.5 rounded-md transition-colors"
                    style={on
                      ? { background: "var(--text)", color: "var(--bg)", border: "1px solid var(--text)" }
                      : { background: "var(--bg-elev)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <textarea
              defaultValue={o.notes ?? ""} key={`notes-${o.id}`} placeholder="Private notes…"
              onBlur={(e) => { if (e.target.value !== (o.notes ?? "")) patch.mutate({ id: o.id, notes: e.target.value }); }}
              className="w-full min-h-[72px] rounded-lg px-3 py-2.5 text-[13px] outline-none resize-none leading-relaxed"
              style={{ background: "var(--bg-elev)", color: "var(--text)", border: "1px solid var(--border)" }}
            />
          </div>

          <button
            onClick={() => onOpenConversation?.(o.conversation_id)}
            className="flex items-center justify-center gap-1.5 rounded-lg h-9 text-[12.5px] font-medium transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            <Inbox size={14} /> Open in Inbox <ArrowUpRight size={13} style={{ opacity: 0.7 }} />
          </button>

          <div>
            <Label><span className="inline-flex items-center gap-1"><MessageSquare size={10} /> Recent messages</span></Label>
            <div className="flex flex-col gap-1.5">
              {messages.length === 0 && <div className="text-[11.5px]" style={{ color: "var(--text-subtle)" }}>No messages.</div>}
              {messages.map((m: CrmMessage) => (
                <div key={m.id} className={`text-[12px] rounded-lg px-3 py-1.5 leading-relaxed ${m.direction === "out" ? "self-end" : "self-start"}`}
                  style={{ background: m.direction === "out" ? "var(--accent-soft)" : "var(--bg-elev)", color: "var(--text)", border: "1px solid var(--border)", maxWidth: "90%" }}>
                  {m.body?.text || `[${m.type}]`}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
