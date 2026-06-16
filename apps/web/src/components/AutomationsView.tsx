"use client";

/**
 * AutomationsView — public entry point.
 *
 * Implementation is decomposed into:
 *   automations/types.ts          — shared local types
 *   automations/constants.ts      — pure data (templates, options, layout consts)
 *   automations/helpers.ts        — pure functions (validation, computeWindowOpen)
 *   automations/NodeShell.tsx     — NodeShell, NodeHeader, VConnector, HConnector
 *   automations/MessageBody.tsx   — Toggle, ButtonSuggestModal, SuggestButton, MessageBody
 *   automations/NodeCards.tsx     — all node card components + RenderNode
 *   automations/AddResponsePanel.tsx
 *   automations/FreeDragCanvas.tsx
 *   automations/SmartGridCanvas.tsx
 *   automations/AutomationCanvas.tsx
 *
 * Public interface (this file) is UNCHANGED — callers import from here as before.
 */

import { useState, useEffect } from "react";
import {
  Zap, Plus, ChevronDown, Edit3, CheckCircle2, Circle, Trash2, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Automation } from "@shaiz/shared";
import {
  useAutomations,
  useCreateAutomation,
  usePatchAutomation,
  useDeleteAutomation,
} from "@/lib/api/hooks";
import { AutomationCanvas } from "./automations/AutomationCanvas";

export function AutomationsView({ onBack }: { onBack?: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameVal, setNameVal] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const automationsQ = useAutomations({ refetchInterval: 30_000 });
  const automations = automationsQ.data?.automations ?? [];
  const loading = automationsQ.isLoading;

  const createMut = useCreateAutomation();
  const patchMut = usePatchAutomation();
  const deleteMut = useDeleteAutomation();
  const creating = createMut.isPending;

  useEffect(() => {
    if (!selected && automations.length) setSelected(automations[0].id);
  }, [selected, automations]);

  async function createNew() {
    try {
      const d = await createMut.mutateAsync();
      setSelected(d.automation.id);
    } catch {}
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    await patchMut.mutateAsync({ id, patch: { enabled } });
  }

  async function deleteAuto(id: string) {
    await deleteMut.mutateAsync(id);
    if (selected === id) {
      const next = automations.filter((a) => a.id !== id);
      setSelected(next[0]?.id ?? null);
    }
  }

  async function saveAuto(patch: Partial<Automation>) {
    if (!selected) return;
    await patchMut.mutateAsync({ id: selected, patch });
  }

  async function saveName(id: string, name: string) {
    await patchMut.mutateAsync({ id, patch: { name } });
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
      <div
        className="auto-rail"
        style={{
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-sidebar)",
        }}
      >
        {/* top controls */}
        <div
          style={{
            padding: "8px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            borderBottom: "1px solid var(--border)",
          }}
        >
          {onBack && (
            <button
              onClick={onBack}
              title="Back"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-subtle)",
                width: 44,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-subtle)")}
            >
              <ChevronDown size={13} style={{ transform: "rotate(90deg)" }} />
            </button>
          )}
          <button
            onClick={createNew}
            disabled={creating}
            title="New automation"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-subtle)",
              width: 44,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-subtle)")}
          >
            <Plus size={13} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
          {loading && (
            <div style={{ padding: "12px 0", color: "var(--text-subtle)", fontSize: 11, textAlign: "center" }}>
              ·
            </div>
          )}
          {!loading && automations.length === 0 && (
            <div style={{ padding: "10px 0", color: "var(--text-subtle)", fontSize: 10, textAlign: "center" }}>
              —
            </div>
          )}
          <AnimatePresence initial={false}>
            {automations.map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                onClick={() => setSelected(a.id)}
                data-auto-row=""
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0,
                  padding: "0",
                  height: 32,
                  cursor: "pointer",
                  background: selected === a.id ? "var(--bg-inset)" : "transparent",
                  transition: "background 0.1s",
                  marginBottom: 1,
                }}
                onMouseEnter={(e) => {
                  if (selected !== a.id)
                    (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.05)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    selected === a.id ? "var(--bg-inset)" : "transparent";
                }}
              >
                {/* dot */}
                <div
                  style={{
                    width: 44,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: a.enabled ? "#22c55e" : "#ef4444",
                      boxShadow: a.enabled
                        ? "0 0 4px #22c55e88"
                        : "0 0 4px #ef444488",
                      flexShrink: 0,
                    }}
                  />
                </div>
                {/* name + actions */}
                <div
                  className="rail-label"
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    minWidth: 0,
                    paddingRight: 6,
                  }}
                >
                  {editingName === a.id ? (
                    <input
                      autoFocus
                      value={nameVal}
                      onChange={(e) => setNameVal(e.target.value)}
                      onBlur={() => saveName(a.id, nameVal || a.name)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveName(a.id, nameVal || a.name);
                        if (e.key === "Escape") setEditingName(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        flex: 1,
                        background: "var(--bg-inset)",
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        padding: "1px 4px",
                        fontSize: 11,
                        color: "var(--text)",
                        outline: "none",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        flex: 1,
                        fontSize: 11,
                        fontWeight: 500,
                        color: selected === a.id ? "var(--text)" : "var(--text-subtle)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {a.name}
                    </span>
                  )}
                  <div
                    className="auto-actions"
                    style={{ display: "flex", gap: 0, opacity: 0, flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setEditingName(a.id);
                        setNameVal(a.name);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-subtle)",
                        padding: "2px 3px",
                        display: "flex",
                      }}
                    >
                      <Edit3 size={9} />
                    </button>
                    <button
                      onClick={() => toggleEnabled(a.id, !a.enabled)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: a.enabled ? "#22c55e" : "var(--text-subtle)",
                        padding: "2px 3px",
                        display: "flex",
                      }}
                    >
                      {a.enabled ? <CheckCircle2 size={9} /> : <Circle size={9} />}
                    </button>
                    {confirmDelete === a.id ? (
                      <>
                        <button
                          onClick={() => {
                            deleteAuto(a.id);
                            setConfirmDelete(null);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#ef4444",
                            padding: "2px 3px",
                            fontSize: 9,
                          }}
                        >
                          del
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-subtle)",
                            padding: "2px 1px",
                            display: "flex",
                          }}
                        >
                          <X size={9} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(a.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-subtle)",
                          padding: "2px 3px",
                          display: "flex",
                        }}
                      >
                        <Trash2 size={9} />
                      </button>
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
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
        >
          {/* canvas header */}
          <div
            style={{
              padding: "9px 14px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 9,
              background: "var(--bg-frame)",
              backdropFilter: "blur(8px)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: "var(--bg-inset)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap size={11} color="var(--text-muted)" />
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)" }}>
              {currentAuto.name}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 2 }}>
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: currentAuto.enabled ? "#22c55e" : "var(--text-subtle)",
                  boxShadow: currentAuto.enabled ? "0 0 4px #22c55e" : "none",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: currentAuto.enabled ? "#22c55e" : "var(--text-subtle)",
                }}
              >
                {currentAuto.enabled ? "Active" : "Inactive"}
              </span>
            </div>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => toggleEnabled(currentAuto.id, !currentAuto.enabled)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 13px",
                borderRadius: 7,
                border: `1px solid ${currentAuto.enabled ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
                background: currentAuto.enabled
                  ? "rgba(239,68,68,0.07)"
                  : "rgba(34,197,94,0.07)",
                color: currentAuto.enabled ? "#ef4444" : "#22c55e",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {currentAuto.enabled ? "Deactivate" : "Activate"}
            </button>
          </div>

          <AutomationCanvas key={currentAuto.id} automation={currentAuto} onSave={saveAuto} />
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 14,
            backgroundColor: "var(--bg-frame)",
            backgroundImage:
              "radial-gradient(circle, rgba(139,92,246,0.4) 1.2px, transparent 1.2px)",
            backgroundSize: "26px 26px",
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: "var(--border)",
              border: "1px solid var(--bg-inset)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={22} color="var(--text-subtle)" />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-subtle)", marginBottom: 5 }}>
              No automation selected
            </div>
            <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>
              Create one or select from the list
            </div>
          </div>
          <button
            onClick={createNew}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 18px",
              borderRadius: 50,
              background: "rgba(124,58,237,0.9)",
              border: "none",
              color: "var(--accent-fg)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 18px rgba(124,58,237,0.4)",
            }}
          >
            <Plus size={13} /> New Automation
          </button>
        </div>
      )}
    </div>
  );
}
