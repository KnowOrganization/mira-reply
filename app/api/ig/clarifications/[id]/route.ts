import { NextRequest, NextResponse } from "next/server";
import { readStore, updateStore } from "@/lib/ig/store";
import { reprocessClarification } from "@/lib/ig/pipeline";
import { promoteClarification } from "@/lib/ig/knowledge";
import { serveLinkForPost } from "@/lib/ig/links";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { action: "answer" | "skip"; answer?: string };
  const store = await readStore();
  const c = store.clarifications.find((x) => x.id === id);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (body.action === "skip") {
    await updateStore((s) => ({
      ...s,
      clarifications: s.clarifications.map((x) =>
        x.id === id ? { ...x, status: "skipped" as const } : x
      ),
    }));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "answer" && body.answer) {
    const answer = body.answer.trim();
    const isLink = c.kind === "link" || /^https?:\/\//i.test(answer);

    await updateStore((s) => {
      const posts = { ...s.posts };
      const p = c.postId ? posts[c.postId] : undefined;
      if (p) {
        if (isLink) {
          // link answer → attach to THIS post only (strictly post-scoped)
          posts[c.postId] = {
            ...p,
            links: [
              ...(p.links || []),
              {
                id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                label: "link",
                url: answer,
                type: "other" as const,
              },
            ],
            updatedAt: Date.now(),
          };
        } else {
          // context answer → fold into the post's Q&A
          posts[c.postId] = {
            ...p,
            qa: [...p.qa, { q: c.question, a: answer, ts: Date.now() }],
            updatedAt: Date.now(),
          };
        }
      }
      return {
        ...s,
        clarifications: s.clarifications.map((x) =>
          x.id === id ? { ...x, status: "answered" as const, answer } : x
        ),
        posts,
      };
    });

    if (isLink) {
      // serve this comment + everyone queued behind it (serveLinkForPost
      // reprocesses the clarification and all its waiters)
      await serveLinkForPost(c.postId).catch(() => {});
    } else {
      // context → promote into the knowledge base for cross-post recall,
      // then serve the comment + everyone queued behind it
      await promoteClarification(c, answer).catch(() => {});
      await reprocessClarification(c).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "bad action" }, { status: 400 });
}
