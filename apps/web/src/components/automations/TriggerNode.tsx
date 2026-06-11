"use client";

// TriggerNode card — trigger type picker + comment filter

import { useState } from "react";
import { Zap, MessageSquare } from "lucide-react";
import { NodeShell, NodeHeader } from "./NodeShell";
import { TRIGGER_OPTIONS } from "./constants";
import type { NodeCardProps } from "./types";

export function TriggerNode({ data, onUpdate, dragMode }: NodeCardProps) {
  const selected = data.text ?? "comment_post";
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
      <NodeHeader
        icon={<Zap size={14} fill="#f59e0b" />}
        title="Select a Trigger"
        subtitle="When to run automation"
        color="#f59e0b"
      />
      <div style={{ padding: "9px 12px" }}>
        <div
          style={{
            fontSize: 9.5,
            color: "#383848",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: 7,
          }}
        >
          Trigger type
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {TRIGGER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ text: opt.value })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 9px",
                borderRadius: 9,
                border: `1px solid ${
                  selected === opt.value ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.05)"
                }`,
                background: selected === opt.value ? "rgba(255,255,255,0.08)" : "transparent",
                color: selected === opt.value ? "#e5e5e5" : "#555",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.14s",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  flexShrink: 0,
                  background:
                    opt.value === "dm"
                      ? "transparent"
                      : "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
                  border: opt.value === "dm" ? "1px solid #333" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {opt.value === "dm" ? (
                  <MessageSquare size={10} color="#555" />
                ) : (
                  <Zap size={9} color="#fff" fill="#fff" />
                )}
              </div>
              {opt.label}
            </button>
          ))}
        </div>

        {isComment && (
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                fontSize: 9.5,
                color: "#2a2a3a",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: 7,
              }}
            >
              Comment filter
            </div>
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              {(
                [
                  { id: "keywords", label: "By keyword" },
                  { id: "all", label: "All comments" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  style={{
                    flex: 1,
                    padding: "5px 0",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.14s",
                    border: `1px solid ${
                      filterMode === m.id ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)"
                    }`,
                    background:
                      filterMode === m.id ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.03)",
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
                    onUpdate({
                      buttons: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((k) => ({ label: k, payload: k })),
                    });
                  }}
                  placeholder="e.g. link, info, price"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 8,
                    padding: "6px 9px",
                    fontSize: 11,
                    color: "#aaa",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ fontSize: 9.5, color: "#2a2a3a", marginTop: 5, lineHeight: 1.4 }}>
                  Triggers only when comment contains one of these words. Comma-separated.
                </div>
              </>
            ) : (
              <div
                style={{
                  background: "rgba(124,58,237,0.07)",
                  border: "1px solid rgba(124,58,237,0.18)",
                  borderRadius: 8,
                  padding: "7px 10px",
                  fontSize: 11,
                  color: "#6d5fa8",
                  lineHeight: 1.5,
                }}
              >
                Triggers on{" "}
                <span style={{ color: "#d4d4d4", fontWeight: 600 }}>every comment</span> —
                regardless of what they write.
              </div>
            )}
          </div>
        )}
      </div>
    </NodeShell>
  );
}
