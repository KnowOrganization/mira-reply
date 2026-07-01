// One-liner + full persona tiers — the two MATERIALIZED tiers (see schema.ts
// personas table comment for why "brief" is never stored). One-liner: a
// small identity string, the one place a static fallback is legitimate (no
// query to rank against on a cold-open). Full: a synthesized markdown
// profile — an actual "about this creator" document, not a raw fact dump —
// shown in Settings/owner-facing views and the agentic planner, never
// injected into the hot per-comment reply path.
import { db, personas } from "@shaiz/db";
import { eq } from "drizzle-orm";
import { chat, chatJSON } from "../llm";
import type { IgStore } from "../store";
import { dedupeFacts } from "./retrieve";

function graphVersionFor(s: IgStore): string {
  // same version-hash idiom as ctx.ts's account cache — cheap invalidation signal.
  return `${s.knowledge.length}:${s.ownerProfile.voice}:${s.ownerProfile.bio}:${s.toneSummary.length}`;
}

async function getPersonaRow(accountId: string) {
  const [row] = await db.select().from(personas).where(eq(personas.accountId, accountId));
  return row;
}

async function regenerateOneLiner(accountId: string, store: IgStore, version: string): Promise<string> {
  const topFacts = dedupeFacts(
    store.knowledge.filter((f) => f.scope === "account" && (f.topic === "personal" || f.topic === "general"))
  )
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

async function regenerateFullPersona(accountId: string, store: IgStore, version: string): Promise<string> {
  const now = Date.now();
  const accountFacts = dedupeFacts(
    store.knowledge.filter((f) => f.scope === "account" && !(f.expiresAt && f.expiresAt < now))
  );
  const postFacts = dedupeFacts(store.knowledge.filter((f) => f.scope === "post"));
  const posts = Object.values(store.posts);

  const factsText = accountFacts.map((f) => `- ${f.question}: ${f.answer}`).join("\n");
  const postFactsText = postFacts.map((f) => `- ${f.question}: ${f.answer}`).join("\n");
  const postsText = posts
    .map((p) => [p.caption, p.visionDescription].filter(Boolean).join(" — "))
    .filter(Boolean)
    .slice(0, 20)
    .join("\n");

  if (!accountFacts.length && !store.ownerProfile.bio && !postsText) return "";

  const doc = await chat(
    [
      {
        role: "system",
        content:
          "Write a comprehensive markdown profile of this Instagram creator/account, for internal reference. " +
          "Use markdown headers (## Section) — cover whatever sections the data actually supports: identity, " +
          "niche & content themes, personality & voice, gear/tools, location, audience, what they offer/sell, " +
          "anything distinctive. Be concrete, cite specifics from the facts/posts given below — never invent " +
          "details, and omit a section entirely rather than padding it with generic filler.",
      },
      {
        role: "user",
        content:
          `OWNER PROFILE\nBio: ${store.ownerProfile.bio || "(none)"}\nVoice: ${store.ownerProfile.voice || "(none)"}\n` +
          `Tone: ${store.toneSummary || "(none)"}\n\n` +
          `ACCOUNT-WIDE FACTS\n${factsText || "(none)"}\n\n` +
          `POST-SPECIFIC FACTS\n${postFactsText || "(none)"}\n\n` +
          `RECENT POST CONTENT (caption — image description)\n${postsText || "(none)"}`,
      },
    ],
    { temperature: 0.5 }
  );

  const full = doc.trim();
  await db
    .insert(personas)
    .values({ accountId, full, graphVersion: version, generatedAt: Date.now(), model: null })
    .onConflictDoUpdate({
      target: personas.accountId,
      set: { full, graphVersion: version, generatedAt: Date.now() },
    });
  return full;
}

/** Cached one-liner, regenerated only when the account's brain has actually
 *  changed (version-hash check, same debounce pattern as ctx.ts's caches). */
export async function getOneLiner(accountId: string, store: IgStore): Promise<string> {
  const version = graphVersionFor(store);
  const row = await getPersonaRow(accountId);
  if (row && row.graphVersion === version && row.oneLiner) return row.oneLiner;
  return regenerateOneLiner(accountId, store, version);
}

/** Cached full markdown persona — same invalidation as the one-liner. */
export async function getFullPersona(accountId: string, store: IgStore): Promise<string> {
  const version = graphVersionFor(store);
  const row = await getPersonaRow(accountId);
  if (row && row.graphVersion === version && row.full) return row.full;
  return regenerateFullPersona(accountId, store, version);
}

/** Fire-and-forget warm — call after a brain rebuild so both tiers are ready
 *  before something needs them, instead of paying regen latency inline.
 *  Never throws. */
export function warmOneLiner(accountId: string, store: IgStore): void {
  getOneLiner(accountId, store).catch(() => {});
  getFullPersona(accountId, store).catch(() => {});
}
