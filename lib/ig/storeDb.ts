// store→core engine: assemble the full IgStore for one account from the Drizzle
// tables, and persist only the rows that changed (delta write-through). Raw pg
// (importable from Next). Used by store.ts when MIRA_STORE=drizzle.
import { pool, query, initSchema } from "./pg";
import type { PoolClient } from "pg";
import { SCHEMA_VERSION, freshStore, type IgStore } from "./store";

// ── assemble (read) ──────────────────────────────────────────────────────────
export async function assembleStore(accountId: string): Promise<IgStore> {
  await initSchema();
  const s = freshStore(); // defaults for fields not persisted per-row
  s.schemaVersion = SCHEMA_VERSION;

  const [acctRows, posts, knowledge, drafts, history, clar, training, mentions, commenters, daily, cache, autos, feed, prods] =
    await Promise.all([
      query<Record<string, unknown>>("SELECT * FROM accounts WHERE ig_user_id=$1", [accountId]),
      query<Record<string, unknown>>("SELECT * FROM posts WHERE account_id=$1", [accountId]),
      query<Record<string, unknown>>("SELECT * FROM knowledge WHERE account_id=$1", [accountId]),
      query<Record<string, unknown>>("SELECT * FROM drafts WHERE account_id=$1", [accountId]),
      query<Record<string, unknown>>("SELECT * FROM history WHERE account_id=$1 ORDER BY sent_at ASC", [accountId]),
      query<Record<string, unknown>>("SELECT * FROM clarifications WHERE account_id=$1", [accountId]),
      query<Record<string, unknown>>("SELECT * FROM training WHERE account_id=$1", [accountId]),
      query<Record<string, unknown>>("SELECT * FROM mentions WHERE account_id=$1", [accountId]),
      query<Record<string, unknown>>("SELECT * FROM commenters WHERE account_id=$1", [accountId]),
      query<Record<string, unknown>>("SELECT * FROM daily_stats WHERE account_id=$1", [accountId]),
      query<Record<string, unknown>>("SELECT * FROM comments_cache WHERE account_id=$1 ORDER BY ts ASC", [accountId]),
      query<Record<string, unknown>>("SELECT * FROM automations WHERE account_id=$1", [accountId]),
      query<Record<string, unknown>>("SELECT * FROM feed_events WHERE account_id=$1 ORDER BY ts ASC", [accountId]),
      query<Record<string, unknown>>("SELECT * FROM products WHERE account_id=$1 ORDER BY sort_order ASC, created_at ASC", [accountId]),
    ]);

  const a = acctRows[0];
  if (a) {
    s.account = {
      igUserId: String(a.ig_user_id), username: String(a.username ?? ""),
      accessToken: String(a.access_token ?? ""), tokenExpiresAt: Number(a.token_expires_at ?? 0),
      connectedAt: Number(a.connected_at ?? 0),
    };
    s.lastToken = (a.last_token as string) || undefined;
    s.settings = { ...s.settings, ...((a.settings as object) ?? {}) };
    if (a.owner_profile) s.ownerProfile = a.owner_profile as IgStore["ownerProfile"];
    s.styleSamples = (a.style_samples as string[]) ?? [];
    s.toneSummary = (a.tone_summary as string) ?? "";
    s.blocklist = (a.blocklist as string[]) ?? [];
    s.trustedContacts = (a.trusted_contacts as IgStore["trustedContacts"]) ?? [];
    s.fingerprints = (a.fingerprints as IgStore["fingerprints"]) ?? [];
    s.followerCache = (a.follower_cache as IgStore["followerCache"]) ?? [];
    s.sendQueue = (a.send_queue as IgStore["sendQueue"]) ?? [];
    s.pollWatermark = Number(a.poll_watermark ?? 0);
    s.dmLog = (a.dm_log as IgStore["dmLog"]) ?? [];
    s.postDMsSent = (a.post_dms_sent as IgStore["postDMsSent"]) ?? [];
    s.dmBlocked = (a.dm_blocked as IgStore["dmBlocked"]) ?? [];
    s.linkPending = (a.link_pending as IgStore["linkPending"]) ?? [];
  }

  s.posts = Object.fromEntries(posts.map((p) => [String(p.id), {
    id: String(p.id), caption: String(p.caption ?? ""), mediaType: String(p.media_type ?? ""),
    permalink: (p.permalink as string) ?? undefined, thumbnailUrl: (p.thumbnail_url as string) ?? undefined,
    timestamp: String(p.timestamp ?? ""), notes: String(p.notes ?? ""),
    qa: (p.qa as never) ?? [], links: (p.links as never) ?? [], insights: (p.insights as never) ?? undefined,
    updatedAt: Number(p.updated_at ?? 0),
  }]));

  s.knowledge = knowledge.map((f) => ({
    id: String(f.id), question: String(f.question), answer: String(f.answer), topic: f.topic as never,
    scope: f.scope as never, postId: (f.post_id as string) ?? undefined, aliases: (f.aliases as string[]) ?? [],
    embedding: (f.embedding as number[]) ?? undefined, link: (f.link as never) ?? undefined,
    hitCount: Number(f.hit_count ?? 0), confidence: Number(f.confidence ?? 1), durable: Boolean(f.durable),
    expiresAt: f.expires_at != null ? Number(f.expires_at) : undefined,
    sourceCommentId: (f.source_comment_id as string) ?? undefined,
    createdAt: Number(f.created_at ?? 0), updatedAt: Number(f.updated_at ?? 0),
    lastUsedAt: f.last_used_at != null ? Number(f.last_used_at) : undefined,
  }));

  s.pendingDrafts = drafts.map((d) => ({
    id: String(d.id), kind: d.kind as never, threadOrMediaId: String(d.thread_or_media_id),
    fromUserId: String(d.from_user_id), fromUsername: (d.from_username as string) ?? undefined,
    inboundText: String(d.inbound_text ?? ""), draftText: String(d.draft_text ?? ""),
    dmText: (d.dm_text as string) ?? undefined, intent: String(d.intent ?? ""),
    postId: (d.post_id as string) ?? undefined, createdAt: Number(d.created_at ?? 0),
  }));

  s.history = history.map((h) => ({
    id: String(h.id), kind: h.kind as never, commentId: (h.comment_id as string) ?? undefined,
    inbound: String(h.inbound ?? ""), outbound: String(h.outbound ?? ""), intent: String(h.intent ?? ""),
    postId: (h.post_id as string) ?? undefined, toUserId: (h.to_user_id as string) ?? undefined,
    sentAt: Number(h.sent_at ?? 0), status: h.status as never, reason: (h.reason as string) ?? undefined,
  }));

  s.clarifications = clar.map((c) => ({
    id: String(c.id), commentId: (c.comment_id as string) ?? undefined, postId: String(c.post_id ?? ""),
    commentText: String(c.comment_text ?? ""), question: String(c.question ?? ""), kind: (c.kind as never) ?? undefined,
    draftAttempt: (c.draft_attempt as string) ?? undefined, fromUserId: String(c.from_user_id ?? ""),
    fromUsername: (c.from_username as string) ?? undefined, status: c.status as never,
    answer: (c.answer as string) ?? undefined, waiters: (c.waiters as never) ?? [], createdAt: Number(c.created_at ?? 0),
  }));

  s.training = training.map((t) => ({
    id: String(t.id), comment: String(t.comment ?? ""), caption: String(t.caption ?? ""), notes: String(t.notes ?? ""),
    miraAction: String(t.mira_action ?? ""), miraReply: String(t.mira_reply ?? ""), intent: String(t.intent ?? ""),
    verdict: t.verdict as never, correctAction: (t.correct_action as never) ?? undefined,
    idealReply: (t.ideal_reply as string) ?? undefined, askQuestion: (t.ask_question as string) ?? undefined,
    note: (t.note as string) ?? undefined, embedding: (t.embedding as number[]) ?? undefined, createdAt: Number(t.created_at ?? 0),
  }));

  s.mentions = mentions.map((m) => ({
    id: String(m.id), kind: m.kind as never, mediaId: String(m.media_id), permalink: (m.permalink as string) ?? undefined,
    thumbnailUrl: (m.thumbnail_url as string) ?? undefined, mediaUrl: (m.media_url as string) ?? undefined,
    mediaCaption: (m.media_caption as string) ?? undefined, commentId: (m.comment_id as string) ?? undefined,
    commentText: (m.comment_text as string) ?? undefined, fromUserId: (m.from_user_id as string) ?? undefined,
    fromUsername: (m.from_username as string) ?? undefined, mediaType: (m.media_type as string) ?? undefined,
    likeCount: m.like_count != null ? Number(m.like_count) : undefined,
    commentsCount: m.comments_count != null ? Number(m.comments_count) : undefined,
    ts: Number(m.ts ?? 0), seenAt: Number(m.seen_at ?? 0), read: Boolean(m.read),
  }));

  s.commenters = Object.fromEntries(commenters.map((c) => [String(c.ig_user_id), {
    igUserId: String(c.ig_user_id), username: String(c.username ?? ""), firstSeenAt: Number(c.first_seen_at ?? 0),
    lastSeenAt: Number(c.last_seen_at ?? 0), commentCount: Number(c.comment_count ?? 0),
    repliedCount: Number(c.replied_count ?? 0), themes: (c.themes as string[]) ?? [],
  }]));

  s.dailyStats = Object.fromEntries(daily.map((d) => [String(d.date), {
    date: String(d.date), comments: Number(d.comments ?? 0), autoReplied: Number(d.auto_replied ?? 0),
    drafted: Number(d.drafted ?? 0), sent: Number(d.sent ?? 0), dmSent: Number(d.dm_sent ?? 0),
    factsLearned: Number(d.facts_learned ?? 0), clarificationsResolved: Number(d.clarifications_resolved ?? 0),
  }]));

  s.commentsCache = cache.map((c) => ({
    id: String(c.id), postId: String(c.post_id), postCaption: String(c.post_caption ?? ""),
    postThumb: (c.post_thumb as string) ?? undefined, postPermalink: (c.post_permalink as string) ?? undefined,
    text: String(c.text ?? ""), fromUserId: String(c.from_user_id ?? ""), fromUsername: String(c.from_username ?? ""),
    timestamp: String(c.timestamp ?? ""), ts: Number(c.ts ?? 0), isOwn: Boolean(c.is_own),
  }));

  s.automations = autos.map((a2) => ({
    id: String(a2.id), name: String(a2.name ?? "Untitled"), enabled: Boolean(a2.enabled),
    trigger: a2.trigger as never, nodes: a2.nodes as never, edges: a2.edges as never, stats: a2.stats as never,
    createdAt: Number(a2.created_at ?? 0), updatedAt: Number(a2.updated_at ?? 0),
  }));

  s.feedEvents = feed.map((f) => ({ ...(f.payload as object), id: String(f.id), kind: f.kind as never, ts: Number(f.ts ?? 0) } as never));

  s.products = prods.map((p) => ({
    id: String(p.id), title: String(p.title ?? ""), subtitle: String(p.subtitle ?? ""),
    description: String(p.description ?? ""), priceText: (p.price_text as string) ?? null,
    imageUrl: (p.image_url as string) ?? null, ctaUrl: (p.cta_url as string) ?? null,
    available: Boolean(p.available), aliases: (p.aliases as string[]) ?? [],
    slug: (p.slug as string) ?? null, sortOrder: Number(p.sort_order ?? 0),
    createdAt: Number(p.created_at ?? 0), updatedAt: Number(p.updated_at ?? 0),
  }));

  return s;
}

// ── persist (delta write-through) ────────────────────────────────────────────
const J = (v: unknown) => JSON.stringify(v ?? null);

async function upsertRows(c: PoolClient, table: string, conflict: string[], rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const updates = cols.filter((k) => !conflict.includes(k)).map((k) => `${k}=EXCLUDED.${k}`).join(", ");
  for (const r of rows) {
    const vals = cols.map((_, i) => `$${i + 1}`).join(", ");
    await c.query(
      `INSERT INTO ${table} (${cols.join(",")}) VALUES (${vals}) ON CONFLICT (${conflict.join(",")}) DO UPDATE SET ${updates}`,
      cols.map((k) => r[k])
    );
  }
}

async function deleteIds(c: PoolClient, table: string, idCol: string, accountId: string, ids: string[]) {
  if (!ids.length) return;
  await c.query(`DELETE FROM ${table} WHERE account_id=$1 AND ${idCol} = ANY($2::text[])`, [accountId, ids]);
}

// Sync an id-keyed list: upsert new/changed rows, delete removed. Only the delta
// touches the network — unchanged rows (compared by serialized row) are skipped.
async function syncList<T>(
  c: PoolClient, table: string, idCol: string, accountId: string,
  prev: T[], next: T[], idOf: (t: T) => string, toRow: (t: T) => Record<string, unknown>
) {
  const prevMap = new Map(prev.map((x) => [idOf(x), x]));
  const nextMap = new Map(next.map((x) => [idOf(x), x]));
  const changed: Record<string, unknown>[] = [];
  for (const [id, item] of nextMap) {
    const p = prevMap.get(id);
    if (!p || J(toRow(p)) !== J(toRow(item))) changed.push(toRow(item));
  }
  const removed = [...prevMap.keys()].filter((id) => !nextMap.has(id));
  await upsertRows(c, table, [idCol], changed);
  await deleteIds(c, table, idCol, accountId, removed);
}

export async function persistDelta(accountId: string, prev: IgStore, next: IgStore): Promise<void> {
  await initSchema();
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const now = Date.now();

    // account row — folded fields. One row; update if any changed.
    const accFields = (s: IgStore) => J([
      s.account?.username, s.account?.accessToken, s.account?.tokenExpiresAt, s.lastToken,
      s.settings, s.ownerProfile, s.styleSamples, s.toneSummary, s.blocklist, s.trustedContacts,
      s.fingerprints, s.followerCache, s.sendQueue, s.pollWatermark, s.dmLog, s.postDMsSent, s.dmBlocked, s.linkPending,
    ]);
    if (next.account && accFields(prev) !== accFields(next)) {
      await c.query(
        `UPDATE accounts SET username=$2, access_token=$3, token_expires_at=$4, last_token=$5, settings=$6,
           owner_profile=$7, style_samples=$8, tone_summary=$9, blocklist=$10, trusted_contacts=$11,
           fingerprints=$12, follower_cache=$13, send_queue=$14, poll_watermark=$15, dm_log=$16,
           post_dms_sent=$17, dm_blocked=$18, link_pending=$19, updated_at=$20 WHERE ig_user_id=$1`,
        [next.account.igUserId, next.account.username, next.account.accessToken, next.account.tokenExpiresAt,
         next.lastToken ?? null, J(next.settings), J(next.ownerProfile), J(next.styleSamples), next.toneSummary,
         J(next.blocklist), J(next.trustedContacts), J(next.fingerprints), J(next.followerCache), J(next.sendQueue),
         next.pollWatermark, J(next.dmLog), J(next.postDMsSent), J(next.dmBlocked), J(next.linkPending), now]
      );
    }

    await syncList(c, "posts", "id", accountId, Object.values(prev.posts), Object.values(next.posts),
      (p) => p.id, (p) => ({ id: p.id, account_id: accountId, caption: p.caption, media_type: p.mediaType,
        permalink: p.permalink ?? null, thumbnail_url: p.thumbnailUrl ?? null, timestamp: p.timestamp, notes: p.notes,
        qa: J(p.qa), links: J(p.links), insights: p.insights ? J(p.insights) : null, updated_at: p.updatedAt }));

    await syncList(c, "knowledge", "id", accountId, prev.knowledge, next.knowledge, (f) => f.id, (f) => ({
      id: f.id, account_id: accountId, question: f.question, answer: f.answer, topic: f.topic, scope: f.scope,
      post_id: f.postId ?? null, aliases: J(f.aliases), embedding: f.embedding ? J(f.embedding) : null,
      link: f.link ? J(f.link) : null, hit_count: f.hitCount, confidence: f.confidence, durable: f.durable,
      expires_at: f.expiresAt ?? null, source_comment_id: f.sourceCommentId ?? null, created_at: f.createdAt,
      updated_at: f.updatedAt, last_used_at: f.lastUsedAt ?? null }));

    await syncList(c, "drafts", "id", accountId, prev.pendingDrafts, next.pendingDrafts, (d) => d.id, (d) => ({
      id: d.id, account_id: accountId, kind: d.kind, thread_or_media_id: d.threadOrMediaId, from_user_id: d.fromUserId,
      from_username: d.fromUsername ?? null, inbound_text: d.inboundText, draft_text: d.draftText, dm_text: d.dmText ?? null,
      intent: d.intent, post_id: d.postId ?? null, created_at: d.createdAt }));

    await syncList(c, "history", "id", accountId, prev.history, next.history, (h) => h.id, (h) => ({
      id: h.id, account_id: accountId, kind: h.kind, comment_id: h.commentId ?? null, inbound: h.inbound,
      outbound: h.outbound, intent: h.intent, post_id: h.postId ?? null, to_user_id: h.toUserId ?? null,
      sent_at: h.sentAt, status: h.status, reason: h.reason ?? null }));

    await syncList(c, "clarifications", "id", accountId, prev.clarifications, next.clarifications, (x) => x.id, (x) => ({
      id: x.id, account_id: accountId, comment_id: x.commentId ?? null, post_id: x.postId, comment_text: x.commentText,
      question: x.question, kind: x.kind ?? null, draft_attempt: x.draftAttempt ?? null, from_user_id: x.fromUserId,
      from_username: x.fromUsername ?? null, status: x.status, answer: x.answer ?? null, waiters: J(x.waiters), created_at: x.createdAt }));

    await syncList(c, "training", "id", accountId, prev.training, next.training, (t) => t.id, (t) => ({
      id: t.id, account_id: accountId, comment: t.comment, caption: t.caption, notes: t.notes, mira_action: t.miraAction,
      mira_reply: t.miraReply, intent: t.intent, verdict: t.verdict, correct_action: t.correctAction ?? null,
      ideal_reply: t.idealReply ?? null, ask_question: t.askQuestion ?? null, note: t.note ?? null,
      embedding: t.embedding ? J(t.embedding) : null, created_at: t.createdAt }));

    await syncList(c, "mentions", "id", accountId, prev.mentions, next.mentions, (m) => m.id, (m) => ({
      id: m.id, account_id: accountId, kind: m.kind, media_id: m.mediaId, permalink: m.permalink ?? null,
      thumbnail_url: m.thumbnailUrl ?? null, media_url: m.mediaUrl ?? null, media_caption: m.mediaCaption ?? null,
      comment_id: m.commentId ?? null, comment_text: m.commentText ?? null, from_user_id: m.fromUserId ?? null,
      from_username: m.fromUsername ?? null, media_type: m.mediaType ?? null, like_count: m.likeCount ?? null,
      comments_count: m.commentsCount ?? null, ts: m.ts, seen_at: m.seenAt, read: m.read }));

    await syncList(c, "comments_cache", "id", accountId, prev.commentsCache, next.commentsCache, (x) => x.id, (x) => ({
      id: x.id, account_id: accountId, post_id: x.postId, post_caption: x.postCaption, post_thumb: x.postThumb ?? null,
      post_permalink: x.postPermalink ?? null, text: x.text, from_user_id: x.fromUserId, from_username: x.fromUsername,
      timestamp: x.timestamp, ts: x.ts, is_own: x.isOwn }));

    await syncList(c, "automations", "id", accountId, prev.automations, next.automations, (a2) => a2.id, (a2) => ({
      id: a2.id, account_id: accountId, name: a2.name, enabled: a2.enabled, trigger: J(a2.trigger), nodes: J(a2.nodes),
      edges: J(a2.edges), stats: J(a2.stats), created_at: a2.createdAt, updated_at: a2.updatedAt }));

    // commenters (PK account_id, ig_user_id) + daily_stats (PK account_id, date)
    await syncKeyed(c, "commenters", ["account_id", "ig_user_id"], "ig_user_id", accountId,
      Object.values(prev.commenters), Object.values(next.commenters), (x) => x.igUserId, (x) => ({
        account_id: accountId, ig_user_id: x.igUserId, username: x.username, first_seen_at: x.firstSeenAt,
        last_seen_at: x.lastSeenAt, comment_count: x.commentCount, replied_count: x.repliedCount, themes: J(x.themes) }));

    await syncKeyed(c, "daily_stats", ["account_id", "date"], "date", accountId,
      Object.values(prev.dailyStats), Object.values(next.dailyStats), (x) => x.date, (x) => ({
        account_id: accountId, date: x.date, comments: x.comments, auto_replied: x.autoReplied, drafted: x.drafted,
        sent: x.sent, dm_sent: x.dmSent, facts_learned: x.factsLearned, clarifications_resolved: x.clarificationsResolved }));

    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

// composite-PK variant (no single id col; delete by the secondary key)
async function syncKeyed<T>(
  c: PoolClient, table: string, conflict: string[], keyCol: string, accountId: string,
  prev: T[], next: T[], keyOf: (t: T) => string, toRow: (t: T) => Record<string, unknown>
) {
  const prevMap = new Map(prev.map((x) => [keyOf(x), x]));
  const nextMap = new Map(next.map((x) => [keyOf(x), x]));
  const changed: Record<string, unknown>[] = [];
  for (const [id, item] of nextMap) {
    const p = prevMap.get(id);
    if (!p || J(toRow(p)) !== J(toRow(item))) changed.push(toRow(item));
  }
  const removed = [...prevMap.keys()].filter((id) => !nextMap.has(id));
  await upsertRows(c, table, conflict, changed);
  if (removed.length) await c.query(`DELETE FROM ${table} WHERE account_id=$1 AND ${keyCol} = ANY($2::text[])`, [accountId, removed]);
}
