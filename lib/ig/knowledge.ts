// Knowledge Engine — Mira's memory. Facts learned once are recalled on every
// future comment, on any post. This is the learn loop.

import {
  readStore,
  updateStore,
  makeFact,
  type Fact,
  type FactTopic,
  type Clarification,
} from "./store";
import { embed, cosine, keywordScore } from "./embed";
import { chatJSON } from "./llm";

// nomic-embed-text works best with task prefixes — query vs document.
const embedQuery = (t: string) => embed(`search_query: ${t}`);
const embedDoc = (t: string) => embed(`search_document: ${t}`);

// nomic-embed-text compresses cosine into a narrow band — paraphrases land
// ~0.57–0.73, unrelated ~0.44. Above HIGH = trust outright. In the gray zone
// an LLM verify step confirms the match. Below LOW = miss → ask the owner
// (safe). A false positive would send a wrong reply, so the gray zone is
// gated, never trusted blind.
const EMBED_HIGH = 0.72;
const EMBED_LOW = 0.5;
const KEYWORD_HIGH = 0.7;
const KEYWORD_LOW = 0.4;

export type RecallHit = {
  fact: Fact;
  score: number;
  method: "embed" | "keyword";
};

/** LLM check: does this known fact actually answer the comment? */
async function verifyMatch(comment: string, fact: Fact): Promise<boolean> {
  const j = await chatJSON<{ answers: boolean }>(
    [
      {
        role: "system",
        content:
          "Decide whether a known fact actually answers an Instagram comment. " +
          "Say true only if the fact directly answers what the comment is asking. " +
          'Output JSON only: {"answers": true} or {"answers": false}',
      },
      {
        role: "user",
        content: `Comment: "${comment}"\nKnown question: "${fact.question}"\nKnown answer: "${fact.answer}"\nDoes the known fact answer the comment?`,
      },
    ],
    { answers: false }
  );
  return !!j.answers;
}

/**
 * Find a known fact that answers this comment. Searches account-scope facts
 * (recalled everywhere) plus this post's post-scope facts. Cross-post recall:
 * a fact learned on one post answers a comment on a different post.
 */
export async function recallFact(
  query: string,
  postId?: string
): Promise<RecallHit | null> {
  const text = query.trim();
  if (!text) return null;
  const s = await readStore();
  const now = Date.now();
  const cands = s.knowledge.filter(
    (f) =>
      !(f.expiresAt && f.expiresAt < now) &&
      (f.scope === "account" || (f.scope === "post" && f.postId === postId))
  );
  if (!cands.length) return null;

  // pass 1 — semantic recall
  const qVec = await embedQuery(text);
  if (qVec) {
    let best: RecallHit | null = null;
    for (const f of cands) {
      if (!f.embedding?.length) continue;
      const score = cosine(qVec, f.embedding);
      if (!best || score > best.score) best = { fact: f, score, method: "embed" };
    }
    if (best) {
      if (best.score >= EMBED_HIGH) return best;
      if (best.score >= EMBED_LOW && (await verifyMatch(text, best.fact))) return best;
    }
  }

  // pass 2 — keyword fallback (covers facts with no embedding yet)
  let kbest: RecallHit | null = null;
  for (const f of cands) {
    const doc = [f.question, f.answer, ...f.aliases].join(" ");
    const score = keywordScore(text, doc);
    if (!kbest || score > kbest.score) kbest = { fact: f, score, method: "keyword" };
  }
  if (kbest) {
    if (kbest.score >= KEYWORD_HIGH) return kbest;
    if (kbest.score >= KEYWORD_LOW && (await verifyMatch(text, kbest.fact))) return kbest;
  }
  return null;
}

/** Create a fact, compute its embedding, persist it. */
export async function addFact(
  input: Partial<Fact> & { question: string; answer: string }
): Promise<Fact> {
  const fact = makeFact(input);
  if (!fact.embedding?.length) {
    fact.embedding = (await embedDoc(fact.question)) ?? undefined;
  }
  await updateStore((s) => ({ ...s, knowledge: [fact, ...s.knowledge] }));
  return fact;
}

/** Update a fact. Re-embeds when the question changes. */
export async function updateFact(
  id: string,
  patch: Partial<Fact>
): Promise<Fact | null> {
  let result: Fact | null = null;
  await updateStore(async (s) => {
    const idx = s.knowledge.findIndex((f) => f.id === id);
    if (idx < 0) return s;
    const merged: Fact = {
      ...s.knowledge[idx],
      ...patch,
      id,
      updatedAt: Date.now(),
    };
    if (patch.question && patch.question !== s.knowledge[idx].question) {
      merged.embedding = (await embedDoc(merged.question)) ?? merged.embedding;
    }
    const next = [...s.knowledge];
    next[idx] = merged;
    result = merged;
    return { ...s, knowledge: next };
  });
  return result;
}

/** Remove a fact. */
export async function deleteFact(id: string): Promise<void> {
  await updateStore((s) => ({
    ...s,
    knowledge: s.knowledge.filter((f) => f.id !== id),
  }));
}

/** List all facts, newest first. */
export async function listFacts(): Promise<Fact[]> {
  const s = await readStore();
  return [...s.knowledge].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Record that a fact was reused to answer a comment. */
export async function bumpFactHit(id: string): Promise<void> {
  await updateStore((s) => ({
    ...s,
    knowledge: s.knowledge.map((f) =>
      f.id === id
        ? { ...f, hitCount: f.hitCount + 1, lastUsedAt: Date.now() }
        : f
    ),
  }));
}

/**
 * Turn an answered clarification into a permanent fact. An LLM step labels the
 * topic and decides scope — account-wide (gear, personal, shops) or tied to
 * one post (where/when this exact shot was taken).
 */
export async function promoteClarification(
  clar: Clarification,
  answer: string
): Promise<Fact> {
  const ans = answer.trim();
  const isLink = /^https?:\/\//i.test(ans);
  const cls = await chatJSON<{
    topic: FactTopic;
    scope: "account" | "post";
    label: string;
  }>(
    [
      {
        role: "system",
        content:
          "You label a Q&A that Mira just learned from an Instagram comment. " +
          "topic is one of: gear, location, song, personal, shop, general. " +
          'scope is "account" when the answer holds true no matter which post ' +
          "it is asked on (gear the owner owns, personal facts, shop/store links). " +
          'scope is "post" when it is specific to one post (where or when this ' +
          "exact photo/reel was taken). " +
          "label is a short 1-4 word name for the thing being asked about " +
          '(e.g. "camera bag", "lightroom presets", "the song", "sunglasses"). ' +
          'Output JSON only: {"topic":"...","scope":"...","label":"..."}',
      },
      {
        role: "user",
        content: `Q: ${clar.question}\nTriggering comment: ${clar.commentText}\nA: ${ans}`,
      },
    ],
    {
      topic: "general",
      scope: clar.kind === "link" ? "post" : "account",
      label: "",
    }
  );
  const linkLabel = (cls.label || "").trim() || "link";

  // topic drives scope — gear/personal/shop hold true on every post, so they
  // are account-wide; location/song are post-specific. only "general" defers
  // to the model's scope guess.
  const scope: "account" | "post" =
    cls.topic === "gear" || cls.topic === "personal" || cls.topic === "shop"
      ? "account"
      : cls.topic === "location" || cls.topic === "song"
      ? "post"
      : cls.scope;

  return addFact({
    question: clar.question,
    answer: ans,
    topic: cls.topic,
    scope,
    postId: scope === "post" ? clar.postId : undefined,
    aliases: clar.commentText ? [clar.commentText] : [],
    link: isLink ? { url: ans, label: linkLabel } : undefined,
    sourceCommentId: clar.id,
  });
}

/**
 * Compute embeddings for any facts missing them (e.g. facts migrated from the
 * old per-post Q&A). Embeds outside the write lock, then applies in one write.
 */
export async function backfillEmbeddings(): Promise<number> {
  const s = await readStore();
  const missing = s.knowledge.filter((f) => !f.embedding?.length);
  if (!missing.length) return 0;
  const vecs = new Map<string, number[]>();
  for (const f of missing) {
    const v = await embedDoc(f.question);
    if (v) vecs.set(f.id, v);
  }
  if (!vecs.size) return 0;
  await updateStore((st) => ({
    ...st,
    knowledge: st.knowledge.map((f) =>
      vecs.has(f.id) ? { ...f, embedding: vecs.get(f.id) } : f
    ),
  }));
  return vecs.size;
}
