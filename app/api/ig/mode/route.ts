import { NextRequest, NextResponse } from "next/server";
import { readStore, patchStore } from "@/lib/ig/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { mode } = (await req.json()) as {
    mode: "shadow" | "assisted" | "balanced" | "auto";
  };
  if (!["shadow", "assisted", "balanced", "auto"].includes(mode)) {
    return NextResponse.json({ error: "bad mode" }, { status: 400 });
  }
  const cur = await readStore();
  const next = await patchStore({ settings: { ...cur.settings, replyMode: mode } });
  return NextResponse.json({ ok: true, mode: next.settings.replyMode });
}
