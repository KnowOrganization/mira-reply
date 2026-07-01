"use client";

// Message-type node cards + RenderNode dispatcher
// TriggerNode   → TriggerNode.tsx
// PostFilterNode → PostFilterNode.tsx

import {
  MessageSquare,
  LayoutGrid,
  Image as ImageIcon,
  UserPlus,
  ClipboardList,
  Clock,
  Plus,
  Reply,
  X,
} from "lucide-react";
import type { AutomationNodeData, AutomationNode } from "@shaiz/shared";
import { NodeShell, NodeHeader } from "./NodeShell";
import { Toggle, MessageBody, AiGeneratedNote } from "./MessageBody";
import { DELAY_OPTS } from "./constants";
import type { NodeCardProps } from "./types";
import { TriggerNode } from "./TriggerNode";
import { PostFilterNode } from "./PostFilterNode";

// ── OpeningMessageNode ─────────────────────────────────────────────────────

export function OpeningMessageNode({
  data,
  onUpdate,
  onDelete,
  canDelete,
  dragMode,
}: NodeCardProps) {
  const enabled = data.enabled !== false;
  return (
    <NodeShell color="#7c3aed" glow={enabled} dragMode={dragMode}>
      <NodeHeader
        icon={<MessageSquare size={14} />}
        title="Opening Message"
        subtitle="First message sent to user"
        color="#7c3aed"
        onDelete={onDelete}
        canDelete={canDelete}
      />
      <div
        style={{
          padding: "7px 12px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 9.5,
            color: "var(--text-subtle)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          Message
        </span>
        <Toggle on={enabled} onChange={(v) => onUpdate({ enabled: v })} />
      </div>
      {enabled ? (
        <MessageBody data={data} onUpdate={onUpdate} accentColor="#7c3aed" />
      ) : (
        <div style={{ height: 10 }} />
      )}
    </NodeShell>
  );
}

// ── TextMessageNode ────────────────────────────────────────────────────────

export function TextMessageNode({
  data,
  onUpdate,
  onDelete,
  canDelete,
  dragMode,
}: NodeCardProps) {
  return (
    <NodeShell color="#6366f1" dragMode={dragMode}>
      <NodeHeader
        icon={<MessageSquare size={14} />}
        title="Text Message"
        subtitle="Send a simple text or button response"
        color="#6366f1"
        onDelete={onDelete}
        canDelete={canDelete}
      />
      <MessageBody data={data} onUpdate={onUpdate} accentColor="#6366f1" />
    </NodeShell>
  );
}

// ── CommentReplyNode ───────────────────────────────────────────────────────
// Public reply posted UNDER the user's comment (not a DM). Keep the DM copy in
// the message nodes; this is just the visible "Check your DMs!" acknowledgement.

export function CommentReplyNode({
  onDelete,
  canDelete,
  dragMode,
}: NodeCardProps) {
  return (
    <NodeShell color="#0ea5e9" dragMode={dragMode}>
      <NodeHeader
        icon={<Reply size={14} />}
        title="Comment Reply"
        subtitle="Public reply posted under the comment"
        color="#0ea5e9"
        onDelete={onDelete}
        canDelete={canDelete}
      />
      <div style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
        <div
          style={{
            fontSize: 9.5,
            color: "var(--text-subtle)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Public reply
        </div>
        <AiGeneratedNote color="#0ea5e9" />
        <div style={{ fontSize: 9.5, color: "var(--text-subtle)", lineHeight: 1.4 }}>
          Publicly replies to the comment. Keep the DM copy in the message nodes.
        </div>
      </div>
    </NodeShell>
  );
}

// ── CardMessageNode ────────────────────────────────────────────────────────

export function CardMessageNode({
  data,
  onUpdate,
  onDelete,
  canDelete,
  dragMode,
}: NodeCardProps) {
  return (
    <NodeShell color="#ec4899" dragMode={dragMode}>
      <NodeHeader
        icon={<LayoutGrid size={14} />}
        title="Card Message"
        subtitle="Image via DM · Text via private reply"
        color="#ec4899"
        onDelete={onDelete}
        canDelete={canDelete}
      />
      <div style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
        <input
          value={data.imageUrl ?? ""}
          onChange={(e) => onUpdate({ imageUrl: e.target.value })}
          placeholder="Image URL (https://…) — optional"
          style={{
            width: "100%",
            background: "var(--border)",
            border: "1px solid rgba(236,72,153,0.2)",
            borderRadius: 8,
            padding: "6px 9px",
            fontSize: 11,
            color: "var(--text-muted)",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {data.imageUrl?.trim() && (
          <img src={data.imageUrl.trim()} alt="" style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid var(--border)" }} />
        )}
        <AiGeneratedNote color="#ec4899" />
        {(data.buttons ?? []).map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              value={b.label}
              onChange={(e) => {
                const next = [...(data.buttons ?? [])];
                next[i] = { ...next[i], label: e.target.value };
                onUpdate({ buttons: next });
              }}
              placeholder="Button label"
              style={{
                flex: 1,
                background: "var(--border)",
                border: "1px solid rgba(236,72,153,0.2)",
                borderRadius: 8,
                padding: "6px 9px",
                fontSize: 11,
                color: "var(--text-muted)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={() => onUpdate({ buttons: (data.buttons ?? []).filter((_, j) => j !== i) })}
              aria-label="Remove button"
              style={{
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: "var(--text-subtle)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <button
          onClick={() =>
            onUpdate({ buttons: [...(data.buttons ?? []), { label: "", payload: "" }] })
          }
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            background: "rgba(236,72,153,0.07)",
            border: "1px dashed rgba(236,72,153,0.2)",
            borderRadius: 8,
            padding: "5px",
            fontSize: 10.5,
            color: "#ec4899",
            cursor: "pointer",
          }}
        >
          <Plus size={10} /> Add Button
        </button>
      </div>
    </NodeShell>
  );
}

// ── ImageMessageNode ───────────────────────────────────────────────────────

export function ImageMessageNode({ data, onUpdate, onDelete, canDelete, dragMode }: NodeCardProps) {
  const url = data.imageUrl?.trim();
  return (
    <NodeShell color="#14b8a6" dragMode={dragMode}>
      <NodeHeader
        icon={<ImageIcon size={14} />}
        title="Image Message"
        subtitle="Sent as DM attachment (not private reply)"
        color="#14b8a6"
        onDelete={onDelete}
        canDelete={canDelete}
      />
      <div style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
        <input
          value={data.imageUrl ?? ""}
          onChange={(e) => onUpdate({ imageUrl: e.target.value })}
          placeholder="Paste image URL (https://…)"
          style={{
            width: "100%",
            background: "var(--border)",
            border: "1px solid rgba(20,184,166,0.2)",
            borderRadius: 8,
            padding: "7px 9px",
            fontSize: 11,
            color: "var(--text-muted)",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {url ? (
          <img src={url} alt="" style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid var(--border)" }} />
        ) : (
          <div style={{ fontSize: 9.5, color: "var(--text-subtle)", lineHeight: 1.4 }}>
            Direct image link. Sent to the user as a DM attachment.
          </div>
        )}
      </div>
    </NodeShell>
  );
}

// ── AskFollowNode ──────────────────────────────────────────────────────────

export function AskFollowNode({
  data,
  onUpdate,
  onDelete,
  canDelete,
  dragMode,
  windowOpen,
}: NodeCardProps) {
  return (
    <NodeShell color="#f59e0b" dragMode={dragMode}>
      <NodeHeader
        icon={<UserPlus size={14} />}
        title="Ask For Follow"
        subtitle="Request users to follow your account"
        color="#f59e0b"
        onDelete={onDelete}
        canDelete={canDelete}
      />
      <div style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
        <div
          style={{
            fontSize: 9.5,
            color: "var(--text-subtle)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Message
        </div>
        <AiGeneratedNote color="#f59e0b" />
        <div>
          <div
            style={{
              fontSize: 9.5,
              color: "var(--text-subtle)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 5,
            }}
          >
            Confirm button
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(245,158,11,0.07)",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: 8,
              padding: "5px 9px",
            }}
          >
            <span style={{ fontSize: 12 }}>✓</span>
            <input
              value={data.buttons?.[0]?.label ?? ""}
              onChange={(e) =>
                onUpdate({ buttons: [{ label: e.target.value, payload: "done" }] })
              }
              placeholder="I'm following ✓"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                fontSize: 11,
                color: "#f59e0b",
                outline: "none",
                fontWeight: 600,
              }}
            />
          </div>
          <div style={{ fontSize: 9.5, color: "var(--text-subtle)", lineHeight: 1.4, marginTop: 4 }}>
            User taps this to confirm — no typing. Defaults to{" "}
            <span style={{ color: "#f59e0b" }}>I&apos;m following ✓</span>.
          </div>
        </div>
        {windowOpen === false && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              background: "rgba(251,146,60,0.07)",
              border: "1px solid rgba(251,146,60,0.2)",
              borderRadius: 8,
              padding: "7px 10px",
              fontSize: 10.5,
              color: "#fb923c",
              lineHeight: 1.4,
            }}
          >
            <span style={{ fontSize: 13, flexShrink: 0 }}>⚠</span>
            Opening Message disabled — this step won't execute
          </div>
        )}
      </div>
    </NodeShell>
  );
}

// ── LeadFormNode ───────────────────────────────────────────────────────────

export function LeadFormNode({
  data,
  onUpdate,
  onDelete,
  canDelete,
  dragMode,
}: NodeCardProps) {
  return (
    <NodeShell color="#a855f7" dragMode={dragMode}>
      <NodeHeader
        icon={<ClipboardList size={14} />}
        title="Lead Form"
        subtitle="Request users to input text"
        color="#a855f7"
        onDelete={onDelete}
        canDelete={canDelete}
      />
      <div style={{ padding: "9px 12px" }}>
        <input
          value={data.question ?? ""}
          onChange={(e) => onUpdate({ question: e.target.value })}
          placeholder="What's your question?"
          style={{
            width: "100%",
            background: "var(--border)",
            border: "1px solid rgba(168,85,247,0.2)",
            borderRadius: 8,
            padding: "7px 9px",
            fontSize: 11,
            color: "var(--text-muted)",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>
    </NodeShell>
  );
}

// ── FollowGateNode ─────────────────────────────────────────────────────────

export function FollowGateNode({
  onDelete,
  canDelete,
  dragMode,
}: NodeCardProps) {
  return (
    <NodeShell color="#ec4899" dragMode={dragMode}>
      <NodeHeader
        icon={<UserPlus size={14} />}
        title="Follow Gate"
        subtitle="Only proceeds if user is following"
        color="#ec4899"
        onDelete={onDelete}
        canDelete={canDelete}
      />
      <div style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 9px",
              borderRadius: 8,
              background: "rgba(34,197,94,0.07)",
              border: "1px solid rgba(34,197,94,0.15)",
            }}
          >
            <span style={{ fontSize: 13 }}>✓</span>
            <span style={{ fontSize: 10.5, color: "#22c55e" }}>
              Following → continues to next node
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 9px",
              borderRadius: 8,
              background: "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.15)",
            }}
          >
            <span style={{ fontSize: 13 }}>✗</span>
            <span style={{ fontSize: 10.5, color: "#f87171" }}>
              Not following → sends gate message below
            </span>
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 9.5,
              color: "var(--text-subtle)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 5,
            }}
          >
            Message when not following
          </div>
          <AiGeneratedNote color="#ec4899" />
          <div style={{ fontSize: 9.5, color: "var(--text-subtle)", marginTop: 4, lineHeight: 1.4 }}>
            User replies "done" → re-checks follow status.
          </div>
        </div>
      </div>
    </NodeShell>
  );
}

// ── FollowupMessageNode ────────────────────────────────────────────────────

export function FollowupMessageNode({
  data,
  onUpdate,
  onDelete,
  canDelete,
  dragMode,
  windowOpen,
}: NodeCardProps) {
  const d = data.delayMinutes ?? 60;
  const fmt = (m: number) =>
    m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;
  return (
    <NodeShell color="#f97316" dragMode={dragMode}>
      <NodeHeader
        icon={<Clock size={14} />}
        title="Follow-up Message"
        subtitle={`Sent after ${fmt(d)} delay`}
        color="#f97316"
        onDelete={onDelete}
        canDelete={canDelete}
      />
      <div style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
        <AiGeneratedNote color="#f97316" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {DELAY_OPTS.map((opt) => (
            <button
              key={opt}
              onClick={() => onUpdate({ delayMinutes: opt })}
              style={{
                padding: "3px 7px",
                borderRadius: 5,
                border: `1px solid ${d === opt ? "#f97316" : "var(--bg-inset)"}`,
                background: d === opt ? "rgba(249,115,22,0.13)" : "transparent",
                color: d === opt ? "#f97316" : "var(--text-subtle)",
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              {fmt(opt)}
            </button>
          ))}
        </div>
        {windowOpen === false ? (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              background: "rgba(251,146,60,0.07)",
              border: "1px solid rgba(251,146,60,0.2)",
              borderRadius: 8,
              padding: "7px 10px",
              fontSize: 10.5,
              color: "#fb923c",
              lineHeight: 1.4,
            }}
          >
            <span style={{ fontSize: 13, flexShrink: 0 }}>⚠</span>
            Opening Message disabled — this step won't execute
          </div>
        ) : (
          <div
            style={{
              fontSize: 10,
              color: "#7c2d12",
              background: "rgba(249,115,22,0.05)",
              border: "1px solid rgba(249,115,22,0.09)",
              borderRadius: 6,
              padding: "4px 7px",
              lineHeight: 1.4,
            }}
          >
            Sends after delay once Opening Message is delivered.
          </div>
        )}
      </div>
    </NodeShell>
  );
}

// ── RenderNode dispatcher ──────────────────────────────────────────────────

export { TriggerNode, PostFilterNode };

export function RenderNode({
  node,
  onUpdate,
  onDelete,
  canDelete,
  dragMode,
  windowOpen,
}: {
  node: AutomationNode;
  onUpdate: (p: Partial<AutomationNodeData>) => void;
  onDelete: () => void;
  canDelete: boolean;
  dragMode?: boolean;
  windowOpen?: boolean;
}) {
  const props: NodeCardProps = {
    data: node.data,
    onUpdate,
    onDelete,
    canDelete,
    dragMode,
    windowOpen,
  };
  switch (node.type) {
    case "trigger":
      return <TriggerNode {...props} />;
    case "post_filter":
      return <PostFilterNode {...props} />;
    case "opening_message":
      return <OpeningMessageNode {...props} />;
    case "text_message":
      return <TextMessageNode {...props} />;
    case "card_message":
      return <CardMessageNode {...props} />;
    case "image_message":
      return <ImageMessageNode {...props} />;
    case "comment_reply":
      return <CommentReplyNode {...props} />;
    case "ask_follow":
      return <AskFollowNode {...props} />;
    case "follow_gate":
      return <FollowGateNode {...props} />;
    case "lead_form":
      return <LeadFormNode {...props} />;
    case "followup_message":
      return <FollowupMessageNode {...props} />;
    default:
      return null;
  }
}
