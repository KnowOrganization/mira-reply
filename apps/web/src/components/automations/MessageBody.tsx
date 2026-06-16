"use client";

// Toggle, ButtonSuggestModal, SuggestButton, and MessageBody components

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { AutomationNodeData } from "@shaiz/shared";
import { BUTTON_SUGGESTIONS, MESSAGE_TEMPLATES } from "./constants";

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
    >
      <div
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: on ? "rgba(34,197,94,0.25)" : "var(--border)",
          border: `1px solid ${on ? "rgba(34,197,94,0.4)" : "var(--bg-inset)"}`,
          position: "relative",
          transition: "all 0.18s",
          boxShadow: on ? "0 0 8px rgba(34,197,94,0.2)" : "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 2,
            left: on ? 18 : 2,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: on ? "#22c55e" : "var(--text-subtle)",
            transition: "left 0.18s, background 0.18s",
            boxShadow: on ? "0 0 6px rgba(34,197,94,0.5)" : "none",
          }}
        />
      </div>
    </button>
  );
}

export function ButtonSuggestModal({
  onAdd,
  onClose,
}: {
  onAdd: (label: string) => void;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState("");
  const [hov, setHov] = useState<string | null>(null);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.78)",
        backdropFilter: "blur(12px)",
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          background: "var(--bg-elev)",
          border: "1px solid var(--bg-inset)",
          borderRadius: 22,
          width: 380,
          overflow: "hidden",
          boxShadow: "var(--shadow-card)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "20px 22px 14px",
            background: "var(--bg-inset)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "var(--border)",
                border: "1px solid var(--bg-inset)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={14} color="var(--text-muted)" />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>
                Add Button
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                Quick pick or write your own
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 14px 8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {BUTTON_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  onAdd(s);
                  onClose();
                }}
                onMouseEnter={() => setHov(s)}
                onMouseLeave={() => setHov(null)}
                style={{
                  padding: "9px 12px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 11.5,
                  color: hov === s ? "var(--text)" : "var(--text-muted)",
                  background:
                    hov === s ? "var(--bg-inset)" : "var(--border)",
                  border: `1px solid ${hov === s ? "var(--bg-inset)" : "var(--border)"}`,
                  borderRadius: 10,
                  transition: "all 0.13s",
                  transform: hov === s ? "translateY(-1px)" : "none",
                  boxShadow: hov === s ? "var(--shadow-card)" : "none",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "6px 14px 14px" }}>
          <div style={{ display: "flex", gap: 7 }}>
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && custom.trim()) {
                  onAdd(custom.trim());
                  onClose();
                }
              }}
              placeholder="Or type a custom label…"
              autoFocus
              style={{
                flex: 1,
                background: "var(--border)",
                border: "1px solid var(--bg-inset)",
                borderRadius: 10,
                padding: "9px 12px",
                fontSize: 11.5,
                color: "var(--text-muted)",
                outline: "none",
              }}
            />
            <button
              onClick={() => {
                if (custom.trim()) {
                  onAdd(custom.trim());
                  onClose();
                }
              }}
              style={{
                padding: "9px 16px",
                background: "var(--bg-inset)",
                border: "1px solid var(--bg-inset)",
                borderRadius: 10,
                cursor: "pointer",
                color: "var(--text-muted)",
                fontSize: 11.5,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              Add
            </button>
          </div>
        </div>

        <div style={{ padding: "0 14px 16px" }}>
          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: "10px",
              background: "var(--border)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              cursor: "pointer",
              color: "var(--text-subtle)",
              fontSize: 11.5,
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--bg-inset)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--border)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)";
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export function SuggestButton({
  nodeType,
  onSelect,
}: {
  nodeType: string;
  onSelect: (t: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const templates = MESSAGE_TEMPLATES[nodeType] ?? [];
  if (!templates.length) return null;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-subtle)",
          fontSize: 10,
          padding: "2px 0",
          fontWeight: 600,
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-subtle)")}
      >
        ✨ Suggest
      </button>
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.78)",
            backdropFilter: "blur(12px)",
          }}
          onMouseDown={() => setOpen(false)}
        >
          <div
            style={{
              background: "var(--bg-elev)",
              border: "1px solid var(--bg-inset)",
              borderRadius: 22,
              width: 400,
              overflow: "hidden",
              boxShadow: "var(--shadow-card)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div
              style={{
                padding: "20px 22px 16px",
                background: "var(--bg-inset)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: "var(--border)",
                    border: "1px solid var(--bg-inset)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                  }}
                >
                  ✨
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: "var(--text)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Message Templates
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    Select one to prefill — you can edit after
                  </div>
                </div>
              </div>
            </div>

            {/* template cards */}
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {templates.map((t, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onSelect(t);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "13px 15px",
                    background:
                      hovered === i ? "var(--bg-inset)" : "var(--border)",
                    border: `1px solid ${hovered === i ? "var(--bg-inset)" : "var(--border)"}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    transition: "all 0.14s ease",
                    transform: hovered === i ? "translateY(-1px)" : "none",
                    boxShadow: hovered === i ? "var(--shadow-card)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        flexShrink: 0,
                        marginTop: 1,
                        background:
                          hovered === i ? "var(--bg-inset)" : "var(--border)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: "var(--text-muted)",
                        fontWeight: 700,
                        transition: "all 0.14s",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: hovered === i ? "var(--text)" : "var(--text-muted)",
                          lineHeight: 1.65,
                          transition: "color 0.14s",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {t.length > 120 ? t.slice(0, 120) + "…" : t}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* footer */}
            <div style={{ padding: "4px 14px 16px" }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "var(--border)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  cursor: "pointer",
                  color: "var(--text-subtle)",
                  fontSize: 11.5,
                  fontWeight: 500,
                  transition: "all 0.12s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-inset)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--border)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)";
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function MessageBody({
  data,
  onUpdate,
  accentColor: _accentColor,
  placeholder,
  nodeType,
}: {
  data: AutomationNodeData;
  onUpdate: (p: Partial<AutomationNodeData>) => void;
  accentColor: string;
  placeholder: string;
  nodeType?: string;
}) {
  const [btnModal, setBtnModal] = useState(false);
  return (
    <div style={{ padding: "9px 12px" }}>
      {btnModal && (
        <ButtonSuggestModal
          onAdd={(label) =>
            onUpdate({ buttons: [...(data.buttons ?? []), { label, payload: "" }] })
          }
          onClose={() => setBtnModal(false)}
        />
      )}
      {nodeType && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <SuggestButton nodeType={nodeType} onSelect={(t) => onUpdate({ text: t })} />
        </div>
      )}
      <textarea
        value={data.text ?? ""}
        onChange={(e) => onUpdate({ text: e.target.value })}
        placeholder={placeholder}
        rows={3}
        style={{
          width: "100%",
          background: "var(--border)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "7px 9px",
          fontSize: 11,
          color: "var(--text-muted)",
          outline: "none",
          resize: "none",
          boxSizing: "border-box",
          lineHeight: 1.5,
        }}
      />
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
        {(data.buttons ?? []).map((btn, i) => (
          <div key={i} style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <input
              value={btn.label}
              onChange={(e) => {
                const u = [...(data.buttons ?? [])];
                u[i] = { ...u[i], label: e.target.value };
                onUpdate({ buttons: u });
              }}
              style={{
                flex: 1,
                background: "var(--border)",
                border: `1px solid var(--bg-inset)`,
                borderRadius: 7,
                padding: "5px 8px",
                fontSize: 11,
                color: "var(--text-muted)",
                outline: "none",
              }}
              placeholder="Button label"
            />
            <button
              onClick={() =>
                onUpdate({ buttons: (data.buttons ?? []).filter((_, j) => j !== i) })
              }
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-subtle)",
                padding: 2,
                display: "flex",
              }}
            >
              <X size={11} />
            </button>
          </div>
        ))}
        <button
          onClick={() => setBtnModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "var(--border)",
            border: "1px dashed var(--bg-inset)",
            borderRadius: 7,
            padding: "6px 9px",
            fontSize: 10.5,
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          <Plus size={10} /> Add Button
        </button>
      </div>
    </div>
  );
}
