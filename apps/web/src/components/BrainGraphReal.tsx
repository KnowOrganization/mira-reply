"use client";

// The real graph — nodes/edges from graph_nodes/graph_edges (lib/ig/graph/),
// not the cosmetic topic-bucketed sunburst in BrainGraph.tsx. Ships as a
// toggle alongside it (see Brain.tsx), not a replacement — the sunburst stays
// until this earns its keep.
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBrainGraph } from "@/lib/api/hooks";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const TYPE_COLOR: Record<string, string> = {
  fact: "#0095f6",
  post: "#4fa86a",
  entity: "#e0883a",
  topic: "#9aa0a6",
  commenter: "#c06ca8",
};
const TYPE_SIZE: Record<string, number> = { post: 5, entity: 4, commenter: 3, fact: 2, topic: 3 };

export function BrainGraphReal({ onSelectFactId }: { onSelectFactId?: (id: string) => void }) {
  const { data, isLoading } = useBrainGraph();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 600, height: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(
    () => ({
      nodes: (data?.nodes ?? []).map((n) => ({ ...n, val: TYPE_SIZE[n.type] ?? 2 })),
      links: data?.links ?? [],
    }),
    [data]
  );

  return (
    <div ref={containerRef} className="w-full h-full min-h-[300px]">
      {isLoading ? (
        <div className="w-full h-full flex items-center justify-center text-[12px]" style={{ color: "var(--text-subtle)" }}>
          Loading graph…
        </div>
      ) : !graphData.nodes.length ? (
        <div className="w-full h-full flex items-center justify-center text-[12px]" style={{ color: "var(--text-subtle)" }}>
          No graph data yet — facts/posts populate this once the brain has content.
        </div>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <ForceGraph2D
          {...({
            graphData,
            width: size.width,
            height: size.height,
            nodeId: "id",
            nodeLabel: "label",
            nodeVal: "val",
            nodeColor: (n: { type: string }) => TYPE_COLOR[n.type] ?? "#888",
            linkColor: () => "rgba(148,163,184,0.25)",
            linkWidth: (l: { weight?: number }) => Math.max(0.5, (l.weight ?? 1) * 1.5),
            onNodeClick: (n: { id: string; type: string }) => {
              if (n.type === "fact" && onSelectFactId) onSelectFactId(n.id.replace("node_fact_", ""));
            },
            cooldownTicks: 100,
          } as any)}
        />
      )}
    </div>
  );
}
