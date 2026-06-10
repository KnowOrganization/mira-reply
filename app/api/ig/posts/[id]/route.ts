import { NextRequest, NextResponse } from "next/server";
import { readStore, patchStore, type PostLink } from "@/lib/ig/store";
import { serveLinkForPost } from "@/lib/ig/links";
import { reprocessClarification } from "@/lib/ig/pipeline";

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

  // the owner just added context (notes / Q&A) → that may now answer the
  // open clarifications on this post. Close them and re-run their comments;
  // if the new context resolves them, Mira replies — if not, it re-asks.
  const notesChanged = typeof body.notes === "string" && body.notes !== p.notes;
  if (notesChanged || body.addQA) {
    const fresh = await readStore();
    const open = fresh.clarifications.filter(
      (c) => c.postId === id && c.status === "open"
    );
    if (open.length) {
      await patchStore({
        clarifications: fresh.clarifications.map((c) =>
          c.postId === id && c.status === "open"
            ? { ...c, status: "answered" as const }
            : c
        ),
      });
      // re-run in the background — does not block the response
      for (const c of open) void reprocessClarification(c);
    }
  }

  return NextResponse.json({ post: updated });
}
