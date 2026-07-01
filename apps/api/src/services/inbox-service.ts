// Inbox domain — business logic (no HTTP, no requireUser).
// All functions return data or throw; callers decide how to surface errors.
import {
  readStore,
  updateStoreFor,
  type Fact,
  type FactTopic,
  type Mention,
} from "@/lib/ig/store";
import {
  listFacts,
  addFact,
  updateFact,
  deleteFact,
  backfillEmbeddings,
  promoteClarification,
} from "@/lib/ig/knowledge";
import { sendDraft, reprocessClarification } from "@/lib/ig/pipeline";
import { serveLinkForPost } from "@/lib/ig/links";
import { getTaggedMedia, replyToComment } from "@/lib/ig/graph";
import { primeSeen } from "@/lib/ig/seen";
import { publish } from "@/lib/ig/bus";
import { reconcileAccount } from "@/lib/ig/reconcile";

export const TOPICS: FactTopic[] = ["gear", "location", "song", "personal", "shop", "general"];

// ── knowledge ────────────────────────────────────────────────────────────────

export async function getKnowledge(accountId: string) {
  await backfillEmbeddings(accountId).catch(() => {});
  const facts = await listFacts(accountId);
  return { facts };
}

export async function createKnowledge(accountId: string, b: {
  question?: string;
  answer?: string;
  topic?: FactTopic;
  scope?: "account" | "post";
  postId?: string;
  durable?: boolean;
}): Promise<{ fact: Fact } | { validationError: string }> {
  const question = (b.question || "").trim();
  const answer = (b.answer || "").trim();
  if (!question || !answer) {
    return { validationError: "question and answer are required" };
  }
  const isLink = /^https?:\/\//i.test(answer);
  const fact = await addFact({
    question,
    answer,
    topic: b.topic && TOPICS.includes(b.topic) ? b.topic : "general",
    scope: b.scope === "post" ? "post" : "account",
    postId: b.scope === "post" ? b.postId : undefined,
    durable: b.durable !== false,
    link: isLink ? { url: answer, label: question } : undefined,
  }, accountId);
  return { fact };
}

export async function patchKnowledge(
  accountId: string,
  id: string,
  patch: Partial<Fact>
): Promise<{ fact: Fact } | null> {
  // never let the client rewrite identity / derived fields
  delete patch.id;
  delete patch.embedding;
  delete patch.createdAt;
  const fact = await updateFact(id, patch, accountId);
  if (!fact) return null;
  return { fact };
}

export async function removeKnowledge(accountId: string, id: string): Promise<void> {
  await deleteFact(id, accountId);
}

// ── kb (tag-centric view over the knowledge table) ────────────────────────────
// KbEntry is a projection of an account-scoped Fact: free-form `tags` ride in
// the fact's `aliases` array (lossless round-trip); topic stays "general".

export type KbEntry = { id: string; question: string; answer: string; tags: string[] };

const toKbEntry = (f: Fact): KbEntry => ({
  id: f.id,
  question: f.question,
  answer: f.answer,
  tags: f.aliases ?? [],
});

export async function getKb(accountId: string): Promise<{ entries: KbEntry[] }> {
  await backfillEmbeddings(accountId).catch(() => {});
  const facts = await listFacts(accountId);
  return { entries: facts.filter((f) => f.scope === "account").map(toKbEntry) };
}

export async function addKb(accountId: string, b: {
  question?: string;
  answer?: string;
  tags?: string[];
}): Promise<{ entry: KbEntry } | { validationError: string }> {
  const question = (b.question || "").trim();
  const answer = (b.answer || "").trim();
  if (!question || !answer) {
    return { validationError: "question and answer are required" };
  }
  const tags = (b.tags ?? []).map((t) => t.trim()).filter(Boolean);
  const fact = await addFact({
    question,
    answer,
    topic: "general",
    scope: "account",
    aliases: tags,
    durable: true,
  }, accountId);
  return { entry: toKbEntry(fact) };
}

export async function removeKb(accountId: string, id: string): Promise<void> {
  await deleteFact(id, accountId);
}

// ── drafts ───────────────────────────────────────────────────────────────────

export async function getDrafts(accountId: string) {
  const s = await readStore(accountId);
  return {
    pending: s.pendingDrafts,
    history: s.history.slice(0, 50),
    mode: s.settings.replyMode,
  };
}

export type DraftActionResult =
  | { ok: true }
  | { notFound: true }
  | { notConnected: true }
  | { badAction: true };

export async function actOnDraft(
  accountId: string,
  id: string,
  b: { action?: "approve" | "reject" | "edit"; text?: string }
): Promise<DraftActionResult> {
  const store = await readStore(accountId);
  const draft = store.pendingDrafts.find((d) => d.id === id);
  if (!draft) return { notFound: true };
  if (!store.account) return { notConnected: true };

  if (b.action === "reject") {
    await updateStoreFor(accountId, (s) => ({
      ...s,
      pendingDrafts: s.pendingDrafts.filter((d) => d.id !== id),
    }));
    return { ok: true };
  }
  if (b.action === "edit" && typeof b.text === "string") {
    const text = b.text;
    await updateStoreFor(accountId, (s) => ({
      ...s,
      pendingDrafts: s.pendingDrafts.map((d) =>
        d.id === id ? { ...d, draftText: text } : d
      ),
    }));
    return { ok: true };
  }
  if (b.action === "approve") {
    const final = b.text ? { ...draft, draftText: b.text } : draft;
    await sendDraft(final, store.account.accessToken, store.account.igUserId);
    return { ok: true };
  }
  return { badAction: true };
}

// ── clarifications ───────────────────────────────────────────────────────────

export async function getClarifications(accountId: string) {
  const s = await readStore(accountId);
  return {
    open: s.clarifications.filter((c) => c.status === "open"),
    recent: s.clarifications.slice(0, 50),
  };
}

export type ClarificationActionResult =
  | { ok: true }
  | { notFound: true }
  | { badAction: true };

export async function actOnClarification(
  accountId: string,
  id: string,
  b: { action: "answer" | "skip"; answer?: string }
): Promise<ClarificationActionResult> {
  const store = await readStore(accountId);
  const c = store.clarifications.find((x) => x.id === id);
  if (!c) return { notFound: true };

  if (b.action === "skip") {
    await updateStoreFor(accountId, (s) => ({
      ...s,
      clarifications: s.clarifications.map((x) =>
        x.id === id ? { ...x, status: "skipped" as const } : x
      ),
    }));
    return { ok: true };
  }

  if (b.action === "answer" && b.answer) {
    const answer = b.answer.trim();
    const isLink = c.kind === "link" || /^https?:\/\//i.test(answer);

    await updateStoreFor(accountId, (s) => {
      const posts = { ...s.posts };
      const p = c.postId ? posts[c.postId] : undefined;
      if (p) {
        if (isLink) {
          // link answer → attach to THIS post only (strictly post-scoped)
          posts[c.postId] = {
            ...p,
            links: [
              ...(p.links || []),
              {
                id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                label: "link",
                url: answer,
                type: "other" as const,
              },
            ],
            updatedAt: Date.now(),
          };
        } else {
          // context answer → fold into the post's Q&A
          posts[c.postId] = {
            ...p,
            qa: [...p.qa, { q: c.question, a: answer, ts: Date.now() }],
            updatedAt: Date.now(),
          };
        }
      }
      return {
        ...s,
        clarifications: s.clarifications.map((x) =>
          x.id === id ? { ...x, status: "answered" as const, answer } : x
        ),
        posts,
      };
    });

    if (isLink) {
      // serve this comment + everyone queued behind it (serveLinkForPost
      // reprocesses the clarification and all its waiters)
      await serveLinkForPost(c.postId).catch(() => {});
    } else {
      // context → promote into the knowledge base for cross-post recall,
      // then serve the comment + everyone queued behind it
      await promoteClarification(c, answer, accountId).catch(() => {});
      await reprocessClarification(accountId, c).catch(() => {});
    }

    return { ok: true };
  }

  return { badAction: true };
}

// ── comments ─────────────────────────────────────────────────────────────────

export async function getComments(
  accountId: string,
  refresh: boolean
): Promise<{
  rows: unknown[];
  count: number;
  live: { ok: boolean; newCount: number; error?: string } | null;
  notConnected?: boolean;
}> {
  let live: { ok: boolean; newCount: number; error?: string } | null = null;
  if (refresh) {
    const r = (await Promise.race([
      reconcileAccount(accountId).then((x) => ({ newCount: x.enqueued })),
      new Promise((res) =>
        setTimeout(() => res({ newCount: 0, error: "timed out" }), 25_000)
      ),
    ])) as { newCount: number; error?: string };
    live = { ok: !r.error, newCount: r.newCount ?? 0, error: r.error };
  }

  const store = await readStore(accountId);
  if (!store.account) return { rows: [], count: 0, live, notConnected: true };

  // Instagram returns an inconsistent from.id for the owner's own comments —
  // match on username too so the owner's replies are reliably flagged.
  const ownName = store.account.username.toLowerCase();
  const ownId = store.account.igUserId;

  const rows = store.commentsCache.map((c) => {
    const draft = store.pendingDrafts.find((d) => d.threadOrMediaId === c.id);
    // exact join by comment id — never by text (two people saying "Hi" must
    // not share a reply). Old logs with no commentId fall back to text + user.
    const log = store.history.find(
      (h) =>
        h.kind === "comment" &&
        (h.status === "sent" || h.status === "skipped") &&
        (h.commentId
          ? h.commentId === c.id
          : h.inbound === c.text && h.toUserId === c.fromUserId)
    );
    const clar = store.clarifications.find(
      (x) => x.commentText === c.text && x.fromUserId === c.fromUserId && x.status === "open"
    );
    const status: "replied" | "skipped" | "pending" | "needs_info" | "none" =
      log?.status === "sent"
        ? "replied"
        : log?.status === "skipped"
        ? "skipped"
        : clar
        ? "needs_info"
        : draft
        ? "pending"
        : "none";
    const isOwn =
      c.isOwn ||
      c.fromUserId === ownId ||
      (!!c.fromUsername && c.fromUsername.toLowerCase() === ownName);
    return {
      ...c,
      isOwn,
      status,
      skipReason: log?.status === "skipped" ? log.reason : undefined,
      draftText: draft?.draftText,
      ownReply:
        log?.status === "sent"
          ? { text: log.outbound, ts: log.sentAt }
          : undefined,
      isSuperfan: (store.commenters[c.fromUserId]?.commentCount ?? 0) >= 4,
    };
  });

  return { rows, count: rows.length, live };
}

export type CommentReplyResult =
  | { ok: true }
  | { notFound: true }
  | { notConnected: true }
  | { validationError: string }
  | { sendError: string };

// Manual owner reply to a comment (the "reply" button in the inbox). Mirrors
// the pipeline's send path: post via graph, prime seen so we don't re-ingest
// our own reply, and log to history so the comment flips to "replied".
export async function replyToCommentManual(
  accountId: string,
  commentId: string,
  text: string
): Promise<CommentReplyResult> {
  const message = (text || "").trim();
  if (!message) return { validationError: "text is required" };

  const store = await readStore(accountId);
  if (!store.account) return { notConnected: true };
  const c = store.commentsCache.find((x) => x.id === commentId);
  if (!c) return { notFound: true };

  try {
    const posted = (await replyToComment(
      commentId,
      message,
      store.account.accessToken
    )) as { id?: string } | undefined;
    if (posted?.id) primeSeen([posted.id]);
  } catch (e) {
    return { sendError: e instanceof Error ? e.message : "reply failed" };
  }

  await updateStoreFor(accountId, (s) => ({
    ...s,
    history: [
      {
        id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        kind: "comment" as const,
        commentId,
        inbound: c.text,
        outbound: message,
        intent: "manual",
        postId: c.postId,
        toUserId: c.fromUserId,
        sentAt: Date.now(),
        status: "sent" as const,
      },
      ...s.history,
    ].slice(0, 10000),
  }));

  return { ok: true };
}

// ── mentions ─────────────────────────────────────────────────────────────────

export async function getMentions(accountId: string) {
  const s = await readStore(accountId);
  const list = [...(s.mentions || [])].sort((a, b) => b.ts - a.ts);
  return { mentions: list };
}

export async function refreshMentions(
  accountId: string
): Promise<{ ok: true; added: number; scanned: number } | { fetchError: string }> {
  const s = await readStore(accountId);
  if (!s.account) return { fetchError: "not connected" };
  const { igUserId, accessToken } = s.account;
  let added = 0;
  try {
    const tagged = (await getTaggedMedia(accessToken, igUserId)) as {
      data?: Array<{
        id: string;
        caption?: string;
        media_type?: string;
        permalink?: string;
        thumbnail_url?: string;
        media_url?: string;
        timestamp?: string;
        username?: string;
        like_count?: number;
        comments_count?: number;
      }>;
    };

    const incoming: Mention[] = (tagged.data ?? []).map((m) => ({
      id: `tag:${m.id}`,
      kind: "tag",
      mediaId: m.id,
      permalink: m.permalink,
      thumbnailUrl: m.thumbnail_url || m.media_url,
      mediaUrl: m.media_url,
      mediaCaption: m.caption || "",
      mediaType: m.media_type,
      likeCount: m.like_count,
      commentsCount: m.comments_count,
      fromUsername: m.username,
      ts: m.timestamp ? new Date(m.timestamp).getTime() : Date.now(),
      seenAt: Date.now(),
      read: false,
    }));

    await updateStoreFor(accountId, (cur) => {
      const existing = new Map((cur.mentions || []).map((x) => [x.id, x]));
      for (const m of incoming) {
        const prev = existing.get(m.id);
        if (!prev) {
          existing.set(m.id, m);
          added++;
        } else {
          // refresh metadata + insights, preserve read/seenAt
          existing.set(m.id, {
            ...prev,
            ...m,
            seenAt: prev.seenAt,
            read: prev.read,
          });
        }
      }
      return { ...cur, mentions: Array.from(existing.values()).slice(0, 500) };
    });

    publish({
      type: "log",
      level: "info",
      msg: `mentions refresh: +${added} (tags)`,
      ts: Date.now(),
    });
    return { ok: true, added, scanned: incoming.length };
  } catch (e) {
    return { fetchError: e instanceof Error ? e.message : "mentions fetch failed" };
  }
}

export async function patchMentions(
  accountId: string,
  b: { id?: string; read?: boolean; all?: boolean }
): Promise<void> {
  const targetRead = b.read !== false;
  await updateStoreFor(accountId, (s) => {
    const next = (s.mentions || []).map((m) => {
      if (b.all) return { ...m, read: targetRead };
      if (b.id && m.id === b.id) return { ...m, read: targetRead };
      return m;
    });
    return { ...s, mentions: next };
  });
}

// ── commenters ───────────────────────────────────────────────────────────────

export async function getCommenters(accountId: string) {
  const s = await readStore(accountId);
  const list = Object.values(s.commenters)
    .sort((a, b) => b.commentCount - a.commentCount)
    .slice(0, 100);
  return { commenters: list };
}
