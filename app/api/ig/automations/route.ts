import { NextRequest, NextResponse } from "next/server";
import { readStore, updateStore } from "@/lib/ig/store";
import type { Automation, AutomationNode } from "@/lib/ig/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/ig/automations → list IgStore visual (node-graph) automations
export async function GET() {
  const store = await readStore();
  return NextResponse.json({ automations: store.automations ?? [] });
}

// POST /api/ig/automations → create a new automation seeded with a trigger node
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const now = Date.now();
  const id = `auto_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const triggerNode: AutomationNode = {
    id: `node_trigger_${now.toString(36)}`,
    type: "trigger",
    position: { x: 0, y: 0 },
    data: { text: "comment_post", subtitle: "keywords", enabled: true },
  };

  const automation: Automation = {
    id,
    name: body.name?.trim() || "New Automation",
    enabled: false,
    trigger: { type: "comment_post", keywords: [], postIds: [] },
    nodes: [triggerNode],
    edges: [],
    stats: { triggered: 0, completed: 0, failed: 0 },
    createdAt: now,
    updatedAt: now,
  };

  await updateStore((s) => ({ ...s, automations: [...(s.automations ?? []), automation] }));
  return NextResponse.json({ automation }, { status: 201 });
}
