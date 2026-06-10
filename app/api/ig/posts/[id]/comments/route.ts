import { NextRequest, NextResponse } from "next/server";
import { readStore, patchStore, type CachedComment } from "@/lib/ig/store";
import { getMediaComments } from "@/lib/ig/graph";
import { primeSeen } from "@/lib/ig/seen";

export const runtime = "nodejs";

const MAX_CACHE = 5000;

type Raw = {
  id: string;
  text: string;
  from?: { id: string; username?: string };
  timestamp: string;
  replies?: { data?: Raw[] };
};

/**
 * Live-fetch EVERY comment on one post and merge it into the shared cache.
 * Called when the owner opens a post — so the post detail shows that post's
 * comments immediately, instead of waiting for the next watcher full sweep.
 *
 * This is display-only: it never queues replies. The watcher remains the sole
 * owner of new-comment processing (watermark + seen gating untouched).
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await ctx.params;
  const store = await readStore();
  if (!store.account)
    return NextResponse.json({ error: "not connected" }, { status: 400 });

  const post = store.posts[postId];
  const token = store.account.accessToken;
  const ownId = store.account.igUserId;
  const ownName = store.account.username.toLowerCase();
  // Instagram omits username on reply `from` objects — also match own
  // comments by exact text against replies Mira has already sent.
  const sentReplies = new Set(
    store.history
      .filter((h) => h.status === "sent" && h.outbound)
      .map((h) => h.outbound)
  );

  let res: { data?: Raw[] };
  try {
    res = (await getMediaComments(postId, token)) as { data?: Raw[] };
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "comment fetch failed" },
      { status: 502 }
    );
  }

  // flatten top-level comments and their nested replies
  const flat: Raw[] = [];
  for (const c of res.data ?? []) {
    flat.push(c);
    for (const r of c.replies?.data ?? []) flat.push(r);
  }

  const fresh: CachedComment[] = [];
  for (const c of flat) {
    if (!c.from) continue;
    fresh.push({
      id: c.id,
      postId,
      postCaption: post?.caption || "",
      postThumb: post?.thumbnailUrl,
      postPermalink: post?.permalink,
      text: c.text,
      fromUserId: c.from.id,
      fromUsername: c.from.username || "",
      timestamp: c.timestamp,
      ts: new Date(c.timestamp).getTime(),
      isOwn:
        c.from.id === ownId ||
        (!!c.from.username && c.from.username.toLowerCase() === ownName) ||
        sentReplies.has(c.text),
    });
  }

  // merge into the shared cache — dedupe by id, keep newest first
  const map = new Map(store.commentsCache.map((c) => [c.id, c]));
  for (const c of fresh) map.set(c.id, c);
  const merged = Array.from(map.values())
    .sort((a, b) => b.ts - a.ts)
    .slice(0, MAX_CACHE);
  await patchStore({ commentsCache: merged });

  // never let the watcher reply to Mira's own comments
  primeSeen(fresh.filter((c) => c.isOwn).map((c) => c.id));

  return NextResponse.json({ ok: true, count: fresh.length });
}
