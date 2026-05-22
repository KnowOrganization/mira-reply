import { NextRequest, NextResponse } from "next/server";
import { readStore, patchStore, type PostLink } from "@/lib/ig/store";
import { chatJSON } from "@/lib/ig/llm";

export const runtime = "nodejs";

type Extracted = {
  notes: string;
  links: { label: string; url?: string; type: PostLink["type"] }[];
  qa: { q: string; a: string }[];
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const { paragraph } = (await req.json()) as { paragraph: string };
  const s = await readStore();
  const p = s.posts[id];
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });

  const extracted = await chatJSON<Extracted>(
    [
      {
        role: "system",
        content:
          "Extract structured info from a paragraph about an Instagram post. Return JSON: " +
          '{"notes":"<concise summary>","links":[{"label":"Munnar location","url":"https://...","type":"location"}],"qa":[{"q":"What bike?","a":"KTM Duke 390"}]}. ' +
          "Types: location, song, gear, shop, other. Only include URL if explicit. Keep notes under 200 chars. qa is optional Q/A pairs the owner stated.",
      },
      { role: "user", content: paragraph },
    ],
    { notes: paragraph.slice(0, 200), links: [], qa: [] }
  );

  const newLinks: PostLink[] = (extracted.links || [])
    .filter((l) => l.label)
    .map((l) => ({
      id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: l.label,
      url: l.url || "",
      type: l.type || "other",
    }));

  const updated = {
    ...p,
    notes: extracted.notes ? extracted.notes : p.notes,
    links: [...(p.links || []), ...newLinks],
    qa: [...p.qa, ...(extracted.qa || []).map((x) => ({ ...x, ts: Date.now() }))],
    updatedAt: Date.now(),
  };
  await patchStore({ posts: { ...s.posts, [id]: updated } });
  return NextResponse.json({ post: updated, extracted });
}
