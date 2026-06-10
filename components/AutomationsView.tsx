"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Zap, MessageSquare, LayoutGrid, Image as ImageIcon, UserPlus,
  ClipboardList, Clock, Plus, Trash2, ChevronRight, ChevronDown,
  X, CheckCircle2, Circle, Edit3, Hash, Images,
  Move, Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { Automation, AutomationNodeType, AutomationNodeData, AutomationNode } from "@/lib/ig/store";

// ── types ──────────────────────────────────────────────────────────────────

type NodeCardProps = {
  data: AutomationNodeData;
  onUpdate: (patch: Partial<AutomationNodeData>) => void;
  onDelete?: () => void;
  canDelete?: boolean;
  dragMode?: boolean;
  windowOpen?: boolean; // conversation window is open (affects in-node warnings)
};

type NodeValidation = {
  status: "available" | "blocked";
  message?: string;
};

function getNodeValidation(type: AutomationNodeType, nodes: AutomationNode[]): NodeValidation {
  const triggerData = nodes.find((n) => n.type === "trigger")?.data.text ?? "comment_post";
  const triggerOpensWindow = triggerData === "dm" || triggerData === "story_reply";
  const isLiveTrigger = triggerData === "live_comment";

  const hasOpeningMsg = nodes.some((n) => n.type === "opening_message" && n.data.enabled !== false);
  const hasOpeningMsgNode = nodes.some((n) => n.type === "opening_message");
  const windowOpen = hasOpeningMsg || triggerOpensWindow;

  const CONTENT: AutomationNodeType[] = ["text_message", "card_message", "image_message"];
  const contentCount = nodes.filter((n) => CONTENT.includes(n.type)).length;

  switch (type) {
    case "opening_message":
      if (hasOpeningMsgNode)
        return { status: "blocked", message: "Opening Message already in this flow" };
      return { status: "available" };

    case "text_message":
    case "card_message":
    case "image_message":
      if (!windowOpen && contentCount >= 1)
        return { status: "blocked", message: "Opening Message is off — only one of Text/Card/Image allowed" };
      return { status: "available" };

    case "ask_follow":
      if (nodes.some((n) => n.type === "ask_follow"))
        return { status: "blocked", message: "Ask For Follow already in this flow" };
      if (!windowOpen)
        return { status: "blocked", message: "Requires Opening Message (or DM/Story trigger)" };
      return { status: "available" };

    case "follow_gate":
      if (nodes.some((n) => n.type === "follow_gate"))
        return { status: "blocked", message: "Follow Gate already in this flow" };
      return { status: "available" };

    case "lead_form":
      if (nodes.some((n) => n.type === "lead_form"))
        return { status: "blocked", message: "Lead Form already in this flow" };
      return { status: "available" };

    case "followup_message":
      if (nodes.some((n) => n.type === "followup_message"))
        return { status: "blocked", message: "Follow-up Message already in this flow" };
      if (isLiveTrigger)
        return { status: "blocked", message: "Not available for Live comment triggers" };
      if (!windowOpen)
        return { status: "blocked", message: "Requires Opening Message to be enabled" };
      return { status: "available" };

    default:
      return { status: "available" };
  }
}

// compute windowOpen state from current nodes (used to pass into node components)
function computeWindowOpen(nodes: AutomationNode[]): boolean {
  const triggerData = nodes.find((n) => n.type === "trigger")?.data.text ?? "comment_post";
  const triggerOpensWindow = triggerData === "dm" || triggerData === "story_reply";
  const hasOpeningMsg = nodes.some((n) => n.type === "opening_message" && n.data.enabled !== false);
  return hasOpeningMsg || triggerOpensWindow;
}


// ── NodeShell ──────────────────────────────────────────────────────────────

function NodeShell({ children, color, glow, dragMode }: { children: React.ReactNode; color: string; glow?: boolean; dragMode?: boolean }) {
  return (
    <div style={{
      background: "rgba(10,10,18,0.98)",
      border: `1.5px solid rgba(255,255,255,0.07)`,
      borderRadius: 16,
      width: 288,
      boxShadow: glow
        ? `0 0 0 1px ${color}22, 0 0 28px ${color}22, 0 6px 28px rgba(0,0,0,0.7)`
        : `0 4px 22px rgba(0,0,0,0.6)`,
      overflow: "hidden",
      cursor: dragMode ? "grab" : "default",
      userSelect: "none",
      transition: "box-shadow 0.2s",
    }}>
      {children}
    </div>
  );
}

function NodeHeader({ icon, title, subtitle, color, onDelete, canDelete }: {
  icon: React.ReactNode; title: string; subtitle?: string; color: string;
  onDelete?: () => void; canDelete?: boolean;
}) {
  return (
    <div style={{ padding: "11px 12px 9px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 9 }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: `${color}1c`, border: `1px solid ${color}3a`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#e5e5e5", lineHeight: 1.2 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 10.5, color: "#3a3a4a", marginTop: 1.5 }}>{subtitle}</div>}
      </div>
      {canDelete && onDelete && (
        <button onClick={onDelete}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#2a2a2a", padding: 3, display: "flex", borderRadius: 6 }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ef4444")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#2a2a2a")}
        ><X size={13} /></button>
      )}
    </div>
  );
}

// ── Connectors ─────────────────────────────────────────────────────────────

function VConnector() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: 48, justifyContent: "center" }}>
      <div style={{ width: 2, height: 32, background: "repeating-linear-gradient(to bottom, #7c3aed 0, #7c3aed 5px, transparent 5px, transparent 10px)" }} />
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c3aed", boxShadow: "0 0 7px #7c3aedaa", marginTop: 2 }} />
    </div>
  );
}

function HConnector() {
  return (
    <div style={{ display: "flex", alignItems: "center", width: 56, justifyContent: "center" }}>
      <div style={{ height: 2, width: 36, background: "repeating-linear-gradient(to right, #7c3aed 0, #7c3aed 5px, transparent 5px, transparent 10px)" }} />
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c3aed", boxShadow: "0 0 7px #7c3aedaa", marginLeft: 2 }} />
    </div>
  );
}

// ── shared message body ────────────────────────────────────────────────────

const BUTTON_SUGGESTIONS = [
  "Send me the link 🔗",
  "Get access ✨",
  "Show me more 👇",
  "Claim my spot 🙋",
  "Yes, I'm in! 🙌",
  "Tell me more 💬",
  "Download now ⬇️",
  "Book a call 📞",
];

function ButtonSuggestModal({ onAdd, onClose }: { onAdd: (label: string) => void; onClose: () => void }) {
  const [custom, setCustom] = useState("");
  const [hov, setHov] = useState<string | null>(null);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.78)", backdropFilter: "blur(12px)" }}
      onMouseDown={onClose}>
      <div style={{
        background: "linear-gradient(160deg, rgba(18,18,30,0.99) 0%, rgba(10,10,18,0.99) 100%)",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, width: 380, overflow: "hidden",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.9)",
      }} onMouseDown={(e) => e.stopPropagation()}>

        <div style={{ padding: "20px 22px 14px", background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Plus size={14} color="#888" />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#e8e8e8", letterSpacing: "-0.01em" }}>Add Button</div>
              <div style={{ fontSize: 11, color: "#383848", marginTop: 2 }}>Quick pick or write your own</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 14px 8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {BUTTON_SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => { onAdd(s); onClose(); }}
                onMouseEnter={() => setHov(s)} onMouseLeave={() => setHov(null)}
                style={{
                  padding: "9px 12px", textAlign: "left", cursor: "pointer", fontSize: 11.5,
                  color: hov === s ? "#d4d4d4" : "#666",
                  background: hov === s ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${hov === s ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}`,
                  borderRadius: 10, transition: "all 0.13s",
                  transform: hov === s ? "translateY(-1px)" : "none",
                  boxShadow: hov === s ? "0 4px 12px rgba(0,0,0,0.3)" : "none",
                }}>{s}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: "6px 14px 14px" }}>
          <div style={{ display: "flex", gap: 7 }}>
            <input value={custom} onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) { onAdd(custom.trim()); onClose(); } }}
              placeholder="Or type a custom label…"
              autoFocus
              style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 12px", fontSize: 11.5, color: "#ccc", outline: "none" }}
            />
            <button onClick={() => { if (custom.trim()) { onAdd(custom.trim()); onClose(); } }}
              style={{ padding: "9px 16px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, cursor: "pointer", color: "#ccc", fontSize: 11.5, fontWeight: 600, flexShrink: 0 }}>
              Add
            </button>
          </div>
        </div>

        <div style={{ padding: "0 14px 16px" }}>
          <button onClick={onClose} style={{ width: "100%", padding: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, cursor: "pointer", color: "#2a2a3a", fontSize: 11.5, fontWeight: 500 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "#555"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLElement).style.color = "#2a2a3a"; }}
          >Dismiss</button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
      <div style={{
        width: 36, height: 20, borderRadius: 10,
        background: on ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.06)",
        border: `1px solid ${on ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.1)"}`,
        position: "relative", transition: "all 0.18s",
        boxShadow: on ? "0 0 8px rgba(34,197,94,0.2)" : "none",
      }}>
        <div style={{
          position: "absolute", top: 2, left: on ? 18 : 2,
          width: 14, height: 14, borderRadius: "50%",
          background: on ? "#22c55e" : "#444",
          transition: "left 0.18s, background 0.18s",
          boxShadow: on ? "0 0 6px rgba(34,197,94,0.5)" : "none",
        }} />
      </div>
    </button>
  );
}

function MessageBody({ data, onUpdate, accentColor, placeholder, nodeType }: { data: AutomationNodeData; onUpdate: (p: Partial<AutomationNodeData>) => void; accentColor: string; placeholder: string; nodeType?: string }) {
  const [btnModal, setBtnModal] = useState(false);
  return (
    <div style={{ padding: "9px 12px" }}>
      {btnModal && <ButtonSuggestModal onAdd={(label) => onUpdate({ buttons: [...(data.buttons ?? []), { label, payload: "" }] })} onClose={() => setBtnModal(false)} />}
      {nodeType && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <SuggestButton nodeType={nodeType} onSelect={(t) => onUpdate({ text: t })} />
        </div>
      )}
      <textarea value={data.text ?? ""} onChange={(e) => onUpdate({ text: e.target.value })} placeholder={placeholder} rows={3}
        style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "7px 9px", fontSize: 11, color: "#ccc", outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.5 }}
      />
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
        {(data.buttons ?? []).map((btn, i) => (
          <div key={i} style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <input value={btn.label} onChange={(e) => { const u = [...(data.buttons ?? [])]; u[i] = { ...u[i], label: e.target.value }; onUpdate({ buttons: u }); }}
              style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 7, padding: "5px 8px", fontSize: 11, color: "#ccc", outline: "none" }}
              placeholder="Button label"
            />
            <button onClick={() => onUpdate({ buttons: (data.buttons ?? []).filter((_, j) => j !== i) })} style={{ background: "none", border: "none", cursor: "pointer", color: "#2a2a2a", padding: 2, display: "flex" }}><X size={11} /></button>
          </div>
        ))}
        <button onClick={() => setBtnModal(true)}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 7, padding: "6px 9px", fontSize: 10.5, color: "#555", cursor: "pointer" }}>
          <Plus size={10} /> Add Button
        </button>
      </div>
    </div>
  );
}

// ── Message suggestion templates ──────────────────────────────────────────

const MESSAGE_TEMPLATES: Record<string, string[]> = {
  opening_message: [
    "Hey! 👋 Thanks for commenting — sending you the details right now!",
    "Hi there! 😊 Saw your comment — I've got something for you!",
    "Hey! ✨ You just unlocked something special — hold tight!",
  ],
  text_message: [
    "Here's the link you asked for 👇\n[paste your link here]\n\nLet me know if you have any questions! 😊",
    "Here it is! 🔥 Hope this helps — drop me a DM if you need anything else.",
    "Sending it over now 👇\n[your content here]\n\nEnjoy! 🙌",
  ],
  ask_follow: [
    "Hey! 👋 To get exclusive access, follow @[username] first 💜\n\nOnce you do, reply \"done\" and I'll send it right over!",
    "This is just for our community 🙏\n\nFollow @[username] then reply \"following\" and I'll unlock it for you!",
    "Almost there! 🔒\n\nFollow @[username] to get the full details — then come back and reply \"done\" 👇",
  ],
  follow_gate: [
    "Oops! 😅 This is for our community only 💜\n\nFollow @[username] to unlock it!\n\nOnce you've followed, reply \"done\" 👇",
    "Hey! This content is exclusive for followers 💜\n\nFollow @[username] and reply \"following\" when done!",
    "Almost there! 🔒 This is for our fam only.\n\nFollow @[username] first, then come back here and reply \"done\" 👇",
  ],
  lead_form: [
    "What's the best email to send this to? 📩",
    "Drop your WhatsApp number and I'll reach out personally! 📱",
    "What's your name? I'll make this just for you 😊",
  ],
  followup_message: [
    "Hey! 👋 Just checking in — did you get a chance to look at what I sent?",
    "Following up! 😊 Hope it was helpful — any questions at all?",
    "Hey! Just wanted to make sure everything arrived okay ✨ Let me know!",
  ],
};

const NODE_DEFAULTS: Partial<Record<string, string>> = {
  opening_message: "Hey! 👋 Thanks for commenting — sending you the details right now!",
  text_message: "Here's what you asked for 👇\n[paste your link or content here]\n\nLet me know if you need anything! 😊",
  ask_follow: "Hey! 👋 To get exclusive access, follow @[username] first 💜\n\nOnce you do, reply \"done\" and I'll send it right over!",
  follow_gate: "Oops! 😅 This is for our community only 💜\n\nFollow @[username] to unlock it!\n\nOnce you've followed, reply \"done\" 👇",
  follow_gate: "Hey! 👋 This content is for our community 💜\n\nFollow @[username] to unlock it — once you do, reply \"done\" and I'll send it right over! 🙏",
  lead_form: "What's the best email to send this to? 📩",
  followup_message: "Hey! 👋 Just checking in — did you get a chance to look at what I sent?",
};

function SuggestButton({ nodeType, onSelect }: { nodeType: string; onSelect: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const templates = MESSAGE_TEMPLATES[nodeType] ?? [];
  if (!templates.length) return null;
  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ display: "flex", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: "#2a2a3a", fontSize: 10, padding: "2px 0", fontWeight: 600 }}
        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "#888"}
        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "#2a2a3a"}
      >✨ Suggest</button>
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.78)", backdropFilter: "blur(12px)" }}
          onMouseDown={() => setOpen(false)}>
          <div style={{
            background: "linear-gradient(160deg, rgba(18,18,30,0.99) 0%, rgba(10,10,18,0.99) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 22,
            width: 400,
            overflow: "hidden",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.9), 0 8px 24px rgba(0,0,0,0.6)",
          }}
            onMouseDown={(e) => e.stopPropagation()}>

            {/* header */}
            <div style={{ padding: "20px 22px 16px", background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✨</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#e8e8e8", letterSpacing: "-0.01em" }}>Message Templates</div>
                  <div style={{ fontSize: 11, color: "#383848", marginTop: 2 }}>Select one to prefill — you can edit after</div>
                </div>
              </div>
            </div>

            {/* template cards */}
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {templates.map((t, i) => (
                <button key={i} onClick={() => { onSelect(t); setOpen(false); }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "13px 15px",
                    background: hovered === i ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.025)",
                    border: `1px solid ${hovered === i ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    transition: "all 0.14s ease",
                    transform: hovered === i ? "translateY(-1px)" : "none",
                    boxShadow: hovered === i ? "0 4px 16px rgba(0,0,0,0.3)" : "none",
                  }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                      background: hovered === i ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: "#555", fontWeight: 700,
                      transition: "all 0.14s",
                    }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: 11.5, color: hovered === i ? "#d4d4d4" : "#666", lineHeight: 1.65, transition: "color 0.14s", whiteSpace: "pre-wrap" }}>
                        {t.length > 120 ? t.slice(0, 120) + "…" : t}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* footer */}
            <div style={{ padding: "4px 14px 16px" }}>
              <button onClick={() => setOpen(false)} style={{
                width: "100%", padding: "10px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10, cursor: "pointer",
                color: "#2a2a3a", fontSize: 11.5, fontWeight: 500,
                transition: "all 0.12s",
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "#555"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLElement).style.color = "#2a2a3a"; }}
              >Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── TriggerNode ────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: "comment_post", label: "User Comments on your post or reel" },
  { value: "dm",           label: "User DMs to you" },
  { value: "live_comment", label: "User Comments on your LIVE" },
  { value: "story_reply",  label: "User replies to your stories" },
];

type PostSummary = { id: string; caption: string; thumbnailUrl?: string; mediaUrl?: string; timestamp: string; mediaType?: string };

function TriggerNode({ data, onUpdate, dragMode }: NodeCardProps) {
  const selected = data.text ?? "comment_post";
  // subtitle = "all" means "all comments" mode; anything else = keyword mode
  const filterMode: "keywords" | "all" = data.subtitle === "all" ? "all" : "keywords";
  const [kw, setKw] = useState((data.buttons ?? []).map((b) => b.label).join(", "));

  const isComment = selected === "comment_post" || selected === "live_comment";

  function setMode(mode: "keywords" | "all") {
    if (mode === "all") {
      onUpdate({ subtitle: "all", buttons: [] });
      setKw("");
    } else {
      onUpdate({ subtitle: "keywords" });
    }
  }

  return (
    <NodeShell color="#f59e0b" glow dragMode={dragMode}>
      <NodeHeader icon={<Zap size={14} fill="#f59e0b" />} title="Select a Trigger" subtitle="When to run automation" color="#f59e0b" />
      <div style={{ padding: "9px 12px" }}>
        <div style={{ fontSize: 9.5, color: "#383848", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 7 }}>Trigger type</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {TRIGGER_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => onUpdate({ text: opt.value })}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 9, border: `1px solid ${selected === opt.value ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.05)"}`, background: selected === opt.value ? "rgba(255,255,255,0.08)" : "transparent", color: selected === opt.value ? "#e5e5e5" : "#555", fontSize: 11, fontWeight: 500, cursor: "pointer", textAlign: "left", transition: "all 0.14s" }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, background: opt.value === "dm" ? "transparent" : "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", border: opt.value === "dm" ? "1px solid #333" : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {opt.value === "dm" ? <MessageSquare size={10} color="#555" /> : <Zap size={9} color="#fff" fill="#fff" />}
              </div>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Comment filter — only relevant for comment/live triggers */}
        {isComment && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 9.5, color: "#2a2a3a", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 7 }}>
              Comment filter
            </div>
            {/* mode toggle */}
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              {([
                { id: "keywords", label: "By keyword" },
                { id: "all",      label: "All comments" },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  style={{
                    flex: 1, padding: "5px 0", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.14s",
                    border: `1px solid ${filterMode === m.id ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)"}`,
                    background: filterMode === m.id ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.03)",
                    color: filterMode === m.id ? "#e5e5e5" : "#3a3a4a",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {filterMode === "keywords" ? (
              <>
                <input
                  value={kw}
                  onChange={(e) => {
                    setKw(e.target.value);
                    onUpdate({ buttons: e.target.value.split(",").map((s) => s.trim()).filter(Boolean).map((k) => ({ label: k, payload: k })) });
                  }}
                  placeholder="e.g. link, info, price"
                  style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "6px 9px", fontSize: 11, color: "#aaa", outline: "none", boxSizing: "border-box" }}
                />
                <div style={{ fontSize: 9.5, color: "#2a2a3a", marginTop: 5, lineHeight: 1.4 }}>
                  Triggers only when comment contains one of these words. Comma-separated.
                </div>
              </>
            ) : (
              <div style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.18)", borderRadius: 8, padding: "7px 10px", fontSize: 11, color: "#6d5fa8", lineHeight: 1.5 }}>
                Triggers on <span style={{ color: "#d4d4d4", fontWeight: 600 }}>every comment</span> — regardless of what they write.
              </div>
            )}
          </div>
        )}
      </div>
    </NodeShell>
  );
}

// ── PostFilterNode ─────────────────────────────────────────────────────────

function PostPickerModal({ posts, loading, selectedIds, onToggle, onConfirm }: {
  posts: PostSummary[];
  loading: boolean;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onConfirm: () => void;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
    }} onMouseDown={(e) => e.stopPropagation()}>
      <div style={{
        background: "#0d0d1a",
        border: "1.5px solid rgba(124,58,237,0.3)",
        borderRadius: 20,
        width: 420,
        maxHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 0 0 1px rgba(124,58,237,0.1), 0 24px 60px rgba(0,0,0,0.8)",
        overflow: "hidden",
      }}>
        {/* header */}
        <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Images size={15} color="#888" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e5e5e5" }}>Select Posts</div>
            <div style={{ fontSize: 10.5, color: "#555", marginTop: 1 }}>
              {selectedIds.length === 0 ? "No posts selected" : `${selectedIds.length} post${selectedIds.length > 1 ? "s" : ""} selected`}
            </div>
          </div>
        </div>

        {/* grid */}
        <div style={{ overflowY: "auto", padding: "12px 14px", flex: 1 }}>
          {loading && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.03)", border: "2px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ width: "100%", paddingBottom: "100%", position: "relative" }}>
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 100%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && posts.length === 0 && (
            <div style={{ fontSize: 12, color: "#333", textAlign: "center", padding: "24px 0" }}>No posts found.</div>
          )}
          {!loading && posts.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {posts.map((p) => {
                const sel = selectedIds.includes(p.id);
                const thumb = p.thumbnailUrl || p.mediaUrl;
                return (
                  <button key={p.id} onClick={() => onToggle(p.id)} style={{
                    position: "relative", borderRadius: 10, overflow: "hidden",
                    border: `2px solid ${sel ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.05)"}`,
                    background: "rgba(255,255,255,0.03)", cursor: "pointer", padding: 0,
                    transition: "border-color 0.15s",
                    boxShadow: sel ? "0 0 10px rgba(124,58,237,0.35)" : "none",
                  }}>
                    <div style={{ width: "100%", paddingBottom: "100%", position: "relative", background: "#0a0a14" }}>
                      {thumb
                        ? <img src={thumb} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={18} color="#2a2a2a" /></div>
                      }
                      {sel && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(124,58,237,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 11, color: "#fff", lineHeight: 1 }}>✓</span>
                          </div>
                        </div>
                      )}
                      {p.mediaType === "VIDEO" && (
                        <div style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", borderRadius: 4, padding: "1px 4px", fontSize: 8, color: "#ccc" }}>▶</div>
                      )}
                    </div>
                    <div style={{ padding: "4px 6px 5px" }}>
                      <div style={{ fontSize: 9, color: sel ? "#d4d4d4" : "#444", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" as const }}>
                        {p.caption?.trim() || "No caption"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* confirm */}
        <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
          <button onClick={onConfirm} style={{
            width: "100%", padding: "10px 0", borderRadius: 10,
            background: selectedIds.length > 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${selectedIds.length > 0 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"}`,
            color: selectedIds.length > 0 ? "#e5e5e5" : "#333",
            fontSize: 13, fontWeight: 700, cursor: selectedIds.length > 0 ? "pointer" : "default",
            transition: "all 0.15s",
          }}>
            {selectedIds.length > 0 ? `Confirm ${selectedIds.length} post${selectedIds.length > 1 ? "s" : ""}` : "Select at least one post"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PostFilterNode({ data, onUpdate, onDelete, canDelete, dragMode }: NodeCardProps) {
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const confirmedIds: string[] = data.postIds ?? [];
  const noneSelected = confirmedIds.length === 0;

  // Load thumbnails on mount so compact strip renders without opening modal
  useEffect(() => {
    if (confirmedIds.length === 0) return;
    fetch("/api/ig/posts")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts ?? []))
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openModal() {
    setDraft([...confirmedIds]);
    setOpen(true);
    if (posts.length === 0) {
      setLoading(true);
      (async () => {
        try { await fetch("/api/ig/posts/sync", { method: "POST" }); } catch {}
        try {
          const d = await fetch("/api/ig/posts").then((r) => r.json());
          setPosts(d.posts ?? []);
        } catch {}
        setLoading(false);
      })();
    }
  }

  function toggle(id: string) {
    setDraft((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  }

  function confirm() {
    if (draft.length === 0) return;
    onUpdate({ postIds: draft });
    setOpen(false);
  }

  const selectedPosts = confirmedIds.map((id) => posts.find((p) => p.id === id)).filter(Boolean) as PostSummary[];

  return (
    <>
      {open && <PostPickerModal posts={posts} loading={loading} selectedIds={draft} onToggle={toggle} onConfirm={confirm} />}
      <div style={{
        background: "rgba(10,10,18,0.98)",
        border: `1.5px solid ${noneSelected ? "rgba(239,68,68,0.35)" : "rgba(124,58,237,0.25)"}`,
        borderRadius: 16,
        width: 288,
        overflow: "hidden",
        boxShadow: `0 0 0 1px ${noneSelected ? "rgba(239,68,68,0.1)" : "rgba(124,58,237,0.1)"}, 0 4px 24px rgba(0,0,0,0.6)`,
        cursor: dragMode ? "grab" : "default",
      }}>
        <div style={{ padding: "11px 13px 11px", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Images size={14} color="#888" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#e5e5e5" }}>Post Filter</div>
            <div style={{ fontSize: 10.5, color: noneSelected ? "#ef4444" : "#555", marginTop: 1 }}>
              {noneSelected ? "No posts selected" : `${confirmedIds.length} post${confirmedIds.length > 1 ? "s" : ""} selected`}
            </div>
          </div>
          <button onClick={openModal} style={{
            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 7, padding: "4px 9px", cursor: "pointer", color: "#aaa",
            fontSize: 10.5, fontWeight: 600, flexShrink: 0,
          }}>{confirmedIds.length === 0 ? "Add Post" : "Edit"}</button>
          {canDelete && onDelete && (
            <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "#2a2a2a", padding: 3, display: "flex", borderRadius: 6 }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ef4444")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#2a2a2a")}
            ><X size={13} /></button>
          )}
        </div>

        {/* selected post thumbnails strip */}
        {confirmedIds.length > 0 && (
          <div style={{ padding: "0 13px 11px", display: "flex", gap: 5 }}>
            {confirmedIds.slice(0, 5).map((id) => {
              const p = posts.find((x) => x.id === id);
              const thumb = p?.thumbnailUrl || p?.mediaUrl;
              return (
                <div key={id} style={{ width: 38, height: 38, borderRadius: 7, overflow: "hidden", background: "#0a0a14", border: "1.5px solid rgba(124,58,237,0.3)", flexShrink: 0, position: "relative" }}>
                  {thumb
                    ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={12} color="#333" /></div>
                  }
                </div>
              );
            })}
            {confirmedIds.length > 5 && (
              <div style={{ width: 38, height: 38, borderRadius: 7, background: "rgba(124,58,237,0.12)", border: "1.5px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 9, color: "#888", fontWeight: 700 }}>+{confirmedIds.length - 5}</span>
              </div>
            )}
          </div>
        )}

        {noneSelected && (
          <div style={{ margin: "0 13px 11px", fontSize: 10, color: "#ef4444", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 7, padding: "5px 8px" }}>
            Select at least one post to activate this automation.
          </div>
        )}
      </div>
    </>
  );
}

function OpeningMessageNode({ data, onUpdate, onDelete, canDelete, dragMode }: NodeCardProps) {
  const enabled = data.enabled !== false;
  return (
    <NodeShell color="#7c3aed" glow={enabled} dragMode={dragMode}>
      <NodeHeader icon={<MessageSquare size={14} />} title="Opening Message" subtitle="First message sent to user" color="#7c3aed" onDelete={onDelete} canDelete={canDelete} />
      <div style={{ padding: "7px 12px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 9.5, color: "#383848", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}>Message</span>
        <Toggle on={enabled} onChange={(v) => onUpdate({ enabled: v })} />
      </div>
      {enabled ? <MessageBody data={data} onUpdate={onUpdate} accentColor="#7c3aed" placeholder="Hey there! I'm so happy you're here..." nodeType="opening_message" /> : <div style={{ height: 10 }} />}
    </NodeShell>
  );
}

function TextMessageNode({ data, onUpdate, onDelete, canDelete, dragMode }: NodeCardProps) {
  return (
    <NodeShell color="#6366f1" dragMode={dragMode}>
      <NodeHeader icon={<MessageSquare size={14} />} title="Text Message" subtitle="Send a simple text or button response" color="#6366f1" onDelete={onDelete} canDelete={canDelete} />
      <MessageBody data={data} onUpdate={onUpdate} accentColor="#6366f1" placeholder="Your message here..." nodeType="text_message" />
    </NodeShell>
  );
}

function CardMessageNode({ data, onUpdate, onDelete, canDelete, dragMode }: NodeCardProps) {
  return (
    <NodeShell color="#ec4899" dragMode={dragMode}>
      <NodeHeader icon={<LayoutGrid size={14} />} title="Card Message" subtitle="Image via DM · Text via private reply" color="#ec4899" onDelete={onDelete} canDelete={canDelete} />
      <div style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ height: 68, border: "1px dashed rgba(236,72,153,0.2)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4, color: "#2a2a2a", background: "rgba(236,72,153,0.04)" }}>
          <ImageIcon size={15} /><span style={{ fontSize: 10 }}>Select an image · Max 15MB</span>
        </div>
        {(["title", "subtitle"] as const).map((key) => (
          <div key={key} style={{ position: "relative" }}>
            <input value={(data as unknown as Record<string, string>)[key] ?? ""} maxLength={80} onChange={(e) => onUpdate({ [key]: e.target.value })} placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "6px 28px 6px 9px", fontSize: 11, color: "#ccc", outline: "none", boxSizing: "border-box" }}
            />
            <span style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: "#222" }}>
              {((data as unknown as Record<string, string>)[key] ?? "").length}/80
            </span>
          </div>
        ))}
        <button onClick={() => onUpdate({ buttons: [...(data.buttons ?? []), { label: "", payload: "" }] })}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "rgba(236,72,153,0.07)", border: "1px dashed rgba(236,72,153,0.2)", borderRadius: 8, padding: "5px", fontSize: 10.5, color: "#ec4899", cursor: "pointer" }}>
          <Plus size={10} /> Add Button
        </button>
      </div>
    </NodeShell>
  );
}

function ImageMessageNode({ onDelete, canDelete, dragMode }: NodeCardProps) {
  return (
    <NodeShell color="#14b8a6" dragMode={dragMode}>
      <NodeHeader icon={<ImageIcon size={14} />} title="Image Message" subtitle="Sent as DM attachment (not private reply)" color="#14b8a6" onDelete={onDelete} canDelete={canDelete} />
      <div style={{ padding: "9px 12px" }}>
        <div style={{ height: 78, border: "1.5px dashed rgba(20,184,166,0.25)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 5, background: "rgba(20,184,166,0.04)", cursor: "pointer" }}>
          <ImageIcon size={17} color="#14b8a6" /><span style={{ fontSize: 10, color: "#14b8a6" }}>Click or drag image here</span>
        </div>
      </div>
    </NodeShell>
  );
}

function AskFollowNode({ data, onUpdate, onDelete, canDelete, dragMode, windowOpen }: NodeCardProps) {
  return (
    <NodeShell color="#f59e0b" dragMode={dragMode}>
      <NodeHeader icon={<UserPlus size={14} />} title="Ask For Follow" subtitle="Request users to follow your account" color="#f59e0b" onDelete={onDelete} canDelete={canDelete} />
      <div style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 9.5, color: "#3a3a4a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Message</div>
          <SuggestButton nodeType="ask_follow" onSelect={(t) => onUpdate({ text: t })} />
        </div>
        <textarea
          value={data.text ?? ""}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Follow @[username] then tap the button below 👇"
          rows={2}
          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,158,11,0.18)", borderRadius: 8, padding: "7px 9px", fontSize: 11, color: "#ccc", outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.5 }}
        />
        <div style={{ fontSize: 9.5, color: "#3a3a4a", lineHeight: 1.4 }}>
          Use <span style={{ color: "#f59e0b", fontFamily: "monospace" }}>[username]</span> as placeholder — replaced with your IG handle at send time.
        </div>
        {/* Confirm button — user taps this (postback), never types. Always paired
            with an auto-added "Visit Profile" link at send time. */}
        <div>
          <div style={{ fontSize: 9.5, color: "#3a3a4a", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>Confirm button</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "5px 9px" }}>
            <span style={{ fontSize: 12 }}>✓</span>
            <input
              value={data.buttons?.[0]?.label ?? ""}
              onChange={(e) => onUpdate({ buttons: [{ label: e.target.value, payload: "done" }] })}
              placeholder="I'm following ✓"
              style={{ flex: 1, background: "transparent", border: "none", fontSize: 11, color: "#f59e0b", outline: "none", fontWeight: 600 }}
            />
          </div>
          <div style={{ fontSize: 9.5, color: "#3a3a4a", lineHeight: 1.4, marginTop: 4 }}>
            User taps this to confirm — no typing. Defaults to <span style={{ color: "#f59e0b" }}>I&apos;m following ✓</span>.
          </div>
        </div>
        {windowOpen === false && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, background: "rgba(251,146,60,0.07)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: 8, padding: "7px 10px", fontSize: 10.5, color: "#fb923c", lineHeight: 1.4 }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>⚠</span>
            Opening Message disabled — this step won't execute
          </div>
        )}
      </div>
    </NodeShell>
  );
}

function LeadFormNode({ data, onUpdate, onDelete, canDelete, dragMode }: NodeCardProps) {
  return (
    <NodeShell color="#a855f7" dragMode={dragMode}>
      <NodeHeader icon={<ClipboardList size={14} />} title="Lead Form" subtitle="Request users to input text" color="#a855f7" onDelete={onDelete} canDelete={canDelete} />
      <div style={{ padding: "9px 12px" }}>
        <input value={data.question ?? ""} onChange={(e) => onUpdate({ question: e.target.value })} placeholder="What's your question?"
          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 8, padding: "7px 9px", fontSize: 11, color: "#ccc", outline: "none", boxSizing: "border-box" }}
        />
      </div>
    </NodeShell>
  );
}

// ── FollowGateNode ─────────────────────────────────────────────────────────

function FollowGateNode({ data, onUpdate, onDelete, canDelete, dragMode }: NodeCardProps) {
  return (
    <NodeShell color="#ec4899" dragMode={dragMode}>
      <NodeHeader icon={<UserPlus size={14} />} title="Follow Gate" subtitle="Only proceeds if user is following" color="#ec4899" onDelete={onDelete} canDelete={canDelete} />
      <div style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 9 }}>

        {/* flow diagram */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 9px", borderRadius: 8, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)" }}>
            <span style={{ fontSize: 13 }}>✓</span>
            <span style={{ fontSize: 10.5, color: "#22c55e" }}>Following → continues to next node</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 9px", borderRadius: 8, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <span style={{ fontSize: 13 }}>✗</span>
            <span style={{ fontSize: 10.5, color: "#f87171" }}>Not following → sends gate message below</span>
          </div>
        </div>

        {/* not-following message */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <div style={{ fontSize: 9.5, color: "#3a3a4a", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Message when not following</div>
            <SuggestButton nodeType="follow_gate" onSelect={(t) => onUpdate({ text: t })} />
          </div>
          <textarea
            value={data.text ?? ""}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder={"Oops! 😅 This is for our community only 💜\n\nFollow @[username] to unlock it!\n\nReply \"done\" once you've followed 👇"}
            rows={4}
            style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(236,72,153,0.2)", borderRadius: 8, padding: "7px 9px", fontSize: 11, color: "#ccc", outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.5 }}
          />
          <div style={{ fontSize: 9.5, color: "#2a2a3a", marginTop: 4, lineHeight: 1.4 }}>
            Use <span style={{ color: "#ec4899", fontFamily: "monospace" }}>[username]</span> — replaced with your IG handle. User replies "done" → re-checks follow status.
          </div>
        </div>
      </div>
    </NodeShell>
  );
}

const DELAY_OPTS = [1, 5, 10, 15, 30, 60, 120, 180, 360, 720, 1410];
function FollowupMessageNode({ data, onUpdate, onDelete, canDelete, dragMode, windowOpen }: NodeCardProps) {
  const d = data.delayMinutes ?? 60;
  const fmt = (m: number) => m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;
  return (
    <NodeShell color="#f97316" dragMode={dragMode}>
      <NodeHeader icon={<Clock size={14} />} title="Follow-up Message" subtitle={`Sent after ${fmt(d)} delay`} color="#f97316" onDelete={onDelete} canDelete={canDelete} />
      <div style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
        <textarea value={data.text ?? ""} onChange={(e) => onUpdate({ text: e.target.value })} placeholder="Follow-up message..." rows={2}
          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "7px 9px", fontSize: 11, color: "#ccc", outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.5 }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {DELAY_OPTS.map((opt) => (
            <button key={opt} onClick={() => onUpdate({ delayMinutes: opt })}
              style={{ padding: "3px 7px", borderRadius: 5, border: `1px solid ${d === opt ? "#f97316" : "rgba(255,255,255,0.06)"}`, background: d === opt ? "rgba(249,115,22,0.13)" : "transparent", color: d === opt ? "#f97316" : "#383838", fontSize: 10, cursor: "pointer" }}>
              {fmt(opt)}
            </button>
          ))}
        </div>
        {windowOpen === false ? (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, background: "rgba(251,146,60,0.07)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: 8, padding: "7px 10px", fontSize: 10.5, color: "#fb923c", lineHeight: 1.4 }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>⚠</span>
            Opening Message disabled — this step won't execute
          </div>
        ) : (
          <div style={{ fontSize: 10, color: "#7c2d12", background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.09)", borderRadius: 6, padding: "4px 7px", lineHeight: 1.4 }}>
            Sends after delay once Opening Message is delivered.
          </div>
        )}
      </div>
    </NodeShell>
  );
}

function RenderNode({ node, onUpdate, onDelete, canDelete, dragMode, windowOpen }: { node: AutomationNode; onUpdate: (p: Partial<AutomationNodeData>) => void; onDelete: () => void; canDelete: boolean; dragMode?: boolean; windowOpen?: boolean }) {
  const props: NodeCardProps = { data: node.data, onUpdate, onDelete, canDelete, dragMode, windowOpen };
  switch (node.type) {
    case "trigger":          return <TriggerNode {...props} />;
    case "post_filter":      return <PostFilterNode {...props} />;
    case "opening_message":  return <OpeningMessageNode {...props} />;
    case "text_message":     return <TextMessageNode {...props} />;
    case "card_message":     return <CardMessageNode {...props} />;
    case "image_message":    return <ImageMessageNode {...props} />;
    case "ask_follow":       return <AskFollowNode {...props} />;
    case "follow_gate":      return <FollowGateNode {...props} />;
    case "lead_form":        return <LeadFormNode {...props} />;
    case "followup_message": return <FollowupMessageNode {...props} />;
    default:                 return null;
  }
}

// ── AddResponsePanel (right slide) ─────────────────────────────────────────

const RESPONSE_TYPES: { type: AutomationNodeType; label: string; desc: string; color: string; icon: React.ReactNode; badge?: string }[] = [
  { type: "opening_message",  label: "Opening Message",   desc: "First DM — send before anything else",         color: "#7c3aed", icon: <MessageSquare size={16} /> },
  { type: "follow_gate",      label: "Follow Gate",       desc: "Skip if following · ask if not · resume on follow", color: "#22c55e", icon: <UserPlus size={16} />, badge: "Smart" },
  { type: "text_message",     label: "Text Message",      desc: "Send a link, info, or any text message",       color: "#6366f1", icon: <MessageSquare size={16} /> },
  { type: "card_message",     label: "Card Message",      desc: "Rich card with image, title and button",       color: "#ec4899", icon: <LayoutGrid size={16} /> },
  { type: "image_message",    label: "Image Message",     desc: "Send an image via DM attachment",              color: "#14b8a6", icon: <ImageIcon size={16} /> },
  { type: "ask_follow",       label: "Ask For Follow",    desc: "Simple follow request — always sends, no check", color: "#f59e0b", icon: <UserPlus size={16} /> },
  { type: "lead_form",        label: "Lead Form",         desc: "Ask user to input text (email, name, etc.)",   color: "#a855f7", icon: <ClipboardList size={16} /> },
  { type: "followup_message", label: "Follow-up Message", desc: "Send a delayed follow-up after the flow",      color: "#f97316", icon: <Clock size={16} /> },
];


function AddResponsePanel({ open, onClose, onAdd, nodes }: {
  open: boolean;
  onClose: () => void;
  onAdd: (t: AutomationNodeType) => void;
  nodes: AutomationNode[];
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          style={{
            position: "absolute", right: 0, top: 0, bottom: 0,
            width: 310,
            background: "rgba(8,8,16,0.97)",
            borderLeft: "1px solid rgba(124,58,237,0.18)",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            boxShadow: "-6px 0 40px rgba(0,0,0,0.6), -1px 0 0 rgba(124,58,237,0.1)",
          }}
        >
          {/* header */}
          <div style={{ padding: "16px 16px 13px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e5e5e5" }}>Add Response</div>
              <div style={{ fontSize: 10.5, color: "#333", marginTop: 2 }}>Choose next step in your flow</div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", color: "#555", display: "flex", borderRadius: 8, padding: "5px" }}>
              <X size={14} />
            </button>
          </div>

          {/* list */}
          <div style={{ flex: 1, overflow: "auto", padding: "8px 8px 16px" }}>
            {RESPONSE_TYPES.map((rt, idx) => {
              const validation = getNodeValidation(rt.type, nodes);
              const blocked = validation.status === "blocked";
              const warning = validation.message ?? null;
              return (
                <motion.button
                  key={rt.type}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04, type: "spring", stiffness: 400, damping: 32 }}
                  draggable={!blocked}
                  onDragStart={(e) => {
                    if (blocked) { (e as unknown as DragEvent).preventDefault?.(); return; }
                    const de = e as unknown as DragEvent;
                    de.dataTransfer?.setData("nodeType", rt.type);
                    if (de.dataTransfer) de.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => { if (!blocked) { onAdd(rt.type); onClose(); } }}
                  style={{
                    width: "100%", display: "flex", alignItems: "flex-start", gap: 11,
                    padding: "11px 11px", borderRadius: 11,
                    border: "1px solid transparent", background: "transparent",
                    cursor: blocked ? "not-allowed" : "grab",
                    textAlign: "left", marginBottom: 3,
                    opacity: blocked ? 0.65 : 1,
                  }}
                  whileHover={blocked ? {} : { background: "rgba(124,58,237,0.07)", borderColor: "rgba(124,58,237,0.18)" }}
                  whileTap={blocked ? {} : { scale: 0.98 }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${rt.color}18`, border: `1px solid ${rt.color}2e`, display: "flex", alignItems: "center", justifyContent: "center", color: rt.color, flexShrink: 0, marginTop: warning ? 2 : 0 }}>
                    {rt.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: blocked ? "#555" : "#e5e5e5" }}>{rt.label}</span>
                      {rt.badge && <span style={{ fontSize: 9, fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", padding: "1px 6px", borderRadius: 4, letterSpacing: "0.04em" }}>{rt.badge}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "#3a3a4a", marginBottom: warning ? 5 : 0 }}>{rt.desc}</div>
                    {warning && (
                      <div style={{ fontSize: 11, color: "#f87171", fontWeight: 500, lineHeight: 1.4 }}>
                        {warning}
                      </div>
                    )}
                  </div>
                  {!blocked && <ChevronRight size={13} color="#2a2a2a" style={{ marginTop: 2, flexShrink: 0 }} />}
                </motion.button>
              );
            })}
          </div>

          {/* flow hint */}
          <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: "#2a2a3a", lineHeight: 1.6 }}>
              Selected step connects to the last node in your flow automatically.
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Free drag canvas ───────────────────────────────────────────────────────

type Pos = { x: number; y: number };

function FreeDragCanvas({ nodes, onNodesUpdate, onUpdate, onDelete, drawerOpen, onDropAdd, onDragOverChange }: {
  nodes: AutomationNode[];
  onNodesUpdate: (ns: AutomationNode[]) => void;
  onUpdate: (id: string, p: Partial<AutomationNodeData>) => void;
  onDelete: (id: string) => void;
  drawerOpen: boolean;
  onDropAdd: (type: AutomationNodeType, pos: { x: number; y: number }) => void;
  onDragOverChange: (v: boolean) => void;
}) {
  const NODE_W = 288;
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [positions, setPositions] = useState<Record<string, Pos>>(() => {
    const map: Record<string, Pos> = {};
    nodes.forEach((n, i) => {
      if (n.position?.x || n.position?.y) {
        map[n.id] = { x: n.position.x, y: n.position.y };
      } else {
        // smart-grid fallback: 2-col snake so nodes aren't piled at origin
        const FCOLS = 2, FNW = 288, FHGAP = 60, FVGAP = 60, FPADX = 56, FPADY = 48;
        const row = Math.floor(i / FCOLS);
        const col = i % FCOLS;
        const xCol = row % 2 === 0 ? col : (FCOLS - 1 - col);
        map[n.id] = { x: FPADX + xCol * (FNW + FHGAP), y: FPADY + row * (320 + FVGAP) };
      }
    });
    return map;
  });
  const [heights, setHeights] = useState<Record<string, number>>({});
  const dragging = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  // ensure new nodes get a position
  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };
      let changed = false;
      nodes.forEach((n, i) => {
        if (!next[n.id]) {
          const lastPos = Object.values(next).reduce((max, p) => p.y > max.y ? p : max, { x: 120, y: 0 });
          next[n.id] = { x: lastPos.x, y: lastPos.y + 260 };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [nodes]);

  // measure heights — only update state when a value actually changed
  useLayoutEffect(() => {
    const h: Record<string, number> = {};
    nodeRefs.current.forEach((el, id) => { if (el) h[id] = el.offsetHeight; });
    setHeights((prev) => {
      const keys = new Set([...Object.keys(prev), ...Object.keys(h)]);
      for (const k of keys) if (prev[k] !== h[k]) return h;
      return prev;
    });
  });

  const onMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const pos = positions[id] ?? { x: 0, y: 0 };
    dragging.current = { id, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const { id, startX, startY, origX, origY } = dragging.current;
    setPositions((prev) => ({ ...prev, [id]: { x: origX + e.clientX - startX, y: origY + e.clientY - startY } }));
  };

  const onMouseUp = () => {
    if (!dragging.current) return;
    const { id } = dragging.current;
    const pos = positions[id];
    onNodesUpdate(nodes.map((n) => n.id === id ? { ...n, position: pos } : n));
    dragging.current = null;
  };

  // compute canvas size
  const maxX = Math.max(...nodes.map((n) => (positions[n.id]?.x ?? 0) + NODE_W + 80), 900);
  const maxY = Math.max(...nodes.map((n) => (positions[n.id]?.y ?? 0) + (heights[n.id] ?? 220) + 80), 700);

  return (
    <div
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onDragOver={(e) => { e.preventDefault(); onDragOverChange(true); }}
      onDragLeave={() => onDragOverChange(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDragOverChange(false);
        const type = e.dataTransfer.getData("nodeType") as AutomationNodeType;
        if (!type || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + containerRef.current.scrollLeft - 144;
        const y = e.clientY - rect.top + containerRef.current.scrollTop - 30;
        onDropAdd(type, { x: Math.max(10, x), y: Math.max(10, y) });
      }}
      style={{ flex: 1, overflow: "auto", position: "relative", cursor: dragging.current ? "grabbing" : "default" }}
    >
      <div style={{ position: "relative", width: maxX, height: maxY, minWidth: "100%", minHeight: "100%" }}>
        {/* SVG connection lines */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <circle cx="4" cy="4" r="3" fill="#7c3aed" />
            </marker>
          </defs>
          {nodes.slice(0, -1).map((n, i) => {
            const src = positions[n.id];
            const tgt = positions[nodes[i + 1].id];
            if (!src || !tgt) return null;
            const srcH = heights[n.id] ?? 220;
            const x1 = src.x + NODE_W / 2;
            const y1 = src.y + srcH;
            const x2 = tgt.x + NODE_W / 2;
            const y2 = tgt.y;
            const cy = (y1 + y2) / 2;
            return (
              <g key={`${n.id}-edge`}>
                <path d={`M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`}
                  fill="none" stroke="#7c3aed" strokeWidth="2" strokeDasharray="6 4" opacity="0.7" />
                <circle cx={x2} cy={y2} r="4" fill="#7c3aed" style={{ filter: "drop-shadow(0 0 4px #7c3aed)" }} />
              </g>
            );
          })}
        </svg>

        {/* nodes */}
        {nodes.map((node) => {
          const pos = positions[node.id] ?? { x: 120, y: 60 };
          return (
            <div key={node.id}
              ref={(el) => { if (el) nodeRefs.current.set(node.id, el); else nodeRefs.current.delete(node.id); }}
              onMouseDown={(e) => onMouseDown(e, node.id)}
              style={{ position: "absolute", left: pos.x, top: pos.y, userSelect: "none" }}
            >
              <RenderNode node={node} onUpdate={(p) => onUpdate(node.id, p)} onDelete={() => onDelete(node.id)} canDelete={node.type !== "trigger"} dragMode windowOpen={computeWindowOpen(nodes)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SmartGridCanvas ────────────────────────────────────────────────────────

const SG_NODE_W = 288;
const SG_HGAP   = 56;
const SG_VGAP   = 56;
const SG_PAD_X  = 56;
const SG_PAD_Y  = 48;

interface SGPos { x: number; y: number; row: number; xCol: number }

function SmartGridCanvas({ nodes, onUpdate, onDelete, onDropAdd, onDragOverChange }: {
  nodes: AutomationNode[];
  onUpdate: (id: string, p: Partial<AutomationNodeData>) => void;
  onDelete: (id: string) => void;
  onDropAdd: (type: AutomationNodeType) => void;
  onDragOverChange: (v: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs     = useRef<Map<string, HTMLDivElement>>(new Map());
  const [containerW, setContainerW] = useState(800);
  const [heights, setHeights]       = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([e]) => setContainerW(e.contentRect.width));
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useLayoutEffect(() => {
    const h: Record<string, number> = {};
    nodeRefs.current.forEach((el, id) => { if (el) h[id] = el.offsetHeight; });
    setHeights(prev => {
      const keys = new Set([...Object.keys(prev), ...Object.keys(h)]);
      for (const k of keys) if (prev[k] !== h[k]) return h;
      return prev;
    });
  });

  const cols = Math.max(1, Math.floor((containerW - SG_PAD_X * 2 + SG_HGAP) / (SG_NODE_W + SG_HGAP)));

  // compute positions — snake pattern
  const positions: SGPos[] = [];
  let rowY = SG_PAD_Y;
  let ni = 0;
  while (ni < nodes.length) {
    const row = Math.floor(ni / cols);
    const isOdd = row % 2 === 1;
    let rowMaxH = 0;
    for (let c = 0; c < cols && ni + c < nodes.length; c++)
      rowMaxH = Math.max(rowMaxH, heights[nodes[ni + c].id] ?? 280);
    for (let c = 0; c < cols && ni < nodes.length; c++, ni++) {
      const xCol = isOdd ? (cols - 1 - c) : c;
      positions.push({ x: SG_PAD_X + xCol * (SG_NODE_W + SG_HGAP), y: rowY, row, xCol });
    }
    rowY += rowMaxH + SG_VGAP;
  }
  const canvasH = rowY + SG_PAD_Y;
  const canvasW = SG_PAD_X * 2 + cols * SG_NODE_W + (cols - 1) * SG_HGAP;

  // px from node top where horizontal lines attach (node header zone)
  const CONN_Y = 44;

  // connector path between node i and i+1
  function connPath(i: number): { d: string; dotX: number; dotY: number } {
    const src = positions[i], tgt = positions[i + 1];
    const srcH = heights[nodes[i].id] ?? 80;

    if (src.row === tgt.row) {
      // horizontal — enter/exit at CONN_Y from top of each node (header level)
      const isOdd = src.row % 2 === 1;
      const x1 = isOdd ? src.x : src.x + SG_NODE_W;
      const y1 = src.y + CONN_Y;
      const x2 = isOdd ? tgt.x + SG_NODE_W : tgt.x;
      const y2 = tgt.y + CONN_Y;
      const mx = (x1 + x2) / 2;
      return { d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`, dotX: x2, dotY: y2 };
    }

    // vertical wrap — exit ACTUAL bottom of src, enter ACTUAL top of tgt
    const x = src.x + SG_NODE_W / 2;
    const y1 = src.y + srcH;
    const y2 = tgt.y;
    const cy = (y1 + y2) / 2;
    return { d: `M ${x} ${y1} C ${x} ${cy}, ${x} ${cy}, ${x} ${y2}`, dotX: x, dotY: y2 };
  }

  return (
    <div ref={containerRef} style={{ flex: 1, overflow: "auto", position: "relative" }}
      onDragOver={(e) => { e.preventDefault(); onDragOverChange(true); }}
      onDragLeave={() => onDragOverChange(false)}
      onDrop={(e) => { e.preventDefault(); onDragOverChange(false); const t = e.dataTransfer.getData("nodeType") as AutomationNodeType; if (t) onDropAdd(t); }}
    >
      <div style={{ position: "relative", width: Math.max(canvasW, containerW), height: Math.max(canvasH, 400), minHeight: "100%" }}>
        {nodes.map((node, i) => (
          <div key={node.id}
            ref={(el) => { if (el) nodeRefs.current.set(node.id, el); else nodeRefs.current.delete(node.id); }}
            style={{ position: "absolute", left: positions[i]?.x ?? 0, top: positions[i]?.y ?? 0, width: SG_NODE_W }}
          >
            <RenderNode node={node} onUpdate={(p) => onUpdate(node.id, p)} onDelete={() => onDelete(node.id)} canDelete={node.type !== "trigger"} windowOpen={computeWindowOpen(nodes)} />
          </div>
        ))}
        {/* SVG rendered after nodes so connectors draw on top */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 10 }}>
          {nodes.slice(0, -1).map((n, i) => {
            const { d, dotX, dotY } = connPath(i);
            return (
              <g key={`e-${n.id}`}>
                <path d={d} fill="none" stroke="#7c3aed" strokeWidth="2" strokeDasharray="5 4" opacity="0.65" />
                <circle cx={dotX} cy={dotY} r="4" fill="#7c3aed" style={{ filter: "drop-shadow(0 0 4px #7c3aed)" }} />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── AutomationCanvas ───────────────────────────────────────────────────────

let nodeSeq = 0;

function AutomationCanvas({ automation, onSave }: { automation: Automation; onSave: (patch: Partial<Automation>) => Promise<void> }) {
  const [nodes, setNodes] = useState<AutomationNode[]>(automation.nodes);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const prevPostIdsRef = useRef<string[]>([]);
  const [freeMode, setFreeMode] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testText, setTestText] = useState("");
  const [testRunning, setTestRunning] = useState(false);
  const [testSteps, setTestSteps] = useState<{ nodeType: string; action: string; text: string }[] | null>(null);

  // Fix 6 — beforeunload when dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Smart: auto-open Add Response when user confirms posts in PostFilterNode and has no message nodes yet
  useEffect(() => {
    const pf = nodes.find((n) => n.type === "post_filter");
    const currIds = pf?.data.postIds ?? [];
    const prevIds = prevPostIdsRef.current;
    prevPostIdsRef.current = currIds;
    if (prevIds.length === 0 && currIds.length > 0) {
      const hasMessages = nodes.some((n) => !["trigger", "post_filter"].includes(n.type));
      if (!hasMessages) setPanelOpen(true);
    }
  }, [nodes]);

  useEffect(() => {
    // ensure post_filter exists for comment/live triggers on load
    const ns = [...automation.nodes];
    const trigger = ns.find((n) => n.type === "trigger");
    const triggerType = trigger?.data.text ?? "comment_post";
    const needsPostFilter = triggerType === "comment_post" || triggerType === "live_comment";
    const hasPostFilter = ns.some((n) => n.type === "post_filter");
    if (needsPostFilter && !hasPostFilter && trigger) {
      const idx = ns.indexOf(trigger);
      const pf: import("@/lib/ig/store").AutomationNode = {
        id: `node_post_filter_${Date.now().toString(36)}`,
        type: "post_filter", position: { x: 0, y: 0 }, data: { postIds: [] },
      };
      ns.splice(idx + 1, 0, pf);
    }
    setNodes(ns);
    setIsDirty(false);
    setTestSteps(null);
  }, [automation.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function runTest() {
    if (!testText.trim()) return;
    setTestRunning(true);
    setTestSteps(null);
    try {
      const r = await fetch(`/api/ig/automations/${automation.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: testText }),
      });
      const d = await r.json();
      setTestSteps(d.steps ?? []);
    } catch {
      toast.error("Test failed");
    }
    setTestRunning(false);
  }

  const updateNode = useCallback((id: string, patch: Partial<AutomationNodeData>) => {
    setNodes((ns) => {
      const updated = ns.map((n) => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n);
      // auto-insert post_filter after trigger when trigger = comment_post/live_comment
      const trigger = updated.find((n) => n.type === "trigger");
      if (trigger && trigger.id === id && "text" in patch) {
        const triggerType = patch.text ?? trigger.data.text;
        const needsPostFilter = triggerType === "comment_post" || triggerType === "live_comment";
        const hasPostFilter = updated.some((n) => n.type === "post_filter");
        if (needsPostFilter && !hasPostFilter) {
          const pfId = `node_post_filter_${Date.now().toString(36)}`;
          const pfNode: import("@/lib/ig/store").AutomationNode = {
            id: pfId, type: "post_filter", position: { x: 0, y: 0 }, data: { postIds: [] },
          };
          return [updated[0], pfNode, ...updated.slice(1)];
        }
        if (!needsPostFilter) {
          return updated.filter((n) => n.type !== "post_filter");
        }
      }
      return updated;
    });
    setIsDirty(true);
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setIsDirty(true);
  }, []);

  function addNode(type: AutomationNodeType, dropPos?: { x: number; y: number }) {
    const validation = getNodeValidation(type, nodes);
    if (validation.status === "blocked") { toast.error(validation.message ?? "Cannot add this node"); return; }
    const id = `node_${type}_${++nodeSeq}_${Date.now().toString(36)}`;
    const last = nodes[nodes.length - 1];
    const lastPos = last?.position ?? { x: 120, y: 0 };
    const position = dropPos ?? (freeMode
      ? { x: lastPos.x, y: lastPos.y + 260 }
      : { x: 0, y: 0 });
    const defaultText = NODE_DEFAULTS[type];
    const newNode: AutomationNode = { id, type, position, data: { enabled: true, ...(defaultText ? { text: defaultText } : {}) } };
    setNodes((ns) => {
      const next = [...ns];
      if (type === "opening_message") {
        // insert right after last trigger/post_filter
        const rev = [...ns].reverse().findIndex((n) => n.type === "trigger" || n.type === "post_filter");
        const idx = rev === -1 ? 0 : ns.length - 1 - rev;
        next.splice(idx + 1, 0, newNode);
        return next;
      }
      if (type === "ask_follow" || type === "follow_gate") {
        // always insert right after opening_message
        const omIdx = ns.findIndex((n) => n.type === "opening_message");
        if (omIdx !== -1) { next.splice(omIdx + 1, 0, newNode); return next; }
        // fallback: after last structural node
        const rev = [...ns].reverse().findIndex((n) => n.type === "trigger" || n.type === "post_filter");
        const idx = rev === -1 ? 0 : ns.length - 1 - rev;
        next.splice(idx + 1, 0, newNode);
        return next;
      }
      return [...ns, newNode];
    });
    setIsDirty(true);
  }

  function handleCanvasDrop(e: React.DragEvent, scrollEl: HTMLElement | null) {
    e.preventDefault();
    setIsDragOver(false);
    const type = e.dataTransfer.getData("nodeType") as AutomationNodeType;
    if (!type) return;
    if (freeMode && scrollEl) {
      const rect = scrollEl.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollEl.scrollLeft - 144;
      const y = e.clientY - rect.top + scrollEl.scrollTop - 30;
      addNode(type, { x: Math.max(10, x), y: Math.max(10, y) });
    } else {
      addNode(type);
    }
  }

  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const edges = nodes.slice(0, -1).map((n, i) => ({
        id: `e_${n.id}_${nodes[i + 1].id}`,
        source: n.id, target: nodes[i + 1].id,
      }));
      const triggerNode = nodes.find((n) => n.type === "trigger");
      const postFilterNode = nodes.find((n) => n.type === "post_filter");
      const triggerPatch = triggerNode ? {
        type: (triggerNode.data.text ?? "comment_post") as import("@/lib/ig/store").AutomationTriggerType,
        keywords: (triggerNode.data.buttons ?? []).map((b) => b.label).filter(Boolean),
        postIds: postFilterNode?.data.postIds ?? [],
      } : undefined;
      await onSave({ nodes, edges, ...(triggerPatch ? { trigger: triggerPatch } : {}) });
      setIsDirty(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setSaving(false);
    }
  }


  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* purple dots bg */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: "#07070f", backgroundImage: "radial-gradient(circle, rgba(139,92,246,0.4) 1.2px, transparent 1.2px)", backgroundSize: "26px 26px", zIndex: 0 }} />

      {/* toolbar */}
      <div style={{ position: "relative", zIndex: 5, display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(7,7,15,0.7)", backdropFilter: "blur(8px)", flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: "#2a2a3a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 4 }}>Mode</span>
        {([false, true] as boolean[]).map((fm) => (
          <button key={String(fm)} onClick={() => setFreeMode(fm)}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 7, border: `1px solid ${freeMode === fm ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)"}`, background: freeMode === fm ? "rgba(255,255,255,0.08)" : "transparent", color: freeMode === fm ? "#e5e5e5" : "#383838", fontSize: 11, fontWeight: 500, cursor: "pointer", transition: "all 0.14s" }}>
            {fm ? <Move size={11} /> : <Lock size={11} />}
            {fm ? "Free" : "Fixed"}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {/* Fix 7 — Test button */}
        <button
          onClick={() => { setTestOpen((v) => !v); setTestSteps(null); }}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.07)", background: testOpen ? "rgba(255,255,255,0.06)" : "transparent", color: "#555", fontSize: 11, fontWeight: 500, cursor: "pointer" }}
        >
          ▶ Test
        </button>
        <button
          onClick={save}
          disabled={saving || (!isDirty && !savedFlash)}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 16px", borderRadius: 8,
            background: savedFlash ? "rgba(34,197,94,0.15)" : isDirty ? "rgba(255,255,255,0.1)" : "transparent",
            border: `1px solid ${savedFlash ? "rgba(34,197,94,0.3)" : isDirty ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)"}`,
            color: savedFlash ? "#22c55e" : isDirty ? "#e5e5e5" : "#2a2a3a",
            fontSize: 11.5, fontWeight: 600,
            cursor: isDirty && !saving ? "pointer" : "default",
            transition: "all 0.2s",
            opacity: saving ? 0.7 : 1,
          }}>
          {saving ? "Saving…" : savedFlash ? "✓ Saved" : "Save"}
        </button>
      </div>

      {/* Fix 7 — Test panel */}
      <AnimatePresence>
        {testOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 36 }}
            style={{ position: "relative", zIndex: 6, overflow: "hidden", background: "rgba(8,8,18,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}
          >
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 10, color: "#444", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Dry Run — simulates trigger without sending anything</div>
              <div style={{ display: "flex", gap: 7 }}>
                <input
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runTest()}
                  placeholder='Type a comment to simulate, e.g. "send me the link"'
                  style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "#ccc", outline: "none" }}
                />
                <button
                  onClick={runTest}
                  disabled={testRunning || !testText.trim()}
                  style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.14)", color: "#d4d4d4", fontSize: 11, fontWeight: 600, cursor: "pointer", opacity: testRunning || !testText.trim() ? 0.4 : 1 }}
                >
                  {testRunning ? "Running…" : "Run"}
                </button>
              </div>
              {testSteps !== null && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {testSteps.length === 0 ? (
                    <div style={{ fontSize: 11, color: "#ef4444" }}>No steps would execute — check trigger keyword and node config.</div>
                  ) : (
                    testSteps.map((step, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)", borderRadius: 7, padding: "6px 10px" }}>
                        <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                        <div>
                          <div style={{ fontSize: 10.5, color: "#555", marginBottom: 2 }}>{step.nodeType.replace(/_/g, " ")} → {step.action}</div>
                          <div style={{ fontSize: 11, color: "#ccc", lineHeight: 1.4 }}>{step.text.slice(0, 120)}{step.text.length > 120 ? "…" : ""}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* canvas body */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex" }}>
        {/* drop zone highlight */}
        <AnimatePresence>
          {isDragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute", inset: 0, zIndex: 30, pointerEvents: "none",
                border: "2px dashed rgba(124,58,237,0.6)",
                borderRadius: 4,
                background: "rgba(124,58,237,0.05)",
                boxShadow: "inset 0 0 60px rgba(124,58,237,0.08)",
              }}
            />
          )}
        </AnimatePresence>

        {freeMode ? (
          <FreeDragCanvas
            nodes={nodes}
            onNodesUpdate={(ns) => { setNodes(ns); setIsDirty(true); }}
            onUpdate={updateNode}
            onDelete={deleteNode}
            drawerOpen={panelOpen}
            onDropAdd={(type, pos) => addNode(type, pos)}
            onDragOverChange={setIsDragOver}
          />
        ) : (
          <SmartGridCanvas
            nodes={nodes}
            onUpdate={updateNode}
            onDelete={deleteNode}
            onDropAdd={(type) => addNode(type)}
            onDragOverChange={setIsDragOver}
          />
        )}

        {/* right slide panel */}
        <AddResponsePanel open={panelOpen} onClose={() => setPanelOpen(false)} onAdd={addNode} nodes={nodes} />
      </div>

      {/* floating Add Response button */}
      <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 20 }}>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setPanelOpen((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 24px", borderRadius: 50, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", color: "#e5e5e5", fontSize: 13.5, fontWeight: 600, cursor: "pointer", backdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
          <Plus size={15} strokeWidth={2.5} /> Add Response
        </motion.button>
      </div>
    </div>
  );
}

// ── AutomationsView ────────────────────────────────────────────────────────

export function AutomationsView({ onBack }: { onBack?: () => void }) {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameVal, setNameVal] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // Fix 5

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const r = await fetch("/api/ig/automations");
      const d = await r.json();
      setAutomations(d.automations ?? []);
      if (!selected && d.automations?.length) setSelected(d.automations[0].id);
    } catch {}
    if (!silent) setLoading(false);
  }

  useEffect(() => {
    load();
    // Fix 8 — refresh stats every 30s
    const interval = setInterval(() => load(true), 30_000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function createNew() {
    setCreating(true);
    try {
      const r = await fetch("/api/ig/automations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "New Automation" }) });
      const d = await r.json();
      setAutomations((prev) => [...prev, d.automation]);
      setSelected(d.automation.id);
    } catch {}
    setCreating(false);
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    await fetch(`/api/ig/automations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
    setAutomations((prev) => prev.map((a) => a.id === id ? { ...a, enabled } : a));
  }

  async function deleteAuto(id: string) {
    await fetch(`/api/ig/automations/${id}`, { method: "DELETE" });
    setAutomations((prev) => { const next = prev.filter((a) => a.id !== id); if (selected === id) setSelected(next[0]?.id ?? null); return next; });
  }

  async function saveAuto(patch: Partial<Automation>) {
    if (!selected) return;
    const r = await fetch(`/api/ig/automations/${selected}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const d = await r.json();
    setAutomations((prev) => prev.map((a) => a.id === selected ? d.automation : a));
  }

  async function saveName(id: string, name: string) {
    await fetch(`/api/ig/automations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    setAutomations((prev) => prev.map((a) => a.id === id ? { ...a, name } : a));
    setEditingName(null);
  }

  const currentAuto = automations.find((a) => a.id === selected);

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <style>{`
        .auto-rail { width: 44px; transition: width 0.18s ease; overflow: hidden; }
        .auto-rail:hover { width: 186px; }
        .auto-rail:hover .rail-label { opacity: 1; }
        .rail-label { opacity: 0; transition: opacity 0.12s ease 0.06s; white-space: nowrap; }
        [data-auto-row]:hover .auto-actions { opacity: 1 !important; }
      `}</style>

      {/* left panel — icon rail, expands on hover */}
      <div className="auto-rail" style={{ flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", background: "#09090f" }}>
        {/* top controls */}
        <div style={{ padding: "8px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {onBack && (
            <button onClick={onBack} title="Back" style={{ background: "none", border: "none", cursor: "pointer", color: "#2a2a3a", width: 44, height: 30, display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "#666"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "#2a2a3a"}
            ><ChevronDown size={13} style={{ transform: "rotate(90deg)" }} /></button>
          )}
          <button onClick={createNew} disabled={creating} title="New automation" style={{ background: "none", border: "none", cursor: "pointer", color: "#2a2a3a", width: 44, height: 30, display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "#666"}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "#2a2a3a"}
          ><Plus size={13} /></button>
        </div>


        <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
          {loading && <div style={{ padding: "12px 0", color: "#252535", fontSize: 11, textAlign: "center" }}>·</div>}
          {!loading && automations.length === 0 && (
            <div style={{ padding: "10px 0", color: "#252535", fontSize: 10, textAlign: "center" }}>—</div>
          )}
          <AnimatePresence initial={false}>
            {automations.map((a) => (
              <motion.div key={a.id}
                initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                onClick={() => setSelected(a.id)}
                data-auto-row=""
                style={{ display: "flex", alignItems: "center", gap: 0, padding: "0", height: 32, cursor: "pointer", background: selected === a.id ? "rgba(255,255,255,0.06)" : "transparent", transition: "background 0.1s", marginBottom: 1 }}
                onMouseEnter={(e) => { if (selected !== a.id) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = selected === a.id ? "rgba(255,255,255,0.06)" : "transparent"; }}
              >
                {/* dot — always visible, centered in 44px rail */}
                <div style={{ width: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.enabled ? "#22c55e" : "#ef4444", boxShadow: a.enabled ? "0 0 4px #22c55e88" : "0 0 4px #ef444488", flexShrink: 0 }} />
                </div>
                {/* name + actions — visible when rail expanded */}
                <div className="rail-label" style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, minWidth: 0, paddingRight: 6 }}>
                  {editingName === a.id ? (
                    <input autoFocus value={nameVal} onChange={(e) => setNameVal(e.target.value)}
                      onBlur={() => saveName(a.id, nameVal || a.name)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveName(a.id, nameVal || a.name); if (e.key === "Escape") setEditingName(null); }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, padding: "1px 4px", fontSize: 11, color: "#e5e5e5", outline: "none" }}
                    />
                  ) : (
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: selected === a.id ? "#ccc" : "#444", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</span>
                  )}
                  <div className="auto-actions" style={{ display: "flex", gap: 0, opacity: 0, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setEditingName(a.id); setNameVal(a.name); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#333", padding: "2px 3px", display: "flex" }}><Edit3 size={9} /></button>
                    <button onClick={() => toggleEnabled(a.id, !a.enabled)} style={{ background: "none", border: "none", cursor: "pointer", color: a.enabled ? "#22c55e" : "#333", padding: "2px 3px", display: "flex" }}>
                      {a.enabled ? <CheckCircle2 size={9} /> : <Circle size={9} />}
                    </button>
                    {confirmDelete === a.id ? (
                      <>
                        <button onClick={() => { deleteAuto(a.id); setConfirmDelete(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "2px 3px", fontSize: 9 }}>del</button>
                        <button onClick={() => setConfirmDelete(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#444", padding: "2px 1px", display: "flex" }}><X size={9} /></button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDelete(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#333", padding: "2px 3px", display: "flex" }}><Trash2 size={9} /></button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* main canvas */}
      {currentAuto ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* canvas header */}
          <div style={{ padding: "9px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 9, background: "rgba(6,6,14,0.9)", backdropFilter: "blur(8px)", flexShrink: 0 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={11} color="#888" />
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#aaa" }}>{currentAuto.name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 2 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: currentAuto.enabled ? "#22c55e" : "#2a2a3a", boxShadow: currentAuto.enabled ? "0 0 4px #22c55e" : "none" }} />
              <span style={{ fontSize: 10, color: currentAuto.enabled ? "#22c55e" : "#2a2a3a" }}>{currentAuto.enabled ? "Active" : "Inactive"}</span>
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={() => toggleEnabled(currentAuto.id, !currentAuto.enabled)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 13px", borderRadius: 7, border: `1px solid ${currentAuto.enabled ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`, background: currentAuto.enabled ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.07)", color: currentAuto.enabled ? "#ef4444" : "#22c55e", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {currentAuto.enabled ? "Deactivate" : "Activate"}
            </button>
          </div>

          <AutomationCanvas key={currentAuto.id} automation={currentAuto} onSave={saveAuto} />
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, backgroundColor: "#07070f", backgroundImage: "radial-gradient(circle, rgba(139,92,246,0.4) 1.2px, transparent 1.2px)", backgroundSize: "26px 26px" }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={22} color="#444" />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#333", marginBottom: 5 }}>No automation selected</div>
            <div style={{ fontSize: 11, color: "#1a1a2a" }}>Create one or select from the list</div>
          </div>
          <button onClick={createNew} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 50, background: "rgba(124,58,237,0.9)", border: "none", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 18px rgba(124,58,237,0.4)" }}>
            <Plus size={13} /> New Automation
          </button>
        </div>
      )}
    </div>
  );
}
