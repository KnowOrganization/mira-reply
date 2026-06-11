"use client";

// Free-drag canvas: nodes are draggable to arbitrary positions

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import type { AutomationNodeData, AutomationNodeType, AutomationNode } from "@shaiz/shared";
import { RenderNode } from "./NodeCards";
import { computeWindowOpen } from "./helpers";
import type { Pos } from "./types";

const NODE_W = 288;

export function FreeDragCanvas({
  nodes,
  onNodesUpdate,
  onUpdate,
  onDelete,
  drawerOpen: _drawerOpen,
  onDropAdd,
  onDragOverChange,
}: {
  nodes: AutomationNode[];
  onNodesUpdate: (ns: AutomationNode[]) => void;
  onUpdate: (id: string, p: Partial<AutomationNodeData>) => void;
  onDelete: (id: string) => void;
  drawerOpen: boolean;
  onDropAdd: (type: AutomationNodeType, pos: { x: number; y: number }) => void;
  onDragOverChange: (v: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [positions, setPositions] = useState<Record<string, Pos>>(() => {
    const map: Record<string, Pos> = {};
    nodes.forEach((n, i) => {
      if (n.position?.x || n.position?.y) {
        map[n.id] = { x: n.position.x, y: n.position.y };
      } else {
        const FCOLS = 2, FNW = 288, FHGAP = 60, FVGAP = 60, FPADX = 56, FPADY = 48;
        const row = Math.floor(i / FCOLS);
        const col = i % FCOLS;
        const xCol = row % 2 === 0 ? col : FCOLS - 1 - col;
        map[n.id] = { x: FPADX + xCol * (FNW + FHGAP), y: FPADY + row * (320 + FVGAP) };
      }
    });
    return map;
  });
  const [heights, setHeights] = useState<Record<string, number>>({});
  const dragging = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // ensure new nodes get a position
  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };
      let changed = false;
      nodes.forEach((n) => {
        if (!next[n.id]) {
          const lastPos = Object.values(next).reduce(
            (max, p) => (p.y > max.y ? p : max),
            { x: 120, y: 0 }
          );
          next[n.id] = { x: lastPos.x, y: lastPos.y + 260 };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [nodes]);

  // measure heights
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

  const onMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const pos = positions[id] ?? { x: 0, y: 0 };
    dragging.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const { id, startX, startY, origX, origY } = dragging.current;
    setPositions((prev) => ({
      ...prev,
      [id]: { x: origX + e.clientX - startX, y: origY + e.clientY - startY },
    }));
  };

  const onMouseUp = () => {
    if (!dragging.current) return;
    const { id } = dragging.current;
    const pos = positions[id];
    onNodesUpdate(nodes.map((n) => (n.id === id ? { ...n, position: pos } : n)));
    dragging.current = null;
  };

  const maxX = Math.max(
    ...nodes.map((n) => (positions[n.id]?.x ?? 0) + NODE_W + 80),
    900
  );
  const maxY = Math.max(
    ...nodes.map((n) => (positions[n.id]?.y ?? 0) + (heights[n.id] ?? 220) + 80),
    700
  );

  return (
    <div
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverChange(true);
      }}
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
      style={{
        flex: 1,
        overflow: "auto",
        position: "relative",
        cursor: dragging.current ? "grabbing" : "default",
      }}
    >
      <div
        style={{
          position: "relative",
          width: maxX,
          height: maxY,
          minWidth: "100%",
          minHeight: "100%",
        }}
      >
        {/* SVG connection lines */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
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
                <path
                  d={`M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#7c3aed"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  opacity="0.7"
                />
                <circle
                  cx={x2}
                  cy={y2}
                  r="4"
                  fill="#7c3aed"
                  style={{ filter: "drop-shadow(0 0 4px #7c3aed)" }}
                />
              </g>
            );
          })}
        </svg>

        {/* nodes */}
        {nodes.map((node) => {
          const pos = positions[node.id] ?? { x: 120, y: 60 };
          return (
            <div
              key={node.id}
              ref={(el) => {
                if (el) nodeRefs.current.set(node.id, el);
                else nodeRefs.current.delete(node.id);
              }}
              onMouseDown={(e) => onMouseDown(e, node.id)}
              style={{ position: "absolute", left: pos.x, top: pos.y, userSelect: "none" }}
            >
              <RenderNode
                node={node}
                onUpdate={(p) => onUpdate(node.id, p)}
                onDelete={() => onDelete(node.id)}
                canDelete={node.type !== "trigger"}
                dragMode
                windowOpen={computeWindowOpen(nodes)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
