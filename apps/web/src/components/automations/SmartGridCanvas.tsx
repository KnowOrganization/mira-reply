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

  const cols = Math.max(
    1,
    Math.floor((containerW - SG_PAD_X * 2 + SG_HGAP) / (SG_NODE_W + SG_HGAP))
  );

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
      const xCol = isOdd ? cols - 1 - c : c;
      positions.push({ x: SG_PAD_X + xCol * (SG_NODE_W + SG_HGAP), y: rowY, row, xCol });
    }
    rowY += rowMaxH + SG_VGAP;
  }
  const canvasH = rowY + SG_PAD_Y;
  const canvasW = SG_PAD_X * 2 + cols * SG_NODE_W + (cols - 1) * SG_HGAP;

  const CONN_Y = 44;

  function connPath(i: number): { d: string; dotX: number; dotY: number } {
    const src = positions[i], tgt = positions[i + 1];
    const srcH = heights[nodes[i].id] ?? 80;

    if (src.row === tgt.row) {
      const isOdd = src.row % 2 === 1;
      const x1 = isOdd ? src.x : src.x + SG_NODE_W;
      const y1 = src.y + CONN_Y;
      const x2 = isOdd ? tgt.x + SG_NODE_W : tgt.x;
      const y2 = tgt.y + CONN_Y;
      const mx = (x1 + x2) / 2;
      return {
        d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`,
        dotX: x2,
        dotY: y2,
      };
    }

    const x = src.x + SG_NODE_W / 2;
    const y1 = src.y + srcH;
    const y2 = tgt.y;
    const cy = (y1 + y2) / 2;
    return {
      d: `M ${x} ${y1} C ${x} ${cy}, ${x} ${cy}, ${x} ${y2}`,
      dotX: x,
      dotY: y2,
    };
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
                  stroke="#7c3aed"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  opacity="0.65"
                />
                <circle
                  cx={dotX}
                  cy={dotY}
                  r="4"
                  fill="#7c3aed"
                  style={{ filter: "drop-shadow(0 0 4px #7c3aed)" }}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
