import { NextRequest, NextResponse } from "next/server";
import { processInbound } from "@/lib/ig/pipeline";
import { updateStore } from "@/lib/ig/store";
import { publish } from "@/lib/ig/bus";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    kind?: "comment" | "dm";
    text: string;
    fromUsername?: string;
    fromUserId?: string;
    postId?: string;
  };
  const kind = body.kind || "comment";
  const fromUserId = body.fromUserId || `dev_${Date.now()}`;
  const fromUsername = body.fromUsername || "test_user";
  const fakeId = `fake_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  publish({
    type: kind === "comment" ? "comment" : "message",
    ...(kind === "comment"
      ? { commentId: fakeId, mediaId: "fake_media", fromUserId, fromUsername, text: body.text, ts: Date.now() }
      : { messageId: fakeId, fromUserId, text: body.text, ts: Date.now() }),
  } as Parameters<typeof publish>[0]);

  // cache the injected comment so it shows in the master Comments view
  if (kind === "comment") {
    updateStore((s) => ({
      ...s,
      commentsCache: [
        {
          id: fakeId,
          postId: body.postId || "",
          postCaption: "(injected test)",
          text: body.text,
          fromUserId,
          fromUsername,
          timestamp: new Date().toISOString(),
          ts: Date.now(),
          isOwn: false,
        },
        ...s.commentsCache,
      ].slice(0, 5000),
    })).catch(() => {});
  }

  processInbound({
    kind,
    threadOrMediaId: fakeId,
    fromUserId,
    fromUsername,
    text: body.text,
    postId: body.postId,
  }).catch((e) =>
    publish({ type: "log", level: "error", msg: `inject pipeline: ${String(e)}`, ts: Date.now() })
  );

  return NextResponse.json({ ok: true, id: fakeId });
}
