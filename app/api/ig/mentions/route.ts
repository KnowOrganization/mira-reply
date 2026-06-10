import { NextRequest, NextResponse } from "next/server";
import { readStore, updateStore, type Mention } from "@/lib/ig/store";
import { getTaggedMedia } from "@/lib/ig/graph";
import { publish } from "@/lib/ig/bus";

export const runtime = "nodejs";

// GET — return mentions newest first.
export async function GET() {
  const s = await readStore();
  const list = [...(s.mentions || [])].sort((a, b) => b.ts - a.ts);
  return NextResponse.json({ mentions: list });
}

// POST — refresh by fetching /tags (where the account is photo-tagged in
// someone else's post). Caption + comment mentions arrive via webhook.
export async function POST() {
  const s = await readStore();
  if (!s.account) {
    return NextResponse.json({ error: "not connected" }, { status: 400 });
  }
  const { igUserId, accessToken } = s.account;
  let added = 0;
  try {
    const tagged = (await getTaggedMedia(accessToken, igUserId)) as {
      data?: Array<{
        id: string;
        caption?: string;
        media_type?: string;
        permalink?: string;
        thumbnail_url?: string;
        media_url?: string;
        timestamp?: string;
        username?: string;
        like_count?: number;
        comments_count?: number;
      }>;
    };

    const incoming: Mention[] = (tagged.data ?? []).map((m) => ({
      id: `tag:${m.id}`,
      kind: "tag",
      mediaId: m.id,
      permalink: m.permalink,
      thumbnailUrl: m.thumbnail_url || m.media_url,
      mediaUrl: m.media_url,
      mediaCaption: m.caption || "",
      mediaType: m.media_type,
      likeCount: m.like_count,
      commentsCount: m.comments_count,
      fromUsername: m.username,
      ts: m.timestamp ? new Date(m.timestamp).getTime() : Date.now(),
      seenAt: Date.now(),
      read: false,
    }));

    await updateStore((cur) => {
      const existing = new Map((cur.mentions || []).map((x) => [x.id, x]));
      for (const m of incoming) {
        const prev = existing.get(m.id);
        if (!prev) {
          existing.set(m.id, m);
          added++;
        } else {
          // refresh metadata + insights, preserve read/seenAt
          existing.set(m.id, {
            ...prev,
            ...m,
            seenAt: prev.seenAt,
            read: prev.read,
          });
        }
      }
      return { ...cur, mentions: Array.from(existing.values()).slice(0, 500) };
    });

    publish({
      type: "log",
      level: "info",
      msg: `mentions refresh: +${added} (tags)`,
      ts: Date.now(),
    });
    return NextResponse.json({ ok: true, added, scanned: incoming.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "mentions fetch failed" },
      { status: 500 }
    );
  }
}

// PATCH — mark all read OR mark single by id.
export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    read?: boolean;
    all?: boolean;
  };
  const targetRead = body.read !== false;
  await updateStore((s) => {
    const next = (s.mentions || []).map((m) => {
      if (body.all) return { ...m, read: targetRead };
      if (body.id && m.id === body.id) return { ...m, read: targetRead };
      return m;
    });
    return { ...s, mentions: next };
  });
  return NextResponse.json({ ok: true });
}
