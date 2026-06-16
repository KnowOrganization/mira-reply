"use client";
// Opportunities — Kanban pipeline. Detected by the opportunity engine on inbound
// DMs (sponsorships, brand deals, collabs…). Drag a card between columns to move
// it through the pipeline; click a card for the detail drawer (value, why-flagged,
// recent messages, notes, Open in Inbox).
import { useState } from "react";
import { Gem, AlertTriangle, X, MessageSquare, ExternalLink, Inbox } from "lucide-react";
import {
  useOpportunities, useOpportunity, usePatchOpportunity, useOpportunityStream,
  type Opportunity, type CrmMessage,
} from "../lib/api/hooks";
import { SkOppCard, SkOppDrawerBody, SkRepeat } from "./skeleton";

const TYPE_COLORS: Record<string, string> = {
  sponsorship: "#a855f7", brand_deal: "var(--accent)", collab: "#22c55e",
  podcast: "#f59e0b", investor: "#ef4444", partnership: "#14b8a6", media: "#64748b",
};

const COLUMNS = [
  { id: "needs_review", label: "Needs Review", color: "#f59e0b" },
  { id: "open", label: "Open", color: "#a855f7" },
  { id: "in_progress", label: "In Progress", color: "#0095f6" },
  { id: "won", label: "Won", color: "#22c55e" },
  { id: "lost", label: "Lost", color: "#ef4444" },
  { id: "archived", label: "Archived", color: "#64748b" },
] as const;

function fmtVal(v: number | null) {
  return v != null ? `~₹${v.toLocaleString("en-IN")}` : "";
}
function ago(ts: number) {
  const d = Date.now() - ts;
  if (d < 3600_000) return `${Math.max(1, Math.floor(d / 60_000))}m`;
  if (d < 86400_000) return `${Math.floor(d / 3600_000)}h`;
  return `${Math.floor(d / 86400_000)}d`;
}

function Card({ o, onClick, onDragStart }: { o: Opportunity; onClick: () => void; onDragStart: (e: React.DragEvent) => void }) {
  const color = TYPE_COLORS[o.type] ?? "#64748b";
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="rounded-xl p-2.5 cursor-pointer"
      style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: `${color}1e`, color }}><Gem size={10} /></span>
        <span className="text-[11.5px] font-bold capitalize truncate" style={{ color: "var(--text)" }}>{o.type.replace("_", " ")}</span>
        <span className="text-[9px] font-bold px-1 py-px rounded-full ml-auto shrink-0" style={{ background: `${color}1e`, color }}>{Math.round(o.confidence * 100)}%</span>
      </div>
      <div className="text-[10.5px] mt-1 truncate" style={{ color: "var(--text-muted)" }}>{o.display_name || o.igsid || (o.reason ? `“${o.reason}”` : "flagged in DMs")}</div>
      <div className="flex items-center justify-between mt-1">
        {o.value_estimate != null ? <span className="text-[10px] font-semibold" style={{ color: "var(--text)" }}>{fmtVal(o.value_estimate)}</span> : <span />}
        <span className="text-[9px]" style={{ color: "var(--text-subtle)" }}>{ago(o.detected_at)}</span>
      </div>
    </div>
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
    <div className="flex-1 flex min-h-0" style={{ background: "var(--bg-frame)" }}>
      <div className="flex-1 flex flex-col min-w-0">
        {/* header */}
        <div className="px-5 pt-4 pb-2 flex items-center gap-2 shrink-0">
          <Gem size={15} style={{ color: "var(--text-muted)" }} />
          <span className="text-[14px] font-bold" style={{ color: "var(--text)" }}>Opportunities</span>
          <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: live ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.12)", color: live ? "#22c55e" : "var(--text-subtle)" }}>
            <span style={{ width: 5, height: 5, borderRadius: 999, background: live ? "#22c55e" : "var(--text-subtle)", display: "inline-block" }} className={live ? "animate-pulse" : ""} /> {live ? "live" : "…"}
          </span>
          <span className="text-[10.5px] ml-1" style={{ color: "var(--text-subtle)" }}>{all.length} total · drag to move</span>
        </div>

        {list.isError && (
          <div className="p-8 text-center text-xs flex flex-col items-center gap-2" style={{ color: "#ef4444" }}>
            <AlertTriangle size={16} /> Failed to load. <button className="underline" onClick={() => list.refetch()}>Retry</button>
          </div>
        )}
        {!list.isError && all.length === 0 && !list.isLoading && (
          <div className="p-10 text-center text-xs flex flex-col items-center gap-2" style={{ color: "var(--text-subtle)" }}>
            <Gem size={18} style={{ opacity: 0.4 }} />
            Nothing detected yet. Sponsorships, brand deals and collabs in your DMs surface here automatically.
          </div>
        )}

        {/* board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-5 pb-4">
          <div className="flex gap-3 h-full" style={{ minWidth: "max-content" }}>
            {COLUMNS.map((col, ci) => {
              const items = byStatus(col.id);
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
                  className="w-[210px] shrink-0 flex flex-col rounded-xl"
                  style={{ background: dragOverCol === col.id ? "rgba(124,58,237,0.06)" : "transparent", border: `1px solid ${dragOverCol === col.id ? "rgba(124,58,237,0.3)" : "var(--border)"}` }}
                >
                  <div className="px-2.5 py-2 flex items-center gap-1.5 border-b" style={{ borderColor: "var(--border)" }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: col.color }} />
                    <span className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>{col.label}</span>
                    <span className="text-[10px] ml-auto" style={{ color: "var(--text-subtle)" }}>{items.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                    {list.isLoading
                      ? <SkRepeat n={2 + (ci % 2)}>{(i) => <SkOppCard key={i} i={i} />}</SkRepeat>
                      : items.map((o) => (
                          <Card
                            key={o.id}
                            o={o}
                            onClick={() => setSelected(o.id)}
                            onDragStart={(e) => e.dataTransfer.setData("opportunityId", o.id)}
                          />
                        ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selected && (
        <OpportunityDrawer
          id={selected}
          onClose={() => setSelected(null)}
          onOpenConversation={onOpenConversation}
        />
      )}
    </div>
  );
}

function OpportunityDrawer({ id, onClose, onOpenConversation }: { id: string; onClose: () => void; onOpenConversation?: (c: string) => void }) {
  const detail = useOpportunity(id);
  const patch = usePatchOpportunity();
  const o = detail.data?.opportunity;
  const messages = detail.data?.messages ?? [];

  return (
    <div className="w-[320px] shrink-0 border-l flex flex-col overflow-y-auto" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-[12px] font-bold" style={{ color: "var(--text)" }}>Opportunity</span>
        <button onClick={onClose} style={{ color: "var(--text-subtle)" }}><X size={15} /></button>
      </div>

      {detail.isLoading || !o ? (
        <SkOppDrawerBody />
      ) : (
        <div className="p-4 flex flex-col gap-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold capitalize" style={{ color: TYPE_COLORS[o.type] ?? "var(--text)" }}>{o.type.replace("_", " ")}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-elev)", color: "var(--text-muted)" }}>{Math.round(o.confidence * 100)}% sure</span>
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--text-subtle)" }}>{o.display_name || o.igsid} · lead {o.lead_status}</div>
          </div>

          {o.reason && (
            <div className="card rounded-lg p-2.5">
              <div className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--text-subtle)" }}>Why flagged</div>
              <div className="text-[11.5px] italic" style={{ color: "var(--text-muted)" }}>“{o.reason}”</div>
            </div>
          )}

          {/* value */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--text-subtle)" }}>Value estimate (₹)</div>
            <input
              type="number"
              defaultValue={o.value_estimate ?? ""}
              key={`val-${o.id}`}
              placeholder="—"
              onBlur={(e) => {
                const v = e.target.value === "" ? null : Number(e.target.value);
                if (v !== (o.value_estimate ?? null)) patch.mutate({ id: o.id, value_estimate: v });
              }}
              className="w-full rounded-lg px-2.5 py-1.5 text-[12px] outline-none"
              style={{ background: "var(--bg-elev)", color: "var(--text)", border: "1px solid var(--border)" }}
            />
          </div>

          {/* status pipeline */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--text-subtle)" }}>Stage</div>
            <div className="flex flex-wrap gap-1">
              {COLUMNS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => patch.mutate({ id: o.id, status: c.id })}
                  className="text-[10px] font-semibold px-2 py-1 rounded-md capitalize"
                  style={{ background: o.status === c.id ? `${c.color}22` : "var(--bg-elev)", color: o.status === c.id ? c.color : "var(--text-muted)", border: `1px solid ${o.status === c.id ? c.color + "55" : "var(--border)"}` }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* notes */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--text-subtle)" }}>Notes</div>
            <textarea
              defaultValue={o.notes ?? ""}
              key={`notes-${o.id}`}
              placeholder="Private notes…"
              onBlur={(e) => { if (e.target.value !== (o.notes ?? "")) patch.mutate({ id: o.id, notes: e.target.value }); }}
              className="w-full min-h-[60px] rounded-lg px-2.5 py-2 text-[12px] outline-none resize-none"
              style={{ background: "var(--bg-elev)", color: "var(--text)", border: "1px solid var(--border)" }}
            />
          </div>

          <button
            onClick={() => onOpenConversation?.(o.conversation_id)}
            className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            <Inbox size={13} /> Open in Inbox
          </button>

          {/* recent messages */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wide mb-1.5 flex items-center gap-1" style={{ color: "var(--text-subtle)" }}>
              <MessageSquare size={10} /> Recent messages
            </div>
            <div className="flex flex-col gap-1.5">
              {messages.length === 0 && <div className="text-[11px]" style={{ color: "var(--text-subtle)" }}>No messages.</div>}
              {messages.map((m: CrmMessage) => (
                <div key={m.id} className={`text-[11px] rounded-lg px-2.5 py-1.5 ${m.direction === "out" ? "self-end" : "self-start"}`}
                  style={{ background: m.direction === "out" ? "var(--accent-soft)" : "var(--bg-elev)", color: "var(--text)", maxWidth: "92%" }}>
                  {m.body?.text || `[${m.type}]`}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
