import { NextRequest, NextResponse } from "next/server";
import { readStore, updateStore } from "@/lib/ig/store";
import type { Automation } from "@/lib/ig/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fields a client is allowed to patch onto an automation.
type AutomationPatch = Partial<Pick<Automation, "name" | "enabled" | "trigger" | "nodes" | "edges" | "stats">>;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await readStore();
  const automation = (store.automations ?? []).find((a) => a.id === id);
  if (!automation) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ automation });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patch = (await req.json().catch(() => ({}))) as AutomationPatch;

  let updated: Automation | null = null;
  await updateStore((s) => {
    const list = s.automations ?? [];
    const next = list.map((a) => {
      if (a.id !== id) return a;
      updated = { ...a, ...patch, id: a.id, updatedAt: Date.now() };
      return updated;
    });
    return { ...s, automations: next };
  });

  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ automation: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let existed = false;
  await updateStore((s) => {
    const list = s.automations ?? [];
    existed = list.some((a) => a.id === id);
    return { ...s, automations: list.filter((a) => a.id !== id) };
  });
  if (!existed) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
