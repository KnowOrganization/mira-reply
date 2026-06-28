// analytics-service.ts — pure business logic, no HTTP concerns.
// All functions return plain data or throw; they never touch `set` or `status`.
import { readStore, updateStoreFor, type FactTopic } from "@/lib/ig/store";
import { addFact, deleteFact } from "@/lib/ig/knowledge";
import { chatJSON } from "@/lib/ig/llm";
import { isConfigured } from "@/lib/ig/config";
import { getRecentLogs } from "@/lib/ig/db";
import { brain } from "@/lib/ig/mcp/client";

// ---------------------------------------------------------------------------
// Shared constants / helpers (single instance, imported by all handlers)
// ---------------------------------------------------------------------------

export const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

export const TOPICS: FactTopic[] = ["personal", "gear", "location", "song", "shop", "general"];
export const asTopic = (t: unknown): FactTopic =>
  TOPICS.includes(t as FactTopic) ? (t as FactTopic) : "general";

/** Anything newer than this date is in-app test data (live IG API blocked). */
export const CUTOFF = Date.parse("2026-05-15T00:00:00Z");

export const isTestUser = (id: string) =>
  id.startsWith("dev_") || id.startsWith("u_") || id.startsWith("fake_");

export function shape(v: unknown): unknown {
  if (Array.isArray(v)) return { array: true, len: v.length, first: v[0] };
  if (v && typeof v === "object") return Object.keys(v as object).slice(0, 10);
  return v;
}

// ---------------------------------------------------------------------------
// getDashboard
// ---------------------------------------------------------------------------

export async function getDashboard(accountId: string) {
  const s = await readStore(accountId);
  const now = Date.now();
  const todayKey = dayKey(now);

  // 14-day timeline — comments seen vs replies sent
  const days: { date: string; comments: number; replies: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const key = dayKey(now - i * 86400_000);
    days.push({
      date: key,
      comments: s.commentsCache.filter((c) => !c.isOwn && dayKey(c.ts) === key).length,
      replies: s.history.filter((h) => h.status === "sent" && dayKey(h.sentAt) === key).length,
    });
  }

  // intent breakdown from reply history
  const intents: Record<string, number> = {};
  for (const h of s.history) intents[h.intent] = (intents[h.intent] || 0) + 1;

  // busiest hours
  const hourly = new Array(24).fill(0) as number[];
  for (const c of s.commentsCache) if (!c.isOwn) hourly[new Date(c.ts).getHours()]++;

  // recurring comment themes
  const themes: Record<string, number> = {};
  for (const c of s.commentsCache) {
    if (c.isOwn) continue;
    const t = (c.text || "").toLowerCase();
    if (/where|location|kahan/.test(t)) themes.location = (themes.location || 0) + 1;
    else if (/song|music|gana/.test(t)) themes.song = (themes.song || 0) + 1;
    else if (/jacket|bike|gear|lens|camera|bag|shoes/.test(t)) themes.gear = (themes.gear || 0) + 1;
    else if (/link|price|buy|shop|cost/.test(t)) themes.shop = (themes.shop || 0) + 1;
  }

  // knowledge
  const facts = s.knowledge;
  const reused = facts.reduce((n, f) => n + f.hitCount, 0);
  const topFact = [...facts].sort((a2, b) => b.hitCount - a2.hitCount)[0];
  const clarsResolved = s.clarifications.filter((c) => c.status === "answered").length;
  const clarsOpen = s.clarifications.filter((c) => c.status === "open").length;

  // reply coverage
  const inbound = s.commentsCache.filter((c) => !c.isOwn).length;
  const replied = s.history.filter((h) => h.status === "sent" && h.kind === "comment").length;
  const coverage = inbound ? Math.min(100, Math.round((replied / inbound) * 100)) : 0;

  // people
  const superfans = Object.values(s.commenters)
    .sort((a2, b) => b.commentCount - a2.commentCount)
    .slice(0, 6)
    .map((c) => ({
      username: c.username,
      igUserId: c.igUserId,
      commentCount: c.commentCount,
      repliedCount: c.repliedCount,
    }));
  const topPosts = Object.values(s.posts)
    .map((p) => ({
      id: p.id,
      caption: p.caption,
      thumb: p.thumbnailUrl,
      permalink: p.permalink,
      comments: s.commentsCache.filter((c) => c.postId === p.id && !c.isOwn).length,
      interactions: p.insights?.totalInteractions ?? p.insights?.likes ?? 0,
    }))
    .sort((a2, b) => b.interactions - a2.interactions || b.comments - a2.comments)
    .slice(0, 5);

  return {
    configured: isConfigured(),
    connected: !!s.account,
    account: s.account
      ? { username: s.account.username, connectedAt: s.account.connectedAt }
      : null,
    replyMode: s.settings.replyMode,
    today: s.dailyStats[todayKey] ?? null,
    pending: s.pendingDrafts.length,
    clarsOpen,
    clarsResolved,
    coverage,
    totalComments: inbound,
    totalReplies: replied,
    days,
    intents,
    hourly,
    themes,
    knowledge: {
      total: facts.length,
      reused,
      top: topFact ? { q: topFact.question, hits: topFact.hitCount } : null,
    },
    antiBan: {
      sentToday: s.dailyStats[todayKey]?.sent ?? 0,
      cap: s.settings.dailySendCap,
      uniquenessThreshold: s.settings.uniquenessThreshold,
    },
    superfans,
    topPosts,
  };
}

// ---------------------------------------------------------------------------
// getFeed
// ---------------------------------------------------------------------------

export async function getFeed(accountId: string) {
  const store = await readStore(accountId);
  return { events: store.feedEvents || [] };
}

// ---------------------------------------------------------------------------
// getLogs
// ---------------------------------------------------------------------------

export async function getLogs(accountId: string, limit: number) {
  const logs = await getRecentLogs(accountId, limit);
  return { logs };
}

// ---------------------------------------------------------------------------
// getDigest
// ---------------------------------------------------------------------------

export async function getDigest(accountId: string) {
  const s = await readStore(accountId);
  const cutoff = Date.now() - 86400_000;
  const today = s.commentsCache.filter((c) => c.ts >= cutoff && !c.isOwn);
  const replied = s.history.filter((h) => h.sentAt >= cutoff && h.status === "sent");
  const pending = s.pendingDrafts.length;
  const open = s.clarifications.filter((c) => c.status === "open").length;

  const themes: Record<string, number> = {};
  for (const c of today) {
    const t = (c.text || "").toLowerCase();
    if (/where|location|kahan/.test(t)) themes.location = (themes.location || 0) + 1;
    else if (/song|music|gana/.test(t)) themes.song = (themes.song || 0) + 1;
    else if (/bike|gear|lens|camera/.test(t)) themes.gear = (themes.gear || 0) + 1;
    else if (/price|buy|shop/.test(t)) themes.shop = (themes.shop || 0) + 1;
  }
  const topTheme = Object.entries(themes).sort((a2, b) => b[1] - a2[1])[0];

  return {
    inbox: today.length,
    repliedAuto: replied.length,
    pending,
    needsInput: open,
    topTheme: topTheme ? { name: topTheme[0], count: topTheme[1] } : null,
  };
}

// ---------------------------------------------------------------------------
// getBrain
// ---------------------------------------------------------------------------

export async function getBrain(accountId: string) {
  const s = await readStore(accountId);
  const now = Date.now();
  const facts = s.knowledge.filter(
    (f) => f.scope === "account" && !(f.expiresAt && f.expiresAt < now)
  );
  const byTopic: Record<string, number> = {};
  for (const t of TOPICS) byTopic[t] = 0;
  for (const f of facts) byTopic[f.topic] = (byTopic[f.topic] || 0) + 1;
  const gaps = TOPICS.filter((t) => byTopic[t] === 0);
  return {
    facts,
    byTopic,
    gaps,
    total: facts.length,
    account: s.account ? { username: s.account.username } : null,
  };
}

// ---------------------------------------------------------------------------
// postBrain
// ---------------------------------------------------------------------------

export type BrainBody = {
  action?: "add" | "extract" | "delete";
  question?: string;
  answer?: string;
  topic?: string;
  text?: string;
  topicHint?: string;
  id?: string;
};

/** Returns the response payload or throws an object { status, error } for HTTP errors. */
export async function postBrain(b: BrainBody): Promise<unknown> {
  if (b.action === "delete") {
    if (!b.id) throw { status: 400, error: "id required" };
    await deleteFact(b.id);
    return { ok: true };
  }

  if (b.action === "add") {
    const question = (b.question || "").trim();
    const answer = (b.answer || "").trim();
    if (!question || !answer) throw { status: 400, error: "question + answer required" };
    const isLink = /^https?:\/\//i.test(answer);
    const fact = await addFact({
      question,
      answer,
      topic: asTopic(b.topic),
      scope: "account",
      link: isLink ? { url: answer, label: question } : undefined,
    });
    return { ok: true, created: [fact] };
  }

  if (b.action === "extract") {
    const text = (b.text || "").trim();
    if (!text) return { ok: true, created: [] };
    const hint = b.topicHint
      ? `These facts are mostly about the owner's ${b.topicHint}. `
      : "";
    const out = await chatJSON<{
      facts: { question: string; answer: string; topic: string }[];
    }>(
      [
        {
          role: "system",
          content:
            "You turn what an Instagram creator says about themselves and their account into reusable facts. " +
            hint +
            "Extract every distinct fact. Each fact: a natural question a follower might ask, the answer, and a topic " +
            "(gear, location, song, personal, shop, general). Keep answers concise and factual. " +
            'Output JSON only: {"facts":[{"question":"...","answer":"...","topic":"..."}]}',
        },
        { role: "user", content: text },
      ],
      { facts: [] }
    );
    const created = [];
    for (const f of out.facts || []) {
      const question = (f.question || "").trim();
      const answer = (f.answer || "").trim();
      if (!question || !answer) continue;
      const isLink = /^https?:\/\//i.test(answer);
      created.push(
        await addFact({
          question,
          answer,
          topic: asTopic(f.topic),
          scope: "account",
          link: isLink ? { url: answer, label: question } : undefined,
        })
      );
    }
    return { ok: true, created };
  }

  throw { status: 400, error: "bad action" };
}

// ---------------------------------------------------------------------------
// getBrainStats
// ---------------------------------------------------------------------------

export async function getBrainStats() {
  return {
    stats: brain.stats(),
    tools: brain.tools().map((t) => ({ name: t.name, description: t.description })),
  };
}

// ---------------------------------------------------------------------------
// getBrainProbe
// ---------------------------------------------------------------------------

export async function getBrainProbe() {
  const t = (label: string, fn: () => Promise<unknown>) =>
    fn().then(async () => {
      const start = performance.now();
      const out = await fn();
      const ms = +(performance.now() - start).toFixed(2);
      return { tool: label, ms, sample: shape(out) };
    });

  await brain.warm();

  const [acct, kb, bundle] = await Promise.all([
    t("account.info", () => brain.accountInfo()),
    t("kb.search(jacket)", () => brain.kbSearch("jacket brand", 5)),
    t("brain.bundle", () =>
      brain.bundle([
        { tool: "account.info" },
        { tool: "kb.search", args: { query: "where", k: 3 } },
      ])
    ),
  ]);

  return { results: [acct, kb, bundle], stats: brain.stats() };
}

// ---------------------------------------------------------------------------
// postCleanup
// ---------------------------------------------------------------------------

export async function postCleanup(accountId: string) {
  let removed = {
    comments: 0,
    drafts: 0,
    clarifications: 0,
    facts: 0,
    commenters: 0,
    history: 0,
  };

  await updateStoreFor(accountId, (s) => {
    const commentsCache = s.commentsCache.filter((c) => !c.id.startsWith("fake_"));
    const pendingDrafts = s.pendingDrafts.filter((d) => !d.threadOrMediaId.startsWith("fake_"));
    const clarifications = s.clarifications.filter(
      (c) => !(c.commentId || "").startsWith("fake_") && c.createdAt < CUTOFF
    );
    const knowledge = s.knowledge.filter((f) => f.createdAt < CUTOFF);
    const commenters = Object.fromEntries(
      Object.entries(s.commenters).filter(([k]) => !isTestUser(k))
    );
    const history = s.history.filter((h) => h.sentAt < CUTOFF);

    removed = {
      comments: s.commentsCache.length - commentsCache.length,
      drafts: s.pendingDrafts.length - pendingDrafts.length,
      clarifications: s.clarifications.length - clarifications.length,
      facts: s.knowledge.length - knowledge.length,
      commenters: Object.keys(s.commenters).length - Object.keys(commenters).length,
      history: s.history.length - history.length,
    };

    return {
      ...s,
      commentsCache,
      pendingDrafts,
      clarifications,
      knowledge,
      commenters,
      history,
      fingerprints: [],
      sendQueue: [],
      dailyStats: {},
    };
  });

  return { ok: true, removed };
}
