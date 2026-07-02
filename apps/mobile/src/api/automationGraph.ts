import type { AutomationEdge, AutomationNode } from '@shaiz/shared';

// The backend engine executes automations by walking edges (source→target),
// never by nodes-array order. The mobile builder is a linear list, so its edges
// are always the simple chain trigger → step1 → … → stepN. Derive them on every
// save, exactly like web's AutomationCanvas.save() (same e_<src>_<tgt> id form).
export function deriveLinearEdges(nodes: AutomationNode[]): AutomationEdge[] {
  const trigger = nodes.find((n) => n.type === 'trigger');
  const ordered = trigger ? [trigger, ...nodes.filter((n) => n !== trigger)] : nodes;
  return ordered.slice(0, -1).map((n, i) => ({
    id: `e_${n.id}_${ordered[i + 1].id}`,
    source: n.id,
    target: ordered[i + 1].id,
  }));
}
