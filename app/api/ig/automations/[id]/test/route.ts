import { NextRequest, NextResponse } from "next/server";
import { readStore } from "@/lib/ig/store";
import { executeAutomation } from "@/lib/ig/automation";
import type { AutomationTriggerType } from "@/lib/ig/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await readStore();
  const automation = (store.automations ?? []).find((a) => a.id === id);
  if (!automation) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const text: string = body.text ?? "test comment";
  const triggerType: AutomationTriggerType = body.triggerType ?? automation.trigger.type;

  const steps = await executeAutomation(
    automation,
    {
      type: triggerType,
      commentId: `test_${Date.now()}`,
      fromUserId: "test_user",
      fromUsername: "test_user",
      text,
    },
    { dryRun: true }
  );

  return NextResponse.json({ steps, nodeCount: automation.nodes.length - 1 });
}
