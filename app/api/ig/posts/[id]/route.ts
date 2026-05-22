import { NextRequest, NextResponse } from "next/server";
import { readStore, patchStore, type PostLink } from "@/lib/ig/store";
import { serveLinkForPost } from "@/lib/ig/links";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const s = await readStore();
  const p = s.posts[id];
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ post: p });
}

type PatchBody = {
  notes?: string;
  addQA?: { q: string; a: string };
  addLink?: { label: string; url: string; type?: PostLink["type"] };
  removeLink?: string;
};

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = (await req.json()) as PatchBody;
  const s = await readStore();
  const p = s.posts[id];
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });

  const updated = { ...p, links: p.links || [], updatedAt: Date.now() };
  if (typeof body.notes === "string") updated.notes = body.notes;
  if (body.addQA) updated.qa = [...p.qa, { ...body.addQA, ts: Date.now() }];
  if (body.addLink) {
    updated.links = [
      ...updated.links,
      {
        id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        label: body.addLink.label,
        url: body.addLink.url,
        type: body.addLink.type || "other",
      },
    ];
  }
  if (body.removeLink) {
    updated.links = updated.links.filter((l) => l.id !== body.removeLink);
  }

  await patchStore({ posts: { ...s.posts, [id]: updated } });

  // a link was just attached → serve every comment on this post waiting on one
  if (body.addLink) {
    await serveLinkForPost(id).catch(() => {});
  }

  return NextResponse.json({ post: updated });
}
