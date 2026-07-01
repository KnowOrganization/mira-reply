"use client";

// Full canvas for a single automation: toolbar, test panel, node layout + Add Response panel

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Move, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { Automation, AutomationNodeData, AutomationNodeType, AutomationNode } from "@shaiz/shared";
import { useTestAutomation } from "@/lib/api/hooks";
import { getNodeValidation, computeWindowOpen as _computeWindowOpen } from "./helpers";
import { FreeDragCanvas } from "./FreeDragCanvas";
import { SmartGridCanvas } from "./SmartGridCanvas";
import { AddResponsePanel } from "./AddResponsePanel";

let nodeSeq = 0;

export function AutomationCanvas({
  automation,
  onSave,
}: {
  automation: Automation;
  onSave: (patch: Partial<Automation>) => Promise<void>;
}) {
  const [nodes, setNodes] = useState<AutomationNode[]>(automation.nodes);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const prevPostIdsRef = useRef<string[]>([]);
  const [freeMode, setFreeMode] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testText, setTestText] = useState("");
  const [testRunning, setTestRunning] = useState(false);
  const [testSteps, setTestSteps] = useState<
    { nodeType: string; action: string; text: string }[] | null
  >(null);
  const testAutomation = useTestAutomation();

  // beforeunload guard when dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // auto-open Add Response after user confirms posts in PostFilterNode with no messages yet
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
    const ns = [...automation.nodes];
    const trigger = ns.find((n) => n.type === "trigger");
    const triggerType = trigger?.data.text ?? "comment_post";
    const needsPostFilter = triggerType === "comment_post" || triggerType === "live_comment";
    const hasPostFilter = ns.some((n) => n.type === "post_filter");
    if (needsPostFilter && !hasPostFilter && trigger) {
      const idx = ns.indexOf(trigger);
      const pf: import("@shaiz/shared").AutomationNode = {
        id: `node_post_filter_${Date.now().toString(36)}`,
        type: "post_filter",
        position: { x: 0, y: 0 },
        data: { postIds: [] },
      };
      ns.splice(idx + 1, 0, pf);
    }
    // comment_post default chain: trigger → post_filter → comment_reply → opening_message.
    // Each .some()-guarded so reloads never duplicate. live_comment seeds post_filter only.
    if (trigger && triggerType === "comment_post") {
      if (!ns.some((n) => n.type === "comment_reply")) {
        const pfIdx = ns.findIndex((n) => n.type === "post_filter");
        const at = (pfIdx === -1 ? ns.indexOf(trigger) : pfIdx) + 1;
        const cr: import("@shaiz/shared").AutomationNode = {
          id: `node_comment_reply_${Date.now().toString(36)}`,
          type: "comment_reply",
          position: { x: 0, y: 0 },
          data: { enabled: true },
        };
        ns.splice(at, 0, cr);
      }
      if (!ns.some((n) => n.type === "opening_message")) {
        const crIdx = ns.findIndex((n) => n.type === "comment_reply");
        const pfIdx = ns.findIndex((n) => n.type === "post_filter");
        const at = (crIdx !== -1 ? crIdx : pfIdx !== -1 ? pfIdx : ns.indexOf(trigger)) + 1;
        const om: import("@shaiz/shared").AutomationNode = {
          id: `node_opening_message_${Date.now().toString(36)}`,
          type: "opening_message",
          position: { x: 0, y: 0 },
          data: { enabled: true },
        };
        ns.splice(at, 0, om);
      }
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
      const d = await testAutomation.mutateAsync({ id: automation.id, text: testText });
      setTestSteps(
        (d.steps as { nodeType: string; action: string; text: string }[]) ?? []
      );
    } catch {
      toast.error("Test failed");
    }
    setTestRunning(false);
  }

  const updateNode = useCallback((id: string, patch: Partial<AutomationNodeData>) => {
    setNodes((ns) => {
      const updated = ns.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
      );
      const trigger = updated.find((n) => n.type === "trigger");
      if (trigger && trigger.id === id && "text" in patch) {
        const triggerType = patch.text ?? trigger.data.text;
        if (triggerType === "comment_post") {
          // Seed the full default chain in order: post_filter → comment_reply → opening_message.
          // Each added only if absent. updated[0] is the trigger (index 0 by construction);
          // edges are built from array order in save(), so this prefix = execution order.
          const missing: import("@shaiz/shared").AutomationNode[] = [];
          if (!updated.some((n) => n.type === "post_filter"))
            missing.push({ id: `node_post_filter_${Date.now().toString(36)}`, type: "post_filter", position: { x: 0, y: 0 }, data: { postIds: [] } });
          if (!updated.some((n) => n.type === "comment_reply"))
            missing.push({ id: `node_comment_reply_${Date.now().toString(36)}`, type: "comment_reply", position: { x: 0, y: 0 }, data: { enabled: true } });
          if (!updated.some((n) => n.type === "opening_message"))
            missing.push({ id: `node_opening_message_${Date.now().toString(36)}`, type: "opening_message", position: { x: 0, y: 0 }, data: { enabled: true } });
          return missing.length ? [updated[0], ...missing, ...updated.slice(1)] : updated;
        }
        if (triggerType === "live_comment") {
          // Live: post_filter only (no public comment reply / opening seed).
          if (!updated.some((n) => n.type === "post_filter")) {
            const pfNode: import("@shaiz/shared").AutomationNode = {
              id: `node_post_filter_${Date.now().toString(36)}`,
              type: "post_filter",
              position: { x: 0, y: 0 },
              data: { postIds: [] },
            };
            return [updated[0], pfNode, ...updated.slice(1)];
          }
          return updated;
        }
        // dm / story_reply — strip the comment-only auto prefix (post_filter + comment_reply).
        // opening_message is valid on any trigger, so it stays.
        return updated.filter((n) => n.type !== "post_filter" && n.type !== "comment_reply");
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
    if (validation.status === "blocked") {
      toast.error(validation.message ?? "Cannot add this node");
      return;
    }
    const id = `node_${type}_${++nodeSeq}_${Date.now().toString(36)}`;
    const last = nodes[nodes.length - 1];
    const lastPos = last?.position ?? { x: 120, y: 0 };
    const position = dropPos ?? (freeMode ? { x: lastPos.x, y: lastPos.y + 260 } : { x: 0, y: 0 });
    const newNode: AutomationNode = {
      id,
      type,
      position,
      data: { enabled: true },
    };
    setNodes((ns) => {
      const next = [...ns];
      if (type === "opening_message") {
        const rev = [...ns]
          .reverse()
          .findIndex((n) => n.type === "trigger" || n.type === "post_filter");
        const idx = rev === -1 ? 0 : ns.length - 1 - rev;
        next.splice(idx + 1, 0, newNode);
        return next;
      }
      if (type === "ask_follow" || type === "follow_gate") {
        const omIdx = ns.findIndex((n) => n.type === "opening_message");
        if (omIdx !== -1) {
          next.splice(omIdx + 1, 0, newNode);
          return next;
        }
        const rev = [...ns]
          .reverse()
          .findIndex((n) => n.type === "trigger" || n.type === "post_filter");
        const idx = rev === -1 ? 0 : ns.length - 1 - rev;
        next.splice(idx + 1, 0, newNode);
        return next;
      }
      return [...ns, newNode];
    });
    setIsDirty(true);
  }

  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const edges = nodes.slice(0, -1).map((n, i) => ({
        id: `e_${n.id}_${nodes[i + 1].id}`,
        source: n.id,
        target: nodes[i + 1].id,
      }));
      const triggerNode = nodes.find((n) => n.type === "trigger");
      const postFilterNode = nodes.find((n) => n.type === "post_filter");
      const triggerPatch = triggerNode
        ? {
            type: (triggerNode.data.text ?? "comment_post") as import("@shaiz/shared").AutomationTriggerType,
            keywords: (triggerNode.data.buttons ?? []).map((b) => b.label).filter(Boolean),
            postIds: postFilterNode?.data.postIds ?? [],
          }
        : undefined;
      await onSave({ nodes, edges, ...(triggerPatch ? { trigger: triggerPatch } : {}) });
      setIsDirty(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* purple dots bg */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "var(--bg-frame)",
          backgroundImage:
            "radial-gradient(circle, color-mix(in srgb, var(--accent) 28%, transparent) 1.2px, transparent 1.2px)",
          backgroundSize: "26px 26px",
          zIndex: 0,
        }}
      />

      {/* toolbar */}
      <div
        style={{
          position: "relative",
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 14px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elev)",
          backdropFilter: "blur(8px)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "var(--text-subtle)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginRight: 4,
          }}
        >
          Mode
        </span>
        {([false, true] as boolean[]).map((fm) => (
          <button
            key={String(fm)}
            onClick={() => setFreeMode(fm)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 7,
              border: `1px solid ${freeMode === fm ? "var(--border-strong)" : "var(--border)"}`,
              background: freeMode === fm ? "var(--bg-inset)" : "transparent",
              color: freeMode === fm ? "var(--text)" : "var(--text-subtle)",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.14s",
            }}
          >
            {fm ? <Move size={11} /> : <Lock size={11} />}
            {fm ? "Free" : "Fixed"}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => {
            setTestOpen((v) => !v);
            setTestSteps(null);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 12px",
            borderRadius: 7,
            border: "1px solid var(--border)",
            background: testOpen ? "var(--bg-inset)" : "transparent",
            color: "var(--text-muted)",
            fontSize: 11,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          ▶ Test
        </button>
        <button
          onClick={save}
          disabled={saving || (!isDirty && !savedFlash)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 16px",
            borderRadius: 8,
            background: savedFlash
              ? "rgba(34,197,94,0.15)"
              : isDirty
              ? "var(--bg-inset)"
              : "transparent",
            border: `1px solid ${
              savedFlash
                ? "rgba(34,197,94,0.3)"
                : isDirty
                ? "var(--border-strong)"
                : "var(--border)"
            }`,
            color: savedFlash ? "#22c55e" : isDirty ? "var(--text)" : "var(--text-subtle)",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: isDirty && !saving ? "pointer" : "default",
            transition: "all 0.2s",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : savedFlash ? "✓ Saved" : "Save"}
        </button>
      </div>

      {/* test panel */}
      <AnimatePresence>
        {testOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 36 }}
            style={{
              position: "relative",
              zIndex: 6,
              overflow: "hidden",
              background: "var(--bg-elev)",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-subtle)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Dry Run — simulates trigger without sending anything
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                <input
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runTest()}
                  placeholder='Type a comment to simulate, e.g. "send me the link"'
                  style={{
                    flex: 1,
                    background: "var(--border)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 11,
                    color: "var(--text-muted)",
                    outline: "none",
                  }}
                />
                <button
                  onClick={runTest}
                  disabled={testRunning || !testText.trim()}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: "var(--bg-inset)",
                    border: "1px solid var(--border-strong)",
                    color: "var(--text)",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    opacity: testRunning || !testText.trim() ? 0.4 : 1,
                  }}
                >
                  {testRunning ? "Running…" : "Run"}
                </button>
              </div>
              {testSteps !== null && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {testSteps.length === 0 ? (
                    <div style={{ fontSize: 11, color: "#ef4444" }}>
                      No steps would execute — check trigger keyword and node config.
                    </div>
                  ) : (
                    testSteps.map((step, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          background: "rgba(34,197,94,0.06)",
                          border: "1px solid rgba(34,197,94,0.12)",
                          borderRadius: 7,
                          padding: "6px 10px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color: "#22c55e",
                            fontWeight: 600,
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          {i + 1}
                        </span>
                        <div>
                          <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginBottom: 2 }}>
                            {step.nodeType.replace(/_/g, " ")} → {step.action}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
                            {step.text.slice(0, 120)}
                            {step.text.length > 120 ? "…" : ""}
                          </div>
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
      <div
        style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex" }}
      >
        {/* drop zone highlight */}
        <AnimatePresence>
          {isDragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 30,
                pointerEvents: "none",
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
            onNodesUpdate={(ns) => {
              setNodes(ns);
              setIsDirty(true);
            }}
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
        <AddResponsePanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          onAdd={addNode}
          nodes={nodes}
        />
      </div>

      {/* floating Add Response button */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
        }}
      >
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setPanelOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 24px",
            borderRadius: 50,
            background: "var(--bg-inset)",
            border: "1px solid var(--border-strong)",
            color: "var(--text)",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
            backdropFilter: "blur(12px)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <Plus size={15} strokeWidth={2.5} /> Add Response
        </motion.button>
      </div>
    </div>
  );
}
