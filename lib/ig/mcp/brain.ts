// Mira Brain MCP — in-process tool server. Read-only view over the store.
// Writes still go through store.ts (atomic, serialized).
//
// Pipeline planner calls these via client.ts. Same tool names + schema as
// brain-schema.ts so the contract is stable for an external stdio adapter
// later.

import {
  readStore,
  type Commenter,
  type Fact,
  type Post,
  type Settings,
  type TrainingExample,
} from "../store";
import { embed } from "../embed";
import { Lru } from "./brain-cache";
import * as embeds from "./brain-embeds";
import { isOpen as breakerOpen, record as recordMetric } from "./brain-metrics";

// ── caches ───────────────────────────────────────────────────────────────
const cAccount = new Lru<"k", AccountInfo>(1, 60_000);
const cPost = new Lru<string, Post | null>(500, 30_000);
const cCommenter = new Lru<string, CommenterProfile | null>(5000, 30_000);
const cTheme = new Lru<string, string | null>(5000, 300_000);

let indexBuiltAt = 0;
let indexBuildPromise: Promise<void> | null = null;

async function ensureIndex(): Promise<void> {
  if (indexBuildPromise) return indexBuildPromise;
  if (Date.now() - indexBuiltAt < 120_000 && embeds.size() > 0) return;
  indexBuildPromise = (async () => {
    const s = await readStore();
    embeds.build(s.knowledge);
    indexBuiltAt = Date.now();
  })().finally(() => {
    indexBuildPromise = null;
  });
  return indexBuildPromise;
}

export function invalidateAll(): void {
  cAccount.clear();
  cPost.clear();
  cCommenter.clear();
  cTheme.clear();
  indexBuiltAt = 0;
}

// ── result types ─────────────────────────────────────────────────────────
export type AccountInfo = {
  username: string;
  igUserId: string;
  bio: string;
  voice: string;
  defaultLanguage: "english" | "hinglish";
  replyMode: Settings["replyMode"];
  styleSampleCount: number;
};

export type PostBrief = {
  id: string;
  caption: string;
  mediaType: string;
  permalink?: string;
  thumbnailUrl?: string;
  timestamp: string;
  notes: string;
  qa: { q: string; a: string; ts: number }[];
  links: { label: string; url: string; type: string }[];
  insights?: Post["insights"];
};

export type KbHit = {
  factId: string;
  question: string;
  answer: string;
  topic: string;
  scope: "account" | "post";
  postId?: string;
  link?: { url: string; label: string };
  score: number;
};

export type CommenterProfile = {
  igUserId: string;
  username: string;
  firstSeenAt: number;
  lastSeenAt: number;
  commentCount: number;
  repliedCount: number;
  themes: string[];
  relationship: "new" | "regular" | "superfan";
  lastReplyText?: string;
  lastReplyAt?: number;
};

// ── tools ────────────────────────────────────────────────────────────────

export async function accountInfo(): Promise<AccountInfo | null> {
  const hit = cAccount.get("k");
  if (hit) return hit;
  const s = await readStore();
  if (!s.account) return null;
  const out: AccountInfo = {
    username: s.account.username,
    igUserId: s.account.igUserId,
    bio: s.ownerProfile.bio,
    voice: s.ownerProfile.voice,
    defaultLanguage: s.ownerProfile.defaultLanguage,
    replyMode: s.settings.replyMode,
    styleSampleCount: s.styleSamples.length,
  };
  cAccount.set("k", out);
  return out;
}

export async function postGet(id: string): Promise<PostBrief | null> {
  if (!id) return null;
  const hit = cPost.get(id);
  if (hit !== undefined) return shrinkPost(hit);
  const s = await readStore();
  const p = s.posts[id] ?? null;
  cPost.set(id, p);
  return shrinkPost(p);
}

function shrinkPost(p: Post | null): PostBrief | null {
  if (!p) return null;
  return {
    id: p.id,
    caption: p.caption,
    mediaType: p.mediaType,
    permalink: p.permalink,
    thumbnailUrl: p.thumbnailUrl,
    timestamp: p.timestamp,
    notes: p.notes,
    qa: p.qa,
    links: p.links.map((l) => ({ label: l.label, url: l.url, type: l.type })),
    insights: p.insights,
  };
}

export async function kbSearch(
  query: string,
  k = 8,
  scope: "account" | "post" | "any" = "any",
  postId?: string
): Promise<KbHit[]> {
  if (!query.trim()) return [];
  await ensureIndex();
  const q = await embed(query);
  const s = await readStore();
  const factMap = new Map(s.knowledge.map((f) => [f.id, f]));

  let hits: { fact: Fact; score: number }[] = [];

  if (q && embeds.size() > 0) {
    const top = embeds.topK(q, Math.max(k * 2, 16));
    for (const t of top) {
      const f = factMap.get(t.id);
      if (!f) continue;
      hits.push({ fact: f, score: t.score });
    }
  } else {
    // fallback: keyword over question + aliases
    const ql = query.toLowerCase();
    for (const f of s.knowledge) {
      const hay = [f.question, ...(f.aliases || [])]
        .join(" ")
        .toLowerCase();
      if (hay.includes(ql))
        hits.push({ fact: f, score: 0.5 + Math.random() * 0.0001 });
    }
  }

  if (scope === "account") hits = hits.filter((h) => h.fact.scope === "account");
  if (scope === "post")
    hits = hits.filter((h) => h.fact.scope === "post" && h.fact.postId === postId);

  return hits
    .slice(0, k)
    .map((h) => ({
      factId: h.fact.id,
      question: h.fact.question,
      answer: h.fact.answer,
      topic: h.fact.topic,
      scope: h.fact.scope,
      postId: h.fact.postId,
      link: h.fact.link,
      score: h.score,
    }));
}

export async function commenterProfile(
  igUserId: string
): Promise<CommenterProfile | null> {
  if (!igUserId) return null;
  const hit = cCommenter.get(igUserId);
  if (hit !== undefined) return hit;

  const s = await readStore();
  const c: Commenter | undefined = s.commenters[igUserId];
  if (!c) {
    cCommenter.set(igUserId, null);
    return null;
  }
  const lastReply = s.history.find(
    (h) => h.toUserId === igUserId && h.status === "sent"
  );
  const out: CommenterProfile = {
    igUserId: c.igUserId,
    username: c.username,
    firstSeenAt: c.firstSeenAt,
    lastSeenAt: c.lastSeenAt,
    commentCount: c.commentCount,
    repliedCount: c.repliedCount,
    themes: c.themes,
    relationship: classifyRelationship(c),
    lastReplyText: lastReply?.outbound,
    lastReplyAt: lastReply?.sentAt,
  };
  cCommenter.set(igUserId, out);
  return out;
}

function classifyRelationship(
  c: Commenter
): "new" | "regular" | "superfan" {
  if (c.commentCount >= 10) return "superfan";
  if (c.commentCount >= 3) return "regular";
  return "new";
}

// ── post.recent ──────────────────────────────────────────────────────────
const cRecent = new Lru<number, PostBrief[]>(4, 60_000);

export async function postRecent(n = 10): Promise<PostBrief[]> {
  const hit = cRecent.get(n);
  if (hit) return hit;
  const s = await readStore();
  const list = Object.values(s.posts)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, n)
    .map((p) => shrinkPost(p))
    .filter((x): x is PostBrief => !!x);
  cRecent.set(n, list);
  return list;
}

// ── thread.context — every prior reply Mira sent on this comment ─────────
export type ThreadContext = {
  commentId: string;
  postId?: string;
  ownReplies: { text: string; ts: number }[];
  parentComment?: { text: string; fromUserId: string; ts: number };
};

export async function threadContext(
  commentId: string
): Promise<ThreadContext | null> {
  if (!commentId) return null;
  const s = await readStore();
  const own = s.history
    .filter(
      (h) =>
        (h.commentId === commentId || h.commentId === commentId) &&
        h.status === "sent"
    )
    .map((h) => ({ text: h.outbound, ts: h.sentAt }));
  const cached = s.commentsCache.find((c) => c.id === commentId);
  return {
    commentId,
    postId: cached?.postId,
    ownReplies: own,
    parentComment: cached
      ? { text: cached.text, fromUserId: cached.fromUserId, ts: cached.ts }
      : undefined,
  };
}

// ── training.similar — owner corrections nearest this text ───────────────
let trainEmb: Float32Array | null = null;
let trainIds: string[] = [];
let trainBuiltAt = 0;
let trainDim = 0;

async function buildTrainIndex(): Promise<void> {
  if (Date.now() - trainBuiltAt < 120_000 && trainEmb) return;
  const s = await readStore();
  const usable = (s.training || []).filter(
    (t) => t.embedding && t.embedding.length > 0
  );
  if (!usable.length) {
    trainEmb = null;
    trainIds = [];
    trainDim = 0;
    return;
  }
  trainDim = usable[0].embedding!.length;
  trainEmb = new Float32Array(usable.length * trainDim);
  trainIds = [];
  for (let i = 0; i < usable.length; i++) {
    const e = usable[i].embedding!;
    if (e.length !== trainDim) continue;
    // normalize at index time
    let n = 0;
    for (let j = 0; j < trainDim; j++) n += e[j] * e[j];
    n = Math.sqrt(n) || 1;
    for (let j = 0; j < trainDim; j++)
      trainEmb[i * trainDim + j] = e[j] / n;
    trainIds.push(usable[i].id);
  }
  trainBuiltAt = Date.now();
}

export type TrainingHit = {
  id: string;
  comment: string;
  verdict: "good" | "bad";
  correctAction?: "reply" | "ask_owner" | "skip";
  idealReply?: string;
  askQuestion?: string;
  note?: string;
  score: number;
};

export async function trainingSimilar(
  text: string,
  k = 3
): Promise<TrainingHit[]> {
  if (!text.trim()) return [];
  await buildTrainIndex();
  if (!trainEmb || !trainIds.length) return [];
  const q = await embed(text);
  if (!q || q.length !== trainDim) return [];
  let qn = 0;
  for (let i = 0; i < trainDim; i++) qn += q[i] * q[i];
  qn = Math.sqrt(qn) || 1;

  const out: { id: string; score: number }[] = [];
  let worst = -Infinity;
  for (let i = 0; i < trainIds.length; i++) {
    let dot = 0;
    const off = i * trainDim;
    for (let j = 0; j < trainDim; j++) dot += trainEmb[off + j] * q[j];
    const score = dot / qn;
    if (out.length < k) {
      out.push({ id: trainIds[i], score });
      if (out.length === k) {
        out.sort((a, b) => a.score - b.score);
        worst = out[0].score;
      }
    } else if (score > worst) {
      out[0] = { id: trainIds[i], score };
      out.sort((a, b) => a.score - b.score);
      worst = out[0].score;
    }
  }
  out.sort((a, b) => b.score - a.score);

  const s = await readStore();
  const byId = new Map<string, TrainingExample>(
    (s.training || []).map((t) => [t.id, t])
  );
  return out
    .map((o) => {
      const t = byId.get(o.id);
      if (!t) return null;
      return {
        id: t.id,
        comment: t.comment,
        verdict: t.verdict,
        correctAction: t.correctAction,
        idealReply: t.idealReply,
        askQuestion: t.askQuestion,
        note: t.note,
        score: o.score,
      } as TrainingHit;
    })
    .filter((x): x is TrainingHit => !!x);
}

// ── multi-fetch ──────────────────────────────────────────────────────────
export type ToolCall = { tool: string; args?: Record<string, unknown> };

export async function brainBundle(
  needs: ToolCall[]
): Promise<Record<string, unknown>[]> {
  return Promise.all(needs.map((n) => dispatch(n)));
}

export async function dispatch(call: ToolCall): Promise<Record<string, unknown>> {
  const a = call.args || {};
  const start = performance.now();
  let ok = true;
  let result: unknown = null;
  let error: string | undefined;

  if (breakerOpen(call.tool)) {
    return { tool: call.tool, ok: false, error: "breaker_open" };
  }

  try {
    switch (call.tool) {
      case "account.info":
        result = await accountInfo();
        break;
      case "post.get":
        result = await postGet(String(a.id || ""));
        break;
      case "post.recent":
        result = await postRecent(Number(a.n ?? 10));
        break;
      case "kb.search":
        result = await kbSearch(
          String(a.query || ""),
          Number(a.k ?? 8),
          (a.scope as "account" | "post" | "any") ?? "any",
          a.postId ? String(a.postId) : undefined
        );
        break;
      case "commenter.profile":
        result = await commenterProfile(String(a.igUserId || ""));
        break;
      case "thread.context":
        result = await threadContext(String(a.commentId || ""));
        break;
      case "training.similar":
        result = await trainingSimilar(
          String(a.text || ""),
          Number(a.k ?? 3)
        );
        break;
      case "brain.bundle":
        result = await brainBundle((a.needs as ToolCall[]) || []);
        break;
      default:
        ok = false;
        error = "unknown tool";
    }
  } catch (e) {
    ok = false;
    error = e instanceof Error ? e.message : "tool error";
  }

  recordMetric(call.tool, performance.now() - start, ok);
  return ok
    ? { tool: call.tool, ok: true, result }
    : { tool: call.tool, ok: false, error };
}

// ── boot ─────────────────────────────────────────────────────────────────
// Warm the embedding index + account cache on first import so the first
// real comment doesn't pay the build cost.
let warmed = false;
export async function warm(): Promise<void> {
  if (warmed) return;
  warmed = true;
  await Promise.all([accountInfo(), ensureIndex()]).catch(() => {});
}
