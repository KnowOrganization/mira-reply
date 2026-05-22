import { NextRequest, NextResponse } from "next/server";
import { updateFact, deleteFact } from "@/lib/ig/knowledge";
import type { Fact } from "@/lib/ig/store";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const patch = (await req.json().catch(() => ({}))) as Partial<Fact>;
  // never let the client rewrite identity / derived fields
  delete patch.id;
  delete patch.embedding;
  delete patch.createdAt;
  const fact = await updateFact(id, patch);
  if (!fact) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ fact });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  await deleteFact(id);
  return NextResponse.json({ ok: true });
}
