// Inbox routes — knowledge, drafts, clarifications, comments, mentions,
// commenters. Ported 1:1 from the Next app/api/ig/* handlers, scoped to the
// logged-in user's account. Response shapes, status codes, and error messages
// match the originals exactly.
import { Elysia } from "elysia";
import { requireUser } from "../lib/auth";
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
import { getTaggedMedia } from "@/lib/ig/graph";
import { publish } from "@/lib/ig/bus";
import { tick } from "@/lib/ig/watcher";

const TOPICS: FactTopic[] = ["gear", "location", "song", "personal", "shop", "general"];

export const inboxRoute = new Elysia()
  // ── knowledge ──────────────────────────────────────────────────────────
  .get("/api/ig/knowledge", async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    // opening the Knowledge editor is a good moment to embed any old facts
    await backfillEmbeddings().catch(() => {});
    const facts = await listFacts();
    return { facts };
  })
  .post("/api/ig/knowledge", async ({ request, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as {
      question?: string;
      answer?: string;
      topic?: FactTopic;
      scope?: "account" | "post";
      postId?: string;
      durable?: boolean;
    };
    const question = (b.question || "").trim();
    const answer = (b.answer || "").trim();
    if (!question || !answer) {
      set.status = 400;
      return { error: "question and answer are required" };
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
    });
    return { fact };
  })
  .patch("/api/ig/knowledge/:id", async ({ request, params, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const patch = (body ?? {}) as Partial<Fact>;
    // never let the client rewrite identity / derived fields
    delete patch.id;
    delete patch.embedding;
    delete patch.createdAt;
    const fact = await updateFact(params.id, patch);
    if (!fact) { set.status = 404; return { error: "not found" }; }
    return { fact };
  })
  .delete("/api/ig/knowledge/:id", async ({ request, params, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    await deleteFact(params.id);
    return { ok: true };
  })
  // ── drafts ─────────────────────────────────────────────────────────────
  .get("/api/ig/drafts", async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const s = await readStore(a.ctx.accountId);
    return {
      pending: s.pendingDrafts,
      history: s.history.slice(0, 50),
      mode: s.settings.replyMode,
    };
  })
  .post("/api/ig/drafts/:id", async ({ request, params, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const accountId = a.ctx.accountId;
    const id = params.id;
    const b = (body ?? {}) as { action?: "approve" | "reject" | "edit"; text?: string };
    const store = await readStore(accountId);
    const draft = store.pendingDrafts.find((d) => d.id === id);
    if (!draft) { set.status = 404; return { error: "not found" }; }
    if (!store.account) { set.status = 400; return { error: "not connected" }; }

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
    set.status = 400;
    return { error: "bad action" };
  })
  // ── clarifications ─────────────────────────────────────────────────────
  .get("/api/ig/clarifications", async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const s = await readStore(a.ctx.accountId);
    return {
      open: s.clarifications.filter((c) => c.status === "open"),
      recent: s.clarifications.slice(0, 50),
    };
  })
  .post("/api/ig/clarifications/:id", async ({ request, params, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const accountId = a.ctx.accountId;
    const id = params.id;
    const b = (body ?? {}) as { action: "answer" | "skip"; answer?: string };
    const store = await readStore(accountId);
    const c = store.clarifications.find((x) => x.id === id);
    if (!c) { set.status = 404; return { error: "not found" }; }

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
        await promoteClarification(c, answer).catch(() => {});
        await reprocessClarification(c).catch(() => {});
      }

      return { ok: true };
    }

    set.status = 400;
    return { error: "bad action" };
  })
  // ── comments ───────────────────────────────────────────────────────────
  .get("/api/ig/comments", async ({ request, query, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const refresh = (query as Record<string, string | undefined>).refresh === "1";

    // refresh pulls live from Instagram — capped at 25s so it can never hang
    // the response. Cached rows are returned regardless.
    let live: { ok: boolean; newCount: number; error?: string } | null = null;
    if (refresh) {
      const r = (await Promise.race([
        tick(),
        new Promise((res) =>
          setTimeout(() => res({ newCount: 0, error: "timed out" }), 25_000)
        ),
      ])) as { newCount: number; error?: string };
      live = { ok: !r.error, newCount: r.newCount ?? 0, error: r.error };
    }

    const store = await readStore(a.ctx.accountId);
    if (!store.account) { set.status = 400; return { error: "not connected" }; }

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
  })
  // ── mentions ───────────────────────────────────────────────────────────
  .get("/api/ig/mentions", async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const s = await readStore(a.ctx.accountId);
    const list = [...(s.mentions || [])].sort((a, b) => b.ts - a.ts);
    return { mentions: list };
  })
  .post("/api/ig/mentions", async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const accountId = a.ctx.accountId;
    const s = await readStore(accountId);
    if (!s.account) { set.status = 400; return { error: "not connected" }; }
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
      set.status = 500;
      return { error: e instanceof Error ? e.message : "mentions fetch failed" };
    }
  })
  .patch("/api/ig/mentions", async ({ request, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as { id?: string; read?: boolean; all?: boolean };
    const targetRead = b.read !== false;
    await updateStoreFor(a.ctx.accountId, (s) => {
      const next = (s.mentions || []).map((m) => {
        if (b.all) return { ...m, read: targetRead };
        if (b.id && m.id === b.id) return { ...m, read: targetRead };
        return m;
      });
      return { ...s, mentions: next };
    });
    return { ok: true };
  })
  // ── commenters ─────────────────────────────────────────────────────────
  .get("/api/ig/commenters", async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const s = await readStore(a.ctx.accountId);
    const list = Object.values(s.commenters)
      .sort((a, b) => b.commentCount - a.commentCount)
      .slice(0, 100);
    return { commenters: list };
  });
