import { NextResponse } from "next/server";
import { readStore } from "@/lib/ig/store";

export const runtime = "nodejs";

export async function GET() {
  const s = await readStore();
  return NextResponse.json({
    pending: s.pendingDrafts,
    history: s.history.slice(0, 50),
    mode: s.settings.replyMode,
  });
}
