import { NextRequest, NextResponse } from "next/server";
import { readStore } from "@/lib/ig/store";
import { processInbound } from "@/lib/ig/pipeline";

export const runtime = "nodejs";

/** Re-run the pipeline on a cached comment — manual "reply now" trigger. */
export async function POST(req: NextRequest) {
  const { commentId } = (await req.json().catch(() => ({}))) as {
    commentId?: string;
  };
  if (!commentId) {
    return NextResponse.json({ error: "commentId required" }, { status: 400 });
  }
  const s = await readStore();
  const c = s.commentsCache.find((x) => x.id === commentId);
  if (!c) {
    return NextResponse.json({ error: "comment not found" }, { status: 404 });
  }
  processInbound({
    kind: "comment",
    threadOrMediaId: c.id,
    fromUserId: c.fromUserId,
    fromUsername: c.fromUsername,
    text: c.text,
    postId: c.postId,
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}
