"use client";

import { useState, useEffect, useRef } from "react";
import {
  Zap, Plus, ArrowLeft, Trash2, X, CheckCircle2, Circle, BookOpen, BarChart2, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { Automation, AutomationTrigger, AutomationNode } from "@shaiz/shared";
import {
  useAutomations,
  useCreateAutomation,
  usePatchAutomation,
  useDeleteAutomation,
} from "@/lib/api/hooks";
import { AutomationCanvas } from "./automations/AutomationCanvas";

// ── Templates ─────────────────────────────────────────────────────────────

type TemplateNode = Omit<AutomationNode, "id">;

type TemplateData = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  trigger: AutomationTrigger;
  nodes: TemplateNode[];
};

const TEMPLATES: TemplateData[] = [
  {
    id: "dm-on-comment",
    name: "DM on Comment",
    desc: "Reply publicly to a comment then send the user an automated DM",
    icon: "💬",
    color: "#7c3aed",
    trigger: { type: "comment_post", keywords: [], postIds: [] },
    nodes: [
      { type: "trigger",         position: { x: 0, y: 0 }, data: { text: "comment_post", subtitle: "keywords", enabled: true } },
      { type: "comment_reply",   position: { x: 0, y: 0 }, data: { text: "Just sent you a DM 📩 Check your inbox!" } },
      { type: "opening_message", position: { x: 0, y: 0 }, data: { text: "Hey! 👋 Thanks for commenting — sending you the details right now!" } },
      { type: "text_message",    position: { x: 0, y: 0 }, data: { text: "Here's what you asked for 👇\n[paste your link here]\n\nLet me know if you need anything! 😊" } },
    ],
  },
  {
    id: "follow-gate",
    name: "Follow Gate",
    desc: "Send content only to followers — ask others to follow first",
    icon: "🔒",
    color: "#22c55e",
    trigger: { type: "comment_post", keywords: [], postIds: [] },
    nodes: [
      { type: "trigger",       position: { x: 0, y: 0 }, data: { text: "comment_post", subtitle: "keywords", enabled: true } },
      { type: "comment_reply", position: { x: 0, y: 0 }, data: { text: "Just sent you a DM 📩 Check your inbox!" } },
      { type: "follow_gate",   position: { x: 0, y: 0 }, data: { text: "Hey! 👋 This content is for our community 💜\n\nFollow @[username] to unlock it — once you do, reply \"done\" and I'll send it right over! 🙏" } },
      { type: "text_message",  position: { x: 0, y: 0 }, data: { text: "Here it is! 🔥 Thanks for following!\n\n[your content here]\n\nEnjoy! 🙌" } },
    ],
  },
  {
    id: "lead-capture",
    name: "Lead Capture",
    desc: "Collect email or phone before sending the content",
    icon: "📋",
    color: "#a855f7",
    trigger: { type: "comment_post", keywords: [], postIds: [] },
    nodes: [
      { type: "trigger",         position: { x: 0, y: 0 }, data: { text: "comment_post", subtitle: "keywords", enabled: true } },
      { type: "comment_reply",   position: { x: 0, y: 0 }, data: { text: "Just sent you a DM 📩 Check your inbox!" } },
      { type: "opening_message", position: { x: 0, y: 0 }, data: { text: "Hey! 😊 I've got something for you — just need one thing first!" } },
      { type: "lead_form",       position: { x: 0, y: 0 }, data: { question: "What's the best email to send this to? 📩" } },
      { type: "text_message",    position: { x: 0, y: 0 }, data: { text: "Perfect! Here it is 👇\n[your content here]\n\nEnjoy! 🙌" } },
    ],
  },
  {
    id: "story-reply-dm",
    name: "Story Reply Auto-DM",
    desc: "Auto-respond to story replies with a helpful DM",
    icon: "📸",
    color: "#ec4899",
    trigger: { type: "story_reply", keywords: [], postIds: [] },
    nodes: [
      { type: "trigger",         position: { x: 0, y: 0 }, data: { text: "story_reply", subtitle: "keywords", enabled: true } },
      { type: "opening_message", position: { x: 0, y: 0 }, data: { text: "Hey! 👋 Thanks for replying to my story! So glad you reached out 😊" } },
      { type: "text_message",    position: { x: 0, y: 0 }, data: { text: "Here's more info on what you saw 👇\n[your link or content]\n\nLet me know if you have questions!" } },
    ],
  },
  {
    id: "live-comment-dm",
    name: "Live Comment DM",
    desc: "Send an instant DM to anyone who comments on your LIVE",
    icon: "🎥",
    color: "#f97316",
    trigger: { type: "live_comment", keywords: [], postIds: [] },
    nodes: [
      { type: "trigger",         position: { x: 0, y: 0 }, data: { text: "live_comment", subtitle: "keywords", enabled: true } },
      { type: "comment_reply",   position: { x: 0, y: 0 }, data: { text: "Just sent you a DM 📩" } },
      { type: "opening_message", position: { x: 0, y: 0 }, data: { text: "Hey! 👋 Saw your comment on the LIVE — so glad you're here!" } },
      { type: "text_message",    position: { x: 0, y: 0 }, data: { text: "Here's the link I mentioned 👇\n[your link]\n\nLet me know what you think! 🙌" } },
    ],
  },
  {
    id: "dm-auto-reply",
    name: "DM Auto-Reply",
    desc: "Automatically respond to incoming DMs with a message",
    icon: "✉️",
    color: "#0ea5e9",
    trigger: { type: "dm", keywords: [], postIds: [] },
    nodes: [
      { type: "trigger",         position: { x: 0, y: 0 }, data: { text: "dm", subtitle: "keywords", enabled: true } },
      { type: "opening_message", position: { x: 0, y: 0 }, data: { text: "Hey! 👋 Thanks for the message — I'll get back to you shortly!" } },
      { type: "text_message",    position: { x: 0, y: 0 }, data: { text: "Here's some info you might find helpful 👇\n[your content]\n\nFeel free to ask anything! 😊" } },
    ],
  },
];

const TRIGGER_LABELS: Record<string, string> = {
  comment_post: "Comment",
  dm: "DM",
  live_comment: "Live",
  story_reply: "Story Reply",
};

// ── AutoCard ─────────────────────────────────────────────────────────────────

function AutoCard({
  auto,
  onOpen,
  onDelete,
  onToggle,
  isDeleting,
}: {
  auto: Automation;
  onOpen: () => void;
  onDelete: () => void;
  onToggle: () => void;
  isDeleting?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const stepCount = auto.nodes.filter((n) => n.type !== "trigger").length;
  const triggerLabel = TRIGGER_LABELS[auto.trigger.type] ?? auto.trigger.type;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onClick={() => { if (!confirming) onOpen(); }}
      style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 16,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!confirming) {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.4)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(124,58,237,0.1)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: auto.enabled ? "rgba(34,197,94,0.12)" : "var(--bg-inset)",
          border: `1px solid ${auto.enabled ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Zap size={12} color={auto.enabled ? "#22c55e" : "var(--text-subtle)"} />
        </div>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {auto.name}
        </span>
        {/* actions — always visible, no opacity tricks */}
        <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          <button
            onClick={onToggle}
            title={auto.enabled ? "Deactivate" : "Activate"}
            style={{ background: "none", border: "none", cursor: "pointer", color: auto.enabled ? "#22c55e" : "var(--text-subtle)", padding: 4, borderRadius: 5, display: "flex" }}
          >
            {auto.enabled ? <CheckCircle2 size={13} /> : <Circle size={13} />}
          </button>
          {confirming ? (
            <>
              <button
                onClick={() => { onDelete(); setConfirming(false); }}
                disabled={isDeleting}
                style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 5, padding: "2px 8px", cursor: isDeleting ? "default" : "pointer", opacity: isDeleting ? 0.5 : 1, display: "flex", alignItems: "center", gap: 3 }}
              >
                {isDeleting ? <Loader2 size={10} className="animate-spin" /> : null}Delete
              </button>
              <button
                onClick={() => setConfirming(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-subtle)", padding: 4, borderRadius: 5, display: "flex" }}
              >
                <X size={11} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-subtle)", padding: 4, borderRadius: 5, display: "flex" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ef4444")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-subtle)")}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* pills */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: "var(--accent-soft)", color: "var(--accent-deep)" }}>
          {triggerLabel}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-subtle)", padding: "2px 7px", background: "var(--bg-inset)", borderRadius: 4 }}>
          {stepCount} step{stepCount !== 1 ? "s" : ""}
        </span>
        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: auto.enabled ? "rgba(34,197,94,0.08)" : "var(--bg-inset)", color: auto.enabled ? "#22c55e" : "var(--text-subtle)" }}>
          {auto.enabled ? "Active" : "Inactive"}
        </span>
      </div>

      {/* footer */}
      <div style={{ marginTop: 10, fontSize: 10, color: "var(--text-subtle)" }}>
        Updated {new Date(auto.updatedAt).toLocaleDateString()}
      </div>
    </motion.div>
  );
}

// ── TemplateCard ──────────────────────────────────────────────────────────────

function TemplateCard({ tpl, onUse, busy }: { tpl: TemplateData; onUse: () => void; busy: boolean }) {
  const stepCount = tpl.nodes.filter((n) => n.type !== "trigger").length;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onClick={!busy ? onUse : undefined}
      style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 16,
        cursor: busy ? "default" : "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        transition: "border-color 0.15s, box-shadow 0.15s",
        opacity: busy ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!busy) {
          (e.currentTarget as HTMLElement).style.borderColor = tpl.color + "88";
          (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${tpl.color}18`;
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 10 }}>{tpl.icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{tpl.name}</div>
      <div style={{ fontSize: 11, color: "var(--text-subtle)", lineHeight: 1.5, marginBottom: 10, flex: 1 }}>{tpl.desc}</div>
      <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: "var(--accent-soft)", color: "var(--accent-deep)" }}>
          {TRIGGER_LABELS[tpl.trigger.type] ?? tpl.trigger.type}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-subtle)", padding: "2px 7px", background: "var(--bg-inset)", borderRadius: 4 }}>
          {stepCount} step{stepCount !== 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: 11, fontWeight: 600, color: tpl.color, textAlign: "center" }}>
        {busy ? "Creating…" : "Use Template →"}
      </div>
    </motion.div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────

function PageHeader({
  title,
  icon,
  onBack,
  onBackLabel,
  action,
}: {
  title: string;
  icon?: React.ReactNode;
  onBack?: () => void;
  onBackLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{
      padding: "10px 20px",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg-frame)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexShrink: 0,
    }}>
      {onBack && (
        <>
          <button
            onClick={onBack}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: 4, fontSize: 11, padding: "4px 6px", borderRadius: 6 }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-subtle)")}
          >
            <ArrowLeft size={12} /> {onBackLabel ?? "Back"}
          </button>
          <div style={{ width: 1, height: 14, background: "var(--border)" }} />
        </>
      )}
      {icon && <span style={{ color: "var(--text-muted)" }}>{icon}</span>}
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>{title}</span>
      <div style={{ flex: 1 }} />
      {action}
    </div>
  );
}

// ── CanvasHeader ──────────────────────────────────────────────────────────────

function CanvasHeader({
  auto,
  onBack,
  onToggle,
}: {
  auto: Automation;
  onBack: () => void;
  onToggle: (id: string, enabled: boolean) => void;
}) {
  return (
    <div style={{
      padding: "9px 14px",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      gap: 9,
      background: "var(--bg-frame)",
      backdropFilter: "blur(8px)",
      flexShrink: 0,
    }}>
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: 4, fontSize: 11, padding: "4px 6px", borderRadius: 6 }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-subtle)")}
      >
        <ArrowLeft size={12} /> All Automations
      </button>
      <div style={{ width: 1, height: 14, background: "var(--border)" }} />
      <div style={{
        width: 22, height: 22, borderRadius: 6,
        background: "var(--bg-inset)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Zap size={11} color="var(--text-muted)" />
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)" }}>{auto.name}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 2 }}>
        <div style={{
          width: 5, height: 5, borderRadius: "50%",
          background: auto.enabled ? "#22c55e" : "var(--text-subtle)",
          boxShadow: auto.enabled ? "0 0 4px #22c55e" : "none",
        }} />
        <span style={{ fontSize: 10, color: auto.enabled ? "#22c55e" : "var(--text-subtle)" }}>
          {auto.enabled ? "Active" : "Inactive"}
        </span>
      </div>
      <div style={{ flex: 1 }} />
      <button
        onClick={() => onToggle(auto.id, !auto.enabled)}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "5px 13px", borderRadius: 7,
          border: `1px solid ${auto.enabled ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
          background: auto.enabled ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.07)",
          color: auto.enabled ? "#ef4444" : "#22c55e",
          fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}
      >
        {auto.enabled ? "Deactivate" : "Activate"}
      </button>
    </div>
  );
}

// ── AutomationsView ───────────────────────────────────────────────────────────

export function AutomationsView({
  onBack,
  subView,
}: {
  onBack?: () => void;
  subView?: string;
}) {
  const [mode, setMode] = useState<"grid" | "canvas" | "templates" | "history">("grid");
  const [editing, setEditing] = useState<string | null>(null);
  const [busyTemplate, setBusyTemplate] = useState<string | null>(null);
  const prevSubView = useRef<string | undefined>(undefined);

  const automationsQ = useAutomations({ refetchInterval: 30_000 });
  const automations = automationsQ.data?.automations ?? [];
  const loading = automationsQ.isLoading;

  const createMut = useCreateAutomation();
  const patchMut = usePatchAutomation();
  const deleteMut = useDeleteAutomation();

  // Sync mode when parent nav changes sub-view
  useEffect(() => {
    const prev = prevSubView.current;
    prevSubView.current = subView;

    if (subView === "templates") {
      setMode("templates");
      setEditing(null);
      return;
    }
    if (subView === "history") {
      setMode("history");
      setEditing(null);
      return;
    }
    if (subView === "create" && prev !== "create") {
      createBlank();
      return;
    }
    if (subView !== "create") {
      // "all" or undefined → grid (unless user is actively editing)
      if (subView === "all" || (subView !== prev && mode !== "canvas")) {
        setMode("grid");
        setEditing(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subView]);

  async function createBlank() {
    try {
      const d = await createMut.mutateAsync();
      setEditing(d.automation.id);
      setMode("canvas");
    } catch {
      toast.error("Failed to create automation");
    }
  }

  async function createFromTemplate(tpl: TemplateData) {
    if (busyTemplate) return;
    setBusyTemplate(tpl.id);
    try {
      const d = await createMut.mutateAsync();
      const now = Date.now();
      const nodes = tpl.nodes.map((n, i) => ({
        ...n,
        id: `node_${now.toString(36)}_${i}`,
      }));
      await patchMut.mutateAsync({
        id: d.automation.id,
        patch: { name: tpl.name, trigger: tpl.trigger, nodes },
      });
      setEditing(d.automation.id);
      setMode("canvas");
    } catch {
      toast.error("Failed to create from template");
      setBusyTemplate(null);
    }
    setBusyTemplate(null);
  }

  async function deleteAuto(id: string) {
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Automation deleted");
      if (editing === id) {
        setEditing(null);
        setMode("grid");
      }
    } catch {
      toast.error("Failed to delete automation");
    }
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    try {
      await patchMut.mutateAsync({ id, patch: { enabled } });
    } catch {
      toast.error("Failed to update automation");
    }
  }

  async function saveAuto(patch: Partial<Automation>) {
    if (!editing) return;
    await patchMut.mutateAsync({ id: editing, patch });
  }

  const currentAuto = automations.find((a) => a.id === editing) ?? null;

  // ── Canvas mode ────────────────────────────────────────────────────────────
  if (mode === "canvas" && currentAuto) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <CanvasHeader
          auto={currentAuto}
          onBack={() => { setEditing(null); setMode("grid"); }}
          onToggle={toggleEnabled}
        />
        <AutomationCanvas key={currentAuto.id} automation={currentAuto} onSave={saveAuto} />
      </div>
    );
  }

  // ── Canvas mode but auto not found (deleted / loading) ────────────────────
  if (mode === "canvas" && !loading) {
    setMode("grid");
    setEditing(null);
  }

  // ── Templates mode ─────────────────────────────────────────────────────────
  if (mode === "templates") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <PageHeader
          title="Templates"
          icon={<BookOpen size={14} />}
          onBack={onBack}
          onBackLabel="Dashboard"
        />
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <p style={{ fontSize: 12, color: "var(--text-subtle)", marginBottom: 20 }}>
              Pick a template to get started — you can customise every step after.
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 14,
            }}>
              <AnimatePresence mode="popLayout">
                {TEMPLATES.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    tpl={tpl}
                    onUse={() => createFromTemplate(tpl)}
                    busy={busyTemplate === tpl.id}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── History mode ───────────────────────────────────────────────────────────
  if (mode === "history") {
    const sorted = [...automations].sort((a, b) => (b.stats.lastTriggered ?? 0) - (a.stats.lastTriggered ?? 0));
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <PageHeader
          title="Execution History"
          icon={<BarChart2 size={14} />}
          onBack={onBack}
          onBackLabel="Dashboard"
        />
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            {loading && (
              <div style={{ textAlign: "center", color: "var(--text-subtle)", fontSize: 12, paddingTop: 60 }}>
                Loading…
              </div>
            )}
            {!loading && automations.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--text-subtle)", fontSize: 12, paddingTop: 60 }}>
                No automations yet. Create one to see execution stats here.
              </div>
            )}
            {!loading && automations.length > 0 && (
              <div style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                overflow: "hidden",
              }}>
                {/* Table header */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 90px 90px 90px 130px",
                  padding: "8px 16px",
                  background: "var(--bg-inset)",
                  borderBottom: "1px solid var(--border)",
                  gap: 8,
                }}>
                  {["Automation", "Triggered", "Completed", "Failed", "Last Run"].map((h) => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {h}
                    </span>
                  ))}
                </div>
                {sorted.map((a, i) => {
                  const rate = a.stats.triggered > 0
                    ? Math.round((a.stats.completed / a.stats.triggered) * 100)
                    : null;
                  return (
                    <div
                      key={a.id}
                      onClick={() => { setEditing(a.id); setMode("canvas"); }}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 90px 90px 90px 130px",
                        padding: "11px 16px",
                        borderBottom: i < sorted.length - 1 ? "1px solid var(--border)" : "none",
                        gap: 8,
                        cursor: "pointer",
                        transition: "background 0.1s",
                        alignItems: "center",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-inset)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                    >
                      {/* name + status */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                          background: a.enabled ? "#22c55e" : "var(--text-subtle)",
                          boxShadow: a.enabled ? "0 0 4px #22c55e" : "none",
                        }} />
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.name}
                        </span>
                        {rate !== null && (
                          <span style={{ fontSize: 9.5, padding: "1px 5px", borderRadius: 4, flexShrink: 0,
                            background: rate >= 80 ? "rgba(34,197,94,0.1)" : rate >= 50 ? "rgba(234,179,8,0.1)" : "rgba(239,68,68,0.1)",
                            color: rate >= 80 ? "#22c55e" : rate >= 50 ? "#eab308" : "#ef4444",
                          }}>
                            {rate}% success
                          </span>
                        )}
                      </div>
                      {/* triggered */}
                      <span style={{ fontSize: 13, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                        {a.stats.triggered.toLocaleString()}
                      </span>
                      {/* completed */}
                      <span style={{ fontSize: 13, color: a.stats.completed > 0 ? "#22c55e" : "var(--text-subtle)", fontVariantNumeric: "tabular-nums" }}>
                        {a.stats.completed.toLocaleString()}
                      </span>
                      {/* failed */}
                      <span style={{ fontSize: 13, color: a.stats.failed > 0 ? "#ef4444" : "var(--text-subtle)", fontVariantNumeric: "tabular-nums" }}>
                        {a.stats.failed.toLocaleString()}
                      </span>
                      {/* last run */}
                      <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                        {a.stats.lastTriggered
                          ? new Date(a.stats.lastTriggered).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                          : "Never"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Grid mode (default) ────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", position: "relative" }}>
      <PageHeader
        title="All Automations"
        icon={<Zap size={14} />}
        onBack={onBack}
        onBackLabel="Dashboard"
        action={
          <button
            onClick={createBlank}
            disabled={createMut.isPending}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 14px", borderRadius: 8,
              background: "rgba(124,58,237,0.9)", border: "none",
              color: "#fff", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
              opacity: createMut.isPending ? 0.6 : 1,
            }}
          >
            <Plus size={12} /> New Automation
          </button>
        }
      />

      {createMut.isPending && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 10,
          background: "var(--bg-frame)", zIndex: 10,
        }}>
          <Loader2 size={22} className="animate-spin" color="var(--accent)" />
          <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>Creating automation…</span>
        </div>
      )}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {loading && (
            <div style={{ textAlign: "center", color: "var(--text-subtle)", fontSize: 12, paddingTop: 60 }}>
              Loading…
            </div>
          )}

          {!loading && automations.length === 0 && (
            <div style={{
              textAlign: "center", paddingTop: 80, display: "flex",
              flexDirection: "column", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: "var(--border)", border: "1px solid var(--bg-inset)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Zap size={20} color="var(--text-subtle)" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-subtle)", marginBottom: 5 }}>
                  No automations yet
                </div>
                <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                  Create one from scratch or pick a template to get started
                </div>
              </div>
              <button
                onClick={createBlank}
                disabled={createMut.isPending}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 18px", borderRadius: 50,
                  background: "rgba(124,58,237,0.9)", border: "none",
                  color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: createMut.isPending ? "default" : "pointer",
                  boxShadow: "0 4px 18px rgba(124,58,237,0.4)",
                  opacity: createMut.isPending ? 0.6 : 1,
                }}
              >
                <Plus size={13} /> New Automation
              </button>
            </div>
          )}

          {!loading && automations.length > 0 && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 14,
            }}>
              <AnimatePresence mode="popLayout">
                {automations.map((a) => (
                  <AutoCard
                    key={a.id}
                    auto={a}
                    onOpen={() => { setEditing(a.id); setMode("canvas"); }}
                    onDelete={() => deleteAuto(a.id)}
                    onToggle={() => toggleEnabled(a.id, !a.enabled)}
                    isDeleting={deleteMut.isPending}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
