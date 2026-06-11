// One-time, idempotent import of the legacy stores into Postgres (local in dev,
// Supabase in prod). Reads the JSON file store (~/.mira/ig.json) and the SQLite
// funnel (data/shaiz.db), writes every Drizzle table via upsert. Re-runnable.
//
// Run: DATABASE_URL=... bun run scripts/import.ts
import path from "node:path";
import { Database } from "bun:sqlite";
import { db } from "../src/client";
import * as t from "../src/schema";
import { readStore } from "@/lib/ig/store";

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function main() {
  const store = await readStore();
  if (!store.account) {
    console.error("[import] no account in file store — nothing to import");
    process.exit(1);
  }
  const acct = store.account.igUserId;
  const now = Date.now();
  console.log(`[import] account ${store.account.username} (${acct})`);

  // ── accounts (folds account-level singletons) ──────────────────────────────
  await db.insert(t.accounts).values({
    igUserId: acct,
    username: store.account.username ?? "",
    accessToken: store.account.accessToken,
    tokenExpiresAt: store.account.tokenExpiresAt ?? 0,
    connectedAt: store.account.connectedAt ?? now,
    lastToken: store.lastToken ?? null,
    settings: store.settings,
    ownerProfile: store.ownerProfile ?? null,
    styleSamples: store.styleSamples ?? [],
    toneSummary: store.toneSummary ?? "",
    blocklist: store.blocklist ?? [],
    trustedContacts: store.trustedContacts ?? [],
    fingerprints: store.fingerprints ?? [],
    followerCache: store.followerCache ?? [],
    sendQueue: store.sendQueue ?? [],
    pollWatermark: store.pollWatermark ?? 0,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: t.accounts.igUserId,
    set: {
      username: store.account.username ?? "",
      accessToken: store.account.accessToken,
      tokenExpiresAt: store.account.tokenExpiresAt ?? 0,
      settings: store.settings,
      ownerProfile: store.ownerProfile ?? null,
      updatedAt: now,
    },
  });

  // ── helper: chunked upsert keyed on a PK column ────────────────────────────
  async function load<R extends Record<string, unknown>>(
    name: string, table: any, target: any, rows: R[]
  ) {
    if (!rows.length) { console.log(`[import] ${name}: 0`); return; }
    for (const part of chunk(rows, 400)) {
      await db.insert(table).values(part).onConflictDoNothing({ target });
    }
    console.log(`[import] ${name}: ${rows.length}`);
  }

  // ── automations ────────────────────────────────────────────────────────────
  await load("automations", t.automations, t.automations.id,
    (store.automations ?? []).map((a) => ({
      id: a.id, accountId: acct, name: a.name, enabled: a.enabled,
      trigger: a.trigger, nodes: a.nodes, edges: a.edges, stats: a.stats,
      createdAt: a.createdAt ?? now, updatedAt: a.updatedAt ?? now,
    })));

  // ── posts ──────────────────────────────────────────────────────────────────
  await load("posts", t.posts, t.posts.id,
    Object.values(store.posts ?? {}).map((p) => ({
      id: p.id, accountId: acct, caption: p.caption ?? "", mediaType: p.mediaType ?? "",
      permalink: p.permalink ?? null, thumbnailUrl: p.thumbnailUrl ?? null,
      timestamp: p.timestamp ?? "", notes: p.notes ?? "", qa: p.qa ?? [],
      links: p.links ?? [], insights: p.insights ?? null, updatedAt: p.updatedAt ?? now,
    })));

  // ── knowledge ───────────────────────────────────────────────────────────────
  await load("knowledge", t.knowledge, t.knowledge.id,
    (store.knowledge ?? []).map((f) => ({
      id: f.id, accountId: acct, question: f.question, answer: f.answer,
      topic: f.topic, scope: f.scope, postId: f.postId ?? null, aliases: f.aliases ?? [],
      embedding: f.embedding ?? null, link: f.link ?? null, hitCount: f.hitCount ?? 0,
      confidence: f.confidence ?? 1, durable: f.durable ?? true, expiresAt: f.expiresAt ?? null,
      sourceCommentId: f.sourceCommentId ?? null, createdAt: f.createdAt ?? now,
      updatedAt: f.updatedAt ?? now, lastUsedAt: f.lastUsedAt ?? null,
    })));

  // ── drafts ───────────────────────────────────────────────────────────────────
  await load("drafts", t.drafts, t.drafts.id,
    (store.pendingDrafts ?? []).map((d) => ({
      id: d.id, accountId: acct, kind: d.kind, threadOrMediaId: d.threadOrMediaId,
      fromUserId: d.fromUserId, fromUsername: d.fromUsername ?? null, inboundText: d.inboundText ?? "",
      draftText: d.draftText ?? "", dmText: d.dmText ?? null, intent: d.intent ?? "",
      postId: d.postId ?? null, createdAt: d.createdAt ?? now,
    })));

  // ── history ──────────────────────────────────────────────────────────────────
  await load("history", t.history, t.history.id,
    (store.history ?? []).map((h) => ({
      id: h.id, accountId: acct, kind: h.kind, commentId: h.commentId ?? null,
      inbound: h.inbound ?? "", outbound: h.outbound ?? "", intent: h.intent ?? "",
      postId: h.postId ?? null, toUserId: h.toUserId ?? null, sentAt: h.sentAt ?? now,
      status: h.status, reason: h.reason ?? null,
    })));

  // ── clarifications ─────────────────────────────────────────────────────────
  await load("clarifications", t.clarifications, t.clarifications.id,
    (store.clarifications ?? []).map((c) => ({
      id: c.id, accountId: acct, commentId: c.commentId ?? null, postId: c.postId ?? "",
      commentText: c.commentText ?? "", question: c.question ?? "", kind: c.kind ?? null,
      draftAttempt: c.draftAttempt ?? null, fromUserId: c.fromUserId ?? "",
      fromUsername: c.fromUsername ?? null, status: c.status ?? "open",
      answer: c.answer ?? null, waiters: c.waiters ?? [], createdAt: c.createdAt ?? now,
    })));

  // ── training ─────────────────────────────────────────────────────────────────
  await load("training", t.training, t.training.id,
    (store.training ?? []).map((e) => ({
      id: e.id, accountId: acct, comment: e.comment ?? "", caption: e.caption ?? "",
      notes: e.notes ?? "", miraAction: e.miraAction ?? "", miraReply: e.miraReply ?? "",
      intent: e.intent ?? "", verdict: e.verdict ?? "good", correctAction: e.correctAction ?? null,
      idealReply: e.idealReply ?? null, askQuestion: e.askQuestion ?? null, note: e.note ?? null,
      embedding: e.embedding ?? null, createdAt: e.createdAt ?? now,
    })));

  // ── mentions ─────────────────────────────────────────────────────────────────
  await load("mentions", t.mentions, t.mentions.id,
    (store.mentions ?? []).map((m) => ({
      id: m.id, accountId: acct, kind: m.kind, mediaId: m.mediaId, permalink: m.permalink ?? null,
      thumbnailUrl: m.thumbnailUrl ?? null, mediaUrl: m.mediaUrl ?? null, mediaCaption: m.mediaCaption ?? null,
      commentId: m.commentId ?? null, commentText: m.commentText ?? null, fromUserId: m.fromUserId ?? null,
      fromUsername: m.fromUsername ?? null, mediaType: m.mediaType ?? null, likeCount: m.likeCount ?? null,
      commentsCount: m.commentsCount ?? null, ts: m.ts ?? now, seenAt: m.seenAt ?? now, read: m.read ?? false,
    })));

  // ── commenters ───────────────────────────────────────────────────────────────
  await load("commenters", t.commenters, [t.commenters.accountId, t.commenters.igUserId],
    Object.values(store.commenters ?? {}).map((c) => ({
      accountId: acct, igUserId: c.igUserId, username: c.username ?? "",
      firstSeenAt: c.firstSeenAt ?? now, lastSeenAt: c.lastSeenAt ?? now,
      commentCount: c.commentCount ?? 0, repliedCount: c.repliedCount ?? 0, themes: c.themes ?? [],
    })));

  // ── daily_stats ───────────────────────────────────────────────────────────────
  await load("daily_stats", t.dailyStats, [t.dailyStats.accountId, t.dailyStats.date],
    Object.values(store.dailyStats ?? {}).map((d) => ({
      accountId: acct, date: d.date, comments: d.comments ?? 0, autoReplied: d.autoReplied ?? 0,
      drafted: d.drafted ?? 0, sent: d.sent ?? 0, dmSent: d.dmSent ?? 0,
      factsLearned: d.factsLearned ?? 0, clarificationsResolved: d.clarificationsResolved ?? 0,
    })));

  // ── comments_cache ────────────────────────────────────────────────────────────
  await load("comments_cache", t.commentsCache, t.commentsCache.id,
    (store.commentsCache ?? []).map((c) => ({
      id: c.id, accountId: acct, postId: c.postId, postCaption: c.postCaption ?? "",
      postThumb: c.postThumb ?? null, postPermalink: c.postPermalink ?? null, text: c.text ?? "",
      fromUserId: c.fromUserId ?? "", fromUsername: c.fromUsername ?? "", timestamp: c.timestamp ?? "",
      ts: c.ts ?? now, isOwn: c.isOwn ?? false,
    })));

  // ── SQLite funnel (data/shaiz.db) ───────────────────────────────────────────
  const sqlitePath = path.join(process.cwd(), "..", "..", "data", "shaiz.db");
  try {
    const sdb = new Database(sqlitePath, { readonly: true });
    const pc = sdb.prepare("SELECT * FROM post_configs").all() as any[];
    await load("post_configs", t.postConfigs, t.postConfigs.id, pc.map((r) => ({
      id: r.id, accountId: acct, igPostId: r.ig_post_id, keywords: JSON.parse(r.keywords || "[]"),
      welcomeMsg: r.welcome_msg ?? "", buttonLabel: r.button_label ?? "", followGate: !!r.follow_gate,
      notFollowingMsg: r.not_following_msg ?? "", linkUrl: r.link_url ?? null, linkMsg: r.link_msg ?? null,
      active: !!r.active, createdAt: r.created_at ?? now, updatedAt: r.updated_at ?? now,
    })));

    const proc = sdb.prepare("SELECT * FROM processed_comments").all() as any[];
    await load("processed_comments", t.processedComments, t.processedComments.commentId, proc.map((r) => ({
      commentId: r.comment_id, accountId: acct, igsid: r.igsid, postId: r.post_id, repliedAt: r.replied_at ?? now,
    })));

    const us = sdb.prepare("SELECT * FROM user_states").all() as any[];
    await load("user_states", t.userStates, t.userStates.id, us.map((r) => ({
      id: r.id, accountId: acct, igsid: r.igsid, postId: r.post_id, commentId: r.comment_id,
      state: r.state, payload: r.payload ? JSON.parse(r.payload) : null,
      createdAt: r.created_at ?? now, updatedAt: r.updated_at ?? now,
    })));

    const ml = sdb.prepare("SELECT * FROM message_log").all() as any[];
    await load("message_log", t.messageLog, t.messageLog.id, ml.map((r) => ({
      id: r.id, accountId: acct, direction: r.direction, eventType: r.event_type, igsid: r.igsid ?? null,
      postId: r.post_id ?? null, payload: r.payload ? JSON.parse(r.payload) : {}, status: r.status ?? null,
      error: r.error ?? null, createdAt: r.created_at ?? now,
    })));
    sdb.close();
  } catch (e) {
    console.warn("[import] SQLite funnel skipped:", (e as Error).message);
  }

  console.log("[import] done");
  process.exit(0);
}

main().catch((e) => { console.error("[import] failed", e); process.exit(1); });
