"use client";

// Slide-in panel for adding a new automation response node

import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight } from "lucide-react";
import type { AutomationNodeType, AutomationNode } from "@shaiz/shared";
import { RESPONSE_TYPES } from "./responseTypes";
import { getNodeValidation } from "./helpers";

export function AddResponsePanel({
  open,
  onClose,
  onAdd,
  nodes,
}: {
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
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 310,
            background: "var(--bg-elev)",
            borderLeft: "1px solid rgba(124,58,237,0.18)",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            boxShadow: "var(--shadow-card), -1px 0 0 rgba(124,58,237,0.1)",
          }}
        >
          {/* header */}
          <div
            style={{
              padding: "16px 16px 13px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                Add Response
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>
                Choose next step in your flow
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "var(--border)",
                border: "1px solid var(--border)",
                cursor: "pointer",
                color: "var(--text-muted)",
                display: "flex",
                borderRadius: 8,
                padding: "5px",
              }}
            >
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
                    if (blocked) {
                      (e as unknown as DragEvent).preventDefault?.();
                      return;
                    }
                    const de = e as unknown as DragEvent;
                    de.dataTransfer?.setData("nodeType", rt.type);
                    if (de.dataTransfer) de.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => {
                    if (!blocked) {
                      onAdd(rt.type);
                      onClose();
                    }
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 11,
                    padding: "11px 11px",
                    borderRadius: 11,
                    border: "1px solid transparent",
                    background: "transparent",
                    cursor: blocked ? "not-allowed" : "grab",
                    textAlign: "left",
                    marginBottom: 3,
                    opacity: blocked ? 0.65 : 1,
                  }}
                  whileHover={
                    blocked
                      ? {}
                      : {
                          background: "rgba(124,58,237,0.07)",
                          borderColor: "rgba(124,58,237,0.18)",
                        }
                  }
                  whileTap={blocked ? {} : { scale: 0.98 }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `${rt.color}18`,
                      border: `1px solid ${rt.color}2e`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: rt.color,
                      flexShrink: 0,
                      marginTop: warning ? 2 : 0,
                    }}
                  >
                    {rt.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: blocked ? "var(--text-muted)" : "var(--text)",
                        }}
                      >
                        {rt.label}
                      </span>
                      {rt.badge && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#22c55e",
                            background: "rgba(34,197,94,0.12)",
                            border: "1px solid rgba(34,197,94,0.25)",
                            padding: "1px 6px",
                            borderRadius: 4,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {rt.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-subtle)", marginBottom: warning ? 5 : 0 }}>
                      {rt.desc}
                    </div>
                    {warning && (
                      <div style={{ fontSize: 11, color: "#f87171", fontWeight: 500, lineHeight: 1.4 }}>
                        {warning}
                      </div>
                    )}
                  </div>
                  {!blocked && (
                    <ChevronRight
                      size={13}
                      color="var(--text-subtle)"
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* flow hint */}
          <div
            style={{
              padding: "12px 14px",
              borderTop: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: 10, color: "var(--text-subtle)", lineHeight: 1.6 }}>
              Selected step connects to the last node in your flow automatically.
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
