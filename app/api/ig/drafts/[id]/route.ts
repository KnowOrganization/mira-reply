import { NextRequest, NextResponse } from "next/server";
import { readStore, updateStore } from "@/lib/ig/store";
import { sendDraft } from "@/lib/ig/pipeline";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    action?: "approve" | "reject" | "edit";
    text?: string;
  };
  const store = await readStore();
  const draft = store.pendingDrafts.find((d) => d.id === id);
  if (!draft) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!store.account) return NextResponse.json({ error: "not connected" }, { status: 400 });

  if (body.action === "reject") {
    await updateStore((s) => ({
      ...s,
      pendingDrafts: s.pendingDrafts.filter((d) => d.id !== id),
    }));
    return NextResponse.json({ ok: true });
  }
  if (body.action === "edit" && typeof body.text === "string") {
    const text = body.text;
    await updateStore((s) => ({
      ...s,
      pendingDrafts: s.pendingDrafts.map((d) =>
        d.id === id ? { ...d, draftText: text } : d
      ),
    }));
    return NextResponse.json({ ok: true });
  }
  if (body.action === "approve") {
    const final = body.text ? { ...draft, draftText: body.text } : draft;
    await sendDraft(final, store.account.accessToken, store.account.igUserId);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "bad action" }, { status: 400 });
}
