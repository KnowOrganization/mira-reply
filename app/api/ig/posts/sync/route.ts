import { NextResponse } from "next/server";
import { readStore, patchStore, type Post } from "@/lib/ig/store";

export const runtime = "nodejs";

export async function POST() {
  const store = await readStore();
  if (!store.account) return NextResponse.json({ error: "not connected" }, { status: 400 });
  const token = store.account.accessToken;

  const url = new URL("https://graph.instagram.com/v23.0/me/media");
  url.searchParams.set(
    "fields",
    "id,caption,media_type,timestamp,permalink,thumbnail_url,media_url"
  );
  url.searchParams.set("limit", "50");
  url.searchParams.set("access_token", token);

  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json({ error: await res.text() }, { status: 502 });
  }
  const j = (await res.json()) as {
    data: Array<{
      id: string;
      caption?: string;
      media_type: string;
      timestamp: string;
      permalink?: string;
      thumbnail_url?: string;
      media_url?: string;
    }>;
  };

  const next = { ...store.posts };
  for (const m of j.data) {
    const existing = next[m.id];
    next[m.id] = {
      id: m.id,
      caption: m.caption || "",
      mediaType: m.media_type,
      permalink: m.permalink,
      thumbnailUrl: m.thumbnail_url || m.media_url,
      timestamp: m.timestamp,
      notes: existing?.notes || "",
      qa: existing?.qa || [],
      links: existing?.links || [],
      insights: existing?.insights,
      updatedAt: existing?.updatedAt || Date.now(),
    } satisfies Post;
  }
  await patchStore({ posts: next });
  return NextResponse.json({ ok: true, count: j.data.length });
}
