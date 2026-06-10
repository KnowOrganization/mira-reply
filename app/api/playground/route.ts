import { NextResponse } from "next/server";
import { decide, type DraftInput } from "@/lib/ig/pipeline";
import type { Post } from "@/lib/ig/store";

export const runtime = "nodejs";

/**
 * Dry-run the reply pipeline against made-up data. Runs the real decision
 * logic + real model, but on a fake post + fake comment — it never writes to
 * the store and never sends anything to Instagram. Safe testing sandbox.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    comment?: string;
    caption?: string;
    notes?: string;
    qa?: { q: string; a: string }[];
  };
  const text = (body.comment || "").trim();
  if (!text)
    return NextResponse.json({ error: "comment is required" }, { status: 400 });

  const qa = (Array.isArray(body.qa) ? body.qa : [])
    .filter((x) => x && x.q?.trim() && x.a?.trim())
    .map((x) => ({ q: x.q.trim(), a: x.a.trim(), ts: Date.now() }));

  const post: Post = {
    id: "playground",
    caption: body.caption || "",
    mediaType: "IMAGE",
    timestamp: new Date().toISOString(),
    notes: body.notes || "",
    qa,
    links: [],
    updatedAt: Date.now(),
  };
  const input: DraftInput = {
    kind: "comment",
    threadOrMediaId: "playground_comment",
    fromUserId: "playground_user",
    fromUsername: "playground_tester",
    text,
    postId: "playground",
  };

  const startedAt = Date.now();
  try {
    const decision = await decide(input, post);
    return NextResponse.json({ decision, ms: Date.now() - startedAt });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "decide failed" },
      { status: 500 }
    );
  }
}
