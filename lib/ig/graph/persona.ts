// One-liner persona tier — a small materialized identity string (name/niche/
// voice/tone, NOT facts), the one place a static fallback is legitimate: used
// when the ranked "brief" retrieval (graph/retrieve.ts) comes back empty,
// e.g. a brand-new account with too few facts to clear the relevance floor.
// "Brief"/"full" are never materialized — see retrieve.ts's header comment
// for why a static tiered blob recreates the bike-example bug this replaces.
import { db, personas } from "@shaiz/db";
import { eq } from "drizzle-orm";
import { chatJSON } from "../llm";
import type { IgStore } from "../store";

function graphVersionFor(s: IgStore): string {
  // same version-hash idiom as ctx.ts's account cache — cheap invalidation signal.
  return `${s.knowledge.length}:${s.ownerProfile.voice}:${s.ownerProfile.bio}:${s.toneSummary.length}`;
}

async function regenerateOneLiner(accountId: string, store: IgStore, version: string): Promise<string> {
  const topFacts = store.knowledge
    .filter((f) => f.scope === "account" && (f.topic === "personal" || f.topic === "general"))
    .slice(0, 15)
    .map((f) => `${f.question}: ${f.answer}`)
    .join("\n");
  if (!topFacts && !store.ownerProfile.bio) return "";

  const out = await chatJSON<{ oneLiner: string }>(
    [
      {
        role: "system",
        content:
          "Write ONE short sentence (under 20 words) capturing who this Instagram account owner is — " +
          'name/niche/vibe. Plain, human, no corporate tone. Output JSON only: {"oneLiner":"..."}',
      },
      {
        role: "user",
        content: `Bio: ${store.ownerProfile.bio}\nVoice: ${store.ownerProfile.voice}\nFacts:\n${topFacts}`,
      },
    ],
    { oneLiner: "" }
  );
  const oneLiner = (out.oneLiner || "").trim();

  await db
    .insert(personas)
    .values({ accountId, oneLiner, graphVersion: version, generatedAt: Date.now(), model: null })
    .onConflictDoUpdate({
      target: personas.accountId,
      set: { oneLiner, graphVersion: version, generatedAt: Date.now() },
    });
  return oneLiner;
}

/** Cached one-liner, regenerated only when the account's brain has actually
 *  changed (version-hash check, same debounce pattern as ctx.ts's caches). */
export async function getOneLiner(accountId: string, store: IgStore): Promise<string> {
  const version = graphVersionFor(store);
  const [row] = await db.select().from(personas).where(eq(personas.accountId, accountId));
  if (row && row.graphVersion === version) return row.oneLiner;
  return regenerateOneLiner(accountId, store, version);
}

/** Fire-and-forget warm — call after a brain rebuild so the one-liner is
 *  ready before the first reply needs it, instead of adding LLM latency to
 *  that reply. Never throws. */
export function warmOneLiner(accountId: string, store: IgStore): void {
  getOneLiner(accountId, store).catch(() => {});
}
