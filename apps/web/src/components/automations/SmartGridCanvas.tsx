"use client";

// Auto-layout snake-grid canvas (no manual drag)

import { useState, useLayoutEffect, useRef } from "react";
import type { AutomationNodeData, AutomationNodeType, AutomationNode } from "@shaiz/shared";
import { RenderNode } from "./NodeCards";
import { computeWindowOpen } from "./helpers";
import { SG_NODE_W, SG_HGAP, SG_VGAP, SG_PAD_X, SG_PAD_Y } from "./constants";
import type { SGPos } from "./types";

export function SmartGridCanvas({
  nodes,
  onUpdate,
  onDelete,
  onDropAdd,
  onDragOverChange,
}: {
  nodes: AutomationNode[];
  onUpdate: (id: string, p: Partial<AutomationNodeData>) => void;
  onDelete: (id: string) => void;
  onDropAdd: (type: AutomationNodeType) => void;
  onDragOverChange: (v: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [containerW, setContainerW] = useState(800);
  const [heights, setHeights] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([e]) => setContainerW(e.contentRect.width));
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useLayoutEffect(() => {
    const h: Record<string, number> = {};
    nodeRefs.current.forEach((el, id) => {
      if (el) h[id] = el.offsetHeight;
    });
    setHeights((prev) => {
      const keys = new Set([...Object.keys(prev), ...Object.keys(h)]);
      for (const k of keys) if (prev[k] !== h[k]) return h;
      return prev;
    });
  });

  // Single-file flow — no 2-col snake. Wide canvas → one horizontal row (→);
  // narrow canvas → one vertical column (↓). Either way, one node after another.
  const horizontal = containerW >= SG_NODE_W * 2 + SG_HGAP + SG_PAD_X * 2 + 80;

  const CONN_Y = 44;

  // compute positions
  const positions: SGPos[] = [];
  if (horizontal) {
    let x = SG_PAD_X;
    for (let i = 0; i < nodes.length; i++) {
      positions.push({ x, y: SG_PAD_Y, row: 0, xCol: i });
      x += SG_NODE_W + SG_HGAP;
    }
  } else {
    let y = SG_PAD_Y;
    for (let i = 0; i < nodes.length; i++) {
      positions.push({ x: SG_PAD_X, y, row: i, xCol: 0 });
      y += (heights[nodes[i].id] ?? 280) + SG_VGAP;
    }
  }

  const lastH = nodes.length ? (heights[nodes[nodes.length - 1].id] ?? 280) : 0;
  const canvasW = horizontal
    ? SG_PAD_X * 2 + nodes.length * SG_NODE_W + Math.max(0, nodes.length - 1) * SG_HGAP
    : SG_PAD_X * 2 + SG_NODE_W;
  const canvasH = horizontal
    ? SG_PAD_Y * 2 + Math.max(...nodes.map((n) => heights[n.id] ?? 280), 280)
    : (positions.length ? positions[positions.length - 1].y + lastH + SG_PAD_Y : 400);

  function connPath(i: number): { d: string; dotX: number; dotY: number } {
    const src = positions[i], tgt = positions[i + 1];
    if (horizontal) {
      // straight right: src right-edge → tgt left-edge
      const x1 = src.x + SG_NODE_W;
      const y1 = src.y + CONN_Y;
      const x2 = tgt.x;
      const y2 = tgt.y + CONN_Y;
      const mx = (x1 + x2) / 2;
      return { d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`, dotX: x2, dotY: y2 };
    }
    // straight down: src bottom-center → tgt top-center
    const x = src.x + SG_NODE_W / 2;
    const y1 = src.y + (heights[nodes[i].id] ?? 80);
    const y2 = tgt.y;
    const cy = (y1 + y2) / 2;
    return { d: `M ${x} ${y1} C ${x} ${cy}, ${x} ${cy}, ${x} ${y2}`, dotX: x, dotY: y2 };
  }

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, overflow: "auto", position: "relative" }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverChange(true);
      }}
      onDragLeave={() => onDragOverChange(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDragOverChange(false);
        const t = e.dataTransfer.getData("nodeType") as AutomationNodeType;
        if (t) onDropAdd(t);
      }}
    >
      <div
        style={{
          position: "relative",
          width: Math.max(canvasW, containerW),
          height: Math.max(canvasH, 400),
          minHeight: "100%",
        }}
      >
        {nodes.map((node, i) => (
          <div
            key={node.id}
            ref={(el) => {
              if (el) nodeRefs.current.set(node.id, el);
              else nodeRefs.current.delete(node.id);
            }}
            style={{
              position: "absolute",
              left: positions[i]?.x ?? 0,
              top: positions[i]?.y ?? 0,
              width: SG_NODE_W,
            }}
          >
            <RenderNode
              node={node}
              onUpdate={(p) => onUpdate(node.id, p)}
              onDelete={() => onDelete(node.id)}
              canDelete={node.type !== "trigger"}
              windowOpen={computeWindowOpen(nodes)}
            />
          </div>
        ))}
        {/* SVG rendered after nodes so connectors draw on top */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {nodes.slice(0, -1).map((n, i) => {
            const { d, dotX, dotY } = connPath(i);
            return (
              <g key={`e-${n.id}`}>
                <path
                  d={d}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  opacity="0.65"
                />
                <circle
                  cx={dotX}
                  cy={dotY}
                  r="4"
                  fill="var(--accent)"
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
