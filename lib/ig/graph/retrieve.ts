// Unified ranked retrieval — the fix for the core documented bug: persona
// context injected into every reply was `.slice(0,12)` in raw insertion
// order, no ranking, no relevance to the actual inbound message. This
// replaces that (and dmPipeline.ts's separately-diverging personaBlock) with
// one relevance-scored, floor-filtered, token-budgeted retrieval.
//
// Tiers (one-liner/brief/full) are NOT three separately-authored texts — see
// the brain-v2 plan's resolution — they're token-budget configs over this
// SAME scoring function. A static "full" blob recreates the exact unscoped-
// context bug (see lib/ig/rulebook.ts's bike-example incident) this fixes.
import type { Fact } from "../store";
import { embed, cosine, keywordScore } from "../embed";

const embedQuery = (t: string) => embed(`search_query: ${t}`);

// Token budgets per tier. "brief" is the default for comment replies/DMs
// (replaces personaContext/personaBlock); "oneLiner" for cold-open/high-
// volume paths with no inbound text to rank against; "full" for the agentic
// planner / owner-facing brain view — still ranked, never an unbounded dump.
export const BUDGET = { oneLiner: 40, brief: 220, full: 800 } as const;

const RECENCY_HALF_LIFE_MS = 90 * 24 * 3600_000; // 90 days
const DEFAULT_FLOOR = 0.15;

function recencyDecay(ts: number): number {
  const age = Date.now() - ts;
  if (age <= 0) return 1;
  return Math.pow(0.5, age / RECENCY_HALF_LIFE_MS);
}

// Crude token estimate for budget cutoffs — not billing-accurate, doesn't need to be.
const estTokens = (s: string) => Math.ceil(s.length / 4);

// nomic-embed-text compresses cosine into a narrow band — paraphrases land
// ~0.57-0.73, unrelated ~0.44 (see knowledge.ts's EMBED_HIGH=0.72, the same
// model's calibrated "trust this is a real match" threshold). 0.9 would
// almost never fire for this model; reuse the established value instead.
const DEDUPE_THRESHOLD = 0.72;

// keywordScore fallback threshold, calibrated same as recallFact's keyword
// gray-zone band — question+answer text overlap this high is the same fact
// reworded, not a coincidence.
const DEDUPE_KEYWORD_THRESHOLD = 0.7;

/** Collapse near-identical facts (same question asked/extracted multiple
 *  times, often from separate posts about the same topic) before they
 *  compete for ranking/budget slots — keeps whichever copy has the higher
 *  hitCount. Falls back to keyword overlap when either fact lacks an
 *  embedding (embed() degrades to null if the provider's unreachable — same
 *  contract as retrievePersonaContext's scoring above). This is why a
 *  thin-content account was showing the same "what's the account about"
 *  fact 3x with slightly different wording: those facts had no embedding to
 *  compare, and there was no fallback path at all before this. */
export function dedupeFacts(facts: Fact[]): Fact[] {
  const kept: Fact[] = [];
  for (const f of facts) {
    const fText = `${f.question} ${f.answer}`;
    let dupIdx = -1;
    for (let i = 0; i < kept.length; i++) {
      const k = kept[i];
      const similar =
        f.embedding?.length && k.embedding?.length
          ? cosine(f.embedding, k.embedding) >= DEDUPE_THRESHOLD
          : keywordScore(fText, `${k.question} ${k.answer}`) >= DEDUPE_KEYWORD_THRESHOLD;
      if (similar) { dupIdx = i; break; }
    }
    if (dupIdx === -1) kept.push(f);
    else if (f.hitCount > kept[dupIdx].hitCount) kept[dupIdx] = f;
  }
  return kept;
}

export type RetrieveOpts = {
  queryText: string; // the inbound comment/DM text; empty string = no query (cold-open)
  facts: Fact[]; // candidate set, already scope/topic-filtered by the caller
  postId?: string; // current post, if any — post-scoped facts matching it get a boost
  maxTokens: number;
  floor?: number; // minimum score to include; a low-signal query should yield few/no facts, not a padded fixed count
};

export type RetrieveResult = { block: string; used: Fact[] };

/** Score, floor-filter, budget, and render facts as an LLM-prompt-ready block. */
export async function retrievePersonaContext(opts: RetrieveOpts): Promise<RetrieveResult> {
  const { queryText, postId, maxTokens, floor = DEFAULT_FLOOR } = opts;
  const facts = dedupeFacts(opts.facts);
  if (!facts.length) return { block: "", used: [] };

  const hasQuery = !!queryText.trim();
  // embed() degrades to null if the embedding provider is unreachable — same
  // "degrade, never break" contract recallFact/training.ts already rely on.
  // Fall back to keyword overlap so ranking stays query-aware either way,
  // rather than silently collapsing to a query-agnostic quality/recency sort.
  const queryEmbedding = hasQuery ? await embedQuery(queryText) : null;
  const maxHit = Math.max(1, ...facts.map((f) => f.hitCount));

  const scored = facts.map((f) => {
    const semantic = queryEmbedding && f.embedding?.length
      ? Math.max(0, cosine(queryEmbedding, f.embedding))
      : hasQuery
      ? keywordScore(queryText, `${f.question} ${f.answer}`)
      : 0;
    const hit = Math.log1p(f.hitCount) / Math.log1p(maxHit);
    const rec = recencyDecay(f.lastUsedAt ?? f.updatedAt);
    const postBonus = postId && f.postId === postId ? 1 : 0;
    // No query text at all (cold-open) — nothing to rank against, fall back
    // to quality/recency signals only; semantic term drops out entirely.
    const score = hasQuery
      ? 0.55 * semantic + 0.15 * hit + 0.15 * f.confidence + 0.1 * rec + 0.05 * postBonus
      : 0.4 * hit + 0.3 * f.confidence + 0.2 * rec + 0.1 * postBonus;
    return { fact: f, score };
  });
  scored.sort((a, b) => b.score - a.score);

  const used: Fact[] = [];
  let tokens = 0;
  for (const { fact, score } of scored) {
    if (score < floor) break;
    const line = `- ${fact.question} — ${fact.answer}`;
    const lineTokens = estTokens(line);
    if (tokens + lineTokens > maxTokens) break;
    used.push(fact);
    tokens += lineTokens;
  }

  return { block: used.map((f) => `- ${f.question} — ${f.answer}`).join("\n"), used };
}
