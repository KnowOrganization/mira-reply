// Vision pass — one LLM call per post, at sync time, never per-reply. Output
// feeds buildPostContext (lib/ig/ctx.ts) and the same entity/edge graph
// pipeline as text facts (lib/ig/graph/), so a detected entity shows up as a
// real graph node the ranked retrieval can surface, not a bespoke field.
//
// Isolated vision model list (lib/ig/providers/nim.ts VISION_MODELS) — most
// models in the general reply-time cascade don't accept images at all, so
// this never risks the main reply pipeline picking up a vision-only model.
import { chatVision } from "./llm";
import type { Post, IgStore } from "./store";
import { patchStoreFor } from "./store";
import { upsertEntityNode } from "./graph/nodes";
import { linkPostFeaturesEntity } from "./graph/edges";

const VISION_ELIGIBLE = new Set(["IMAGE", "CAROUSEL_ALBUM"]); // skip VIDEO/REEL — no static frame to describe

type VisionOut = { description: string; entities: { name: string; type: string }[] };

function parseJSON(raw: string): VisionOut {
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const out = JSON.parse(cleaned) as Partial<VisionOut>;
    return { description: out.description || "", entities: out.entities || [] };
  } catch {
    return { description: "", entities: [] };
  }
}

/** Describe one post's image via a vision LLM call. Does not persist —
 *  callers decide when/whether to store the result. */
export async function describePost(post: Post): Promise<VisionOut | null> {
  if (!VISION_ELIGIBLE.has(post.mediaType)) return null;
  const imageUrl = post.thumbnailUrl;
  if (!imageUrl) return null;

  const raw = await chatVision([
    {
      role: "system",
      content:
        "Describe this Instagram photo in one short factual sentence — what's visible, setting, mood. " +
        "Also list notable entities worth remembering (a place, product/gear, brand) if clearly identifiable. " +
        'Output JSON only: {"description":"...","entities":[{"name":"...","type":"..."}]}',
    },
    {
      role: "user",
      content: [
        { type: "text", text: post.caption ? `Caption: "${post.caption}"` : "No caption." },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    },
  // json_object response_format isn't reliably supported combined with image
  // content on these models — ask for JSON via the prompt instead, same
  // lenient fence-stripping parse chatJSON uses for the text-only cascade.
  ], { temperature: 0.3 }).catch(() => "");

  if (!raw) return null;
  const out = parseJSON(raw);
  return out.description ? out : null;
}

/** Describe + persist one post, and mirror detected entities into the graph
 *  (post-node --features--> entity-node). Never touches notes/qa/links —
 *  patches only visionDescription, sidestepping syncPosts' existing bug where
 *  `existing` is read from the wrong object and owner edits get discarded. */
export async function describeAndStorePost(accountId: string, post: Post): Promise<void> {
  const out = await describePost(post);
  if (!out) return;

  await patchStoreFor(accountId, (s: IgStore) => ({
    ...s,
    posts: {
      ...s.posts,
      [post.id]: s.posts[post.id]
        ? { ...s.posts[post.id], visionDescription: out.description }
        : s.posts[post.id],
    },
  }));

  for (const e of out.entities) {
    const name = (e.name || "").trim();
    if (!name) continue;
    const entityNodeId = await upsertEntityNode(accountId, name, e.type);
    await linkPostFeaturesEntity(accountId, post.id, entityNodeId).catch(() => {});
  }
}

/** Backfill: describe every vision-eligible post an account has that's
 *  missing a description yet. Mirrors graph/backfill.ts's pattern — safe to
 *  re-run, only touches posts without an existing description. */
export async function backfillVisionForAccount(accountId: string, store: IgStore): Promise<{ described: number }> {
  let described = 0;
  for (const post of Object.values(store.posts)) {
    if (post.visionDescription) continue;
    if (!VISION_ELIGIBLE.has(post.mediaType)) continue;
    await describeAndStorePost(accountId, post);
    described++;
  }
  return { described };
}
