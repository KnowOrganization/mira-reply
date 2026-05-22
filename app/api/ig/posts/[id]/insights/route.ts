import { NextRequest, NextResponse } from "next/server";
import { readStore, patchStore, type PostInsights } from "@/lib/ig/store";

export const runtime = "nodejs";

type GraphInsightsResponse = {
  data?: Array<{ name: string; values: { value: number | { reach?: number } }[] }>;
};

const METRICS_BY_TYPE: Record<string, string> = {
  VIDEO: "likes,comments,saved,shares,reach,total_interactions,plays",
  IMAGE: "likes,comments,saved,shares,reach,total_interactions",
  CAROUSEL_ALBUM: "likes,comments,saved,shares,reach,total_interactions",
};

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const s = await readStore();
  const p = s.posts[id];
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!s.account) return NextResponse.json({ error: "not connected" }, { status: 400 });

  const metrics = METRICS_BY_TYPE[p.mediaType] || METRICS_BY_TYPE.IMAGE;
  const url = new URL(`https://graph.instagram.com/v23.0/${id}/insights`);
  url.searchParams.set("metric", metrics);
  url.searchParams.set("access_token", s.account.accessToken);

  let data: GraphInsightsResponse = {};
  try {
    const res = await fetch(url);
    data = (await res.json()) as GraphInsightsResponse;
  } catch {
    /* ignore */
  }

  const map: Record<string, number> = {};
  for (const m of data.data ?? []) {
    const v = m.values?.[0]?.value;
    map[m.name] = typeof v === "number" ? v : 0;
  }

  const insights: PostInsights = {
    likes: map.likes,
    comments: map.comments,
    reach: map.reach,
    saved: map.saved,
    shares: map.shares,
    plays: map.plays,
    totalInteractions: map.total_interactions,
    fetchedAt: Date.now(),
  };

  await patchStore({
    posts: { ...s.posts, [id]: { ...p, insights, updatedAt: Date.now() } },
  });
  return NextResponse.json({ insights });
}
