import { matchAutomations, executeAutomation, resumeAutomationAfterButtonClick, resumeAutomationAfterFollow, type AutomationEvent } from "./automation";
import { listAutomations } from "./accountsRepo";
import { claimOwned, isClaimed, k, bumpCounter, withLock } from "./redis";
import { processDM } from "./dmPipeline";
import { handleStorePostback } from "./storeDM";
import { readStore, updateStoreFor, type IgStore, type Mention } from "./store";
import { getCommentInfo, getMentionedComment, getMentionedMedia } from "./graph";
import { processInbound } from "./pipeline";
import { publish } from "./bus";
import { tryPrivateReply } from "./dm";
import { logFeedEvent } from "./feedLog";
import { checkFollowStatus } from "./followCheck";
import { enqueueOutbound } from "./ingestQueue";
import { markWebhookEventProcessed, markWebhookEventError } from "./webhookEvents";
import {
  getPostConfigById,
  getPostConfigByPostId,
  isCommentProcessed,
  markCommentProcessed,
  getUserState,
  upsertUserState,
  setUserStateDelivered,
  insertLog,
} from "./db";

// One ingested event = one comment/DM/postback/follow/mention for one account.
// The webhook receiver and the 60s reconciler enqueue these; the worker calls
// processIngestJob — the ONLY place inbound events are processed. All the
// business logic that used to run inline in app/api/ig/webhook/route.ts lives
// here now, off the request path.

export type IngestJob =
  | { accountId: string; kind: "comment"; eventKey: string; data: { commentId: string; mediaId?: string; fromId?: string; fromUsername?: string; text?: string; tsMs?: number } }
  | { accountId: string; kind: "message"; eventKey: string; data: { mid: string; fromId: string; text: string; tsMs?: number } }
  | { accountId: string; kind: "postback"; eventKey: string; data: { fromId: string; payload: string; title?: string } }
  | { accountId: string; kind: "follow"; eventKey: string; data: { followerId: string; followerUsername?: string } }
  | { accountId: string; kind: "mention"; eventKey: string; data: { commentId?: string; mediaId?: string } };

// comments older than this get cached but never auto-actioned — replying to a
// stale backlog (reconciler catch-up after long downtime) is spam + ban risk.
const ACTION_WINDOW_MS = 48 * 60 * 60 * 1000;
const SEEN_TTL = 7 * 24 * 3600; // dedup claims outlive Meta's 36h retry window

const FOLLOW_CONFIRM = /\b(send|yes|yep|done|following|followed|ok|okay|sure|ready)\b/i;

export async function processIngestJob(job: IngestJob): Promise<void> {
  try {
    switch (job.kind) {
      case "comment": await processComment(job); break;
      case "message": await processMessage(job); break;
      case "postback": await processPostback(job); break;
      case "follow": await processFollow(job); break;
      case "mention": await processMention(job); break;
    }
    bumpCounter(job.accountId, "processed");
    markWebhookEventProcessed(job.eventKey).catch(() => {});
  } catch (e) {
    markWebhookEventError(job.eventKey, String(e)).catch(() => {});
    throw e; // let BullMQ retry → DLQ after final attempt
  }
}

function enqueueLinkDM(accountId: string, igsid: string, postConfigId: string, config: { link_msg?: string | null; link_url?: string | null }) {
  const text = config.link_msg || "Here it is! 🎉 Enjoy!";
  const url = config.link_url;
  return enqueueOutbound({
    accountId,
    id: `link_${igsid}_${postConfigId}`,
    type: "dm",
    recipient: { id: igsid },
    message: url
      ? {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text,
              buttons: [{ type: "web_url", url, title: "Get the link 🔗" }],
            },
          },
        }
      : { text },
    igsid,
    postId: postConfigId,
  });
}

/* ── comments ──────────────────────────────────────────────────────────────── */

async function processComment(job: Extract<IngestJob, { kind: "comment" }>) {
  const { accountId, data } = job;
  const cid = data.commentId;

  // durable cross-worker dedup; a retry of THIS job re-enters (claimOwned)
  if (!(await claimOwned(k.seen(accountId, cid), job.eventKey, SEEN_TTL))) {
    bumpCounter(accountId, "deduped");
    return;
  }

  // Already answered? (deleted-then-repolled comment, reconciler catch-up after
  // the in-memory seen set was wiped by a restart.) The send-claim is the
  // source of truth — never run the pipeline twice for one comment.
  if (await isClaimed(k.replied(accountId, `c_${cid}`))) {
    bumpCounter(accountId, "deduped");
    return;
  }

  const store = await readStore(accountId);
  const token = store.account?.accessToken;
  if (!store.account || !token) return;
  // Webhook from.id is IG-scoped, not app-scoped — compare against the right ID
  // space or this never matches and the bot replies to its own replies forever.
  const ownId = store.account.igScopedUserId ?? store.account.igUserId;

  let text = data.text;
  let fromId = data.fromId;
  let fromUsername = data.fromUsername;
  // webhook stubs sometimes omit text/from — enrich via Graph (off request path)
  if ((!text || !fromId) && cid) {
    try {
      const info = (await getCommentInfo(cid, token)) as { text?: string; username?: string; from?: { id: string } };
      text = text || info.text;
      fromId = fromId || info.from?.id;
      fromUsername = fromUsername || info.username;
    } catch {}
  }
  if (!text || !fromId) return;
  if (fromId === ownId) return; // own comment/reply

  const cmedia = data.mediaId;
  if (!cmedia) publish({ type: "log", level: "warn", msg: `ingest: comment ${cid} — media id missing; postId-based automation matching will fail`, ts: Date.now() });

  publish({ type: "comment", commentId: cid, mediaId: cmedia || "", fromUserId: fromId, fromUsername, text, ts: Date.now() });

  // cache (replaces the old webhook stub write; reconciler enriches later)
  const ctext = text, cfrom = fromId, cuser = fromUsername;
  await updateStoreFor(accountId, (s: IgStore) => ({
    ...s,
    commentsCache: s.commentsCache.some((c) => c.id === cid)
      ? s.commentsCache
      : [
          { id: cid, postId: cmedia || "", postCaption: "", text: ctext, fromUserId: cfrom, fromUsername: cuser || "", timestamp: new Date(data.tsMs || Date.now()).toISOString(), ts: data.tsMs || Date.now(), isOwn: false },
          ...s.commentsCache,
        ].slice(0, 5000),
  })).catch(() => {});

  // stale backlog — cache only, never auto-act
  if (data.tsMs && Date.now() - data.tsMs > ACTION_WINDOW_MS) return;

  // ── node-graph automations (highest priority) ─────────────────────────────
  // Canvas-builder automations run first. post_configs only fire if no
  // node-graph automation matched — prevents double-responses on the same post.
  const evt: AutomationEvent = { type: "comment_post", commentId: cid, fromUserId: cfrom, fromUsername: cuser, text: ctext, postId: cmedia };
  const automations = await listAutomations(accountId);
  const matched = matchAutomations({ ...store, automations } as IgStore, evt);
  if (matched.length > 0) {
    for (const auto of matched) {
      await executeAutomation(auto, evt, { accountId }).catch((e) =>
        publish({ type: "log", level: "error", msg: `ingest automation [${auto.id}]: ${String(e)}`, ts: Date.now() })
      );
    }
    return;
  }

  // ── post_configs funnel (fallback when no node-graph automation matched) ──
  let handledByPostConfig = false;
  if (cmedia) {
    const config = await getPostConfigByPostId(accountId, cmedia);
    if (config && !(await isCommentProcessed(accountId, cid))) {
      const kws: string[] = config.keywords;
      const matches = kws.length === 0 || kws.some((kw) => ctext.toLowerCase().includes(kw.toLowerCase()));
      if (matches) {
        handledByPostConfig = true;
        await markCommentProcessed(accountId, cid, cfrom, config.id);
        await upsertUserState(accountId, { igsid: cfrom, post_id: config.id, comment_id: cid, state: "awaiting_tap", payload: null });
        await insertLog(accountId, { direction: "in", event_type: "comment", igsid: cfrom, post_id: config.id, payload: JSON.stringify({ commentId: cid, text: ctext }), status: "matched", error: null });
        await enqueueOutbound({
          accountId,
          id: `pr_${cid}`,
          type: "private_reply",
          recipient: { comment_id: cid },
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "button",
                text: config.welcome_msg,
                buttons: [{ type: "postback", title: config.button_label.slice(0, 20), payload: `GET_LINK_${config.id}` }],
              },
            },
          },
          igsid: cfrom,
          postId: config.id,
        });
        publish({ type: "log", level: "info", msg: `post_config: queued private reply for @${cuser ?? cfrom} on post ${cmedia}`, ts: Date.now() });
      }
    }
  }

  // ── AI pipeline (fallback when nothing else matched) ──────────────────────
  if (!handledByPostConfig) {
    await processInbound({ accountId, kind: "comment", threadOrMediaId: cid, fromUserId: cfrom, fromUsername: cuser, text: ctext, postId: cmedia }).catch((e) =>
      publish({ type: "log", level: "error", msg: `pipeline: ${String(e)}`, ts: Date.now() })
    );
  }
}

/* ── DM messages ───────────────────────────────────────────────────────────── */

async function processMessage(job: Extract<IngestJob, { kind: "message" }>) {
  const { accountId, data } = job;
  const { mid, fromId, text } = data;
  if (!text) return;

  if (!(await claimOwned(k.seen(accountId, mid), job.eventKey, SEEN_TTL))) {
    bumpCounter(accountId, "deduped");
    return;
  }

  publish({ type: "message", messageId: mid, fromUserId: fromId, text, ts: data.tsMs || Date.now() });

  // button-gate resume — highest priority; claimPending (atomic) is the gate
  const resumedButton = await resumeAutomationAfterButtonClick(fromId, undefined, accountId).catch((e) => {
    publish({ type: "log", level: "error", msg: `automation button resume: ${String(e)}`, ts: Date.now() });
    return false;
  });
  if (resumedButton) {
    publish({ type: "log", level: "info", msg: `dm: button-click resume for @${fromId}`, ts: Date.now() });
    return;
  }

  const store = await readStore(accountId);
  const pending = (store.linkPending || []).find((p) => p.userId === fromId);

  if (pending && FOLLOW_CONFIRM.test(text) && store.account) {
    const post = store.posts[pending.postId];
    const postTitle = post?.caption?.slice(0, 60) || "this post";
    const linkText = post?.permalink
      ? `Here it is! 🎉\n\n${postTitle}\n👉 ${post.permalink}\n\nHope this helps! Thanks for the support 🙌`
      : `Here it is! 🎉\n\n${postTitle}\n\nHope this helps! Thanks for the support 🙌`;

    const r = await tryPrivateReply(pending.commentId, fromId, linkText);
    await updateStoreFor(accountId, (s: IgStore) => ({ ...s, linkPending: (s.linkPending || []).filter((p) => p.userId !== fromId) }));
    await logFeedEvent({ kind: "link_sent", username: pending.username || fromId, userId: fromId, postTitle: postTitle.slice(0, 40), detail: r.ok ? "link sent after DM confirm" : `failed: ${r.reason}`, ts: Date.now() });
    publish({ type: "log", level: "info", msg: `dm-confirm→link sent @${pending.username || fromId}`, ts: Date.now() });
    await resumeAutomationAfterFollow(fromId, undefined, accountId).catch(() => {});
    return;
  }

  // follow-confirm without linkPending can still resume a parked follow gate
  if (FOLLOW_CONFIRM.test(text)) {
    const resumed = await resumeAutomationAfterFollow(fromId, undefined, accountId).catch(() => false);
    if (resumed) return;
  }

  // Keyword DM automations (funnels) take priority over the conversational
  // engine — if one matches, it owns the reply for this message.
  const automations = await listAutomations(accountId);
  const evt: AutomationEvent = { type: "dm", commentId: mid, fromUserId: fromId, text };
  const matched = matchAutomations({ ...store, automations } as IgStore, evt);
  if (matched.length > 0) {
    for (const auto of matched) {
      await executeAutomation(auto, evt, { accountId }).catch((e) =>
        publish({ type: "log", level: "error", msg: `automation: ${String(e)}`, ts: Date.now() })
      );
    }
    return;
  }

  // Otherwise hand off to the DM Conversation Engine. NOT serialized per
  // conversation — processDM debounces a burst itself (records every inbound, then
  // only the last replies), and the send is idempotent. Serializing here would
  // block the debounce from seeing the rest of the burst.
  await processDM({ accountId, igsid: fromId, mid, text }).catch((e) =>
    publish({ type: "log", level: "error", msg: `dmPipeline: ${String(e)}`, ts: Date.now() })
  );
}

/* ── postback button clicks ────────────────────────────────────────────────── */

async function processPostback(job: Extract<IngestJob, { kind: "postback" }>) {
  const { accountId, data } = job;
  const { fromId, payload: pbPayload } = data;

  if (!(await claimOwned(k.seen(accountId, job.eventKey), job.eventKey, SEEN_TTL))) {
    bumpCounter(accountId, "deduped");
    return;
  }

  publish({ type: "log", level: "info", msg: `postback from ${fromId}: "${pbPayload}"`, ts: Date.now() });
  await insertLog(accountId, { direction: "in", event_type: "postback", igsid: fromId, post_id: null, payload: JSON.stringify({ payload: pbPayload, title: data.title }), status: "received", error: null });

  // ── DM marketplace postbacks (STORE_ALL / STORE_CAT_<tag>) ────────────────
  if (/^STORE_/.test(pbPayload)) {
    const handled = await handleStorePostback(accountId, fromId, pbPayload).catch(() => false);
    if (handled) return;
  }

  // ── post_configs postbacks (GET_LINK_ / RECHECK_FOLLOW_) ──────────────────
  const getLink = pbPayload.match(/^GET_LINK_(.+)$/);
  const recheck = pbPayload.match(/^RECHECK_FOLLOW_(.+)$/);
  const newAutomationPayload = getLink ?? recheck;
  if (newAutomationPayload) {
    const store = await readStore(accountId);
    const token = store.account?.accessToken;
    if (!token) return;
    const postConfigId = newAutomationPayload[1];
    const config = await getPostConfigById(accountId, postConfigId);
    if (!config) return;
    const userState = await getUserState(accountId, fromId, postConfigId);
    if (userState?.state === "delivered") return; // already sent, ignore

    if (!config.follow_gate) {
      await setUserStateDelivered(accountId, fromId, postConfigId);
      await enqueueLinkDM(accountId, fromId, postConfigId, config);
      return;
    }

    const isFollowing = await checkFollowStatus(fromId, token);
    publish({ type: "log", level: "info", msg: `follow check @${fromId}: ${isFollowing}`, ts: Date.now() });

    if (isFollowing) {
      await setUserStateDelivered(accountId, fromId, postConfigId);
      await enqueueLinkDM(accountId, fromId, postConfigId, config);
    } else {
      await upsertUserState(accountId, { igsid: fromId, post_id: postConfigId, comment_id: userState?.comment_id ?? "", state: "awaiting_follow", payload: pbPayload });
      const uname = store.account?.username ?? "";
      await enqueueOutbound({
        accountId,
        id: `retry_${fromId}_${postConfigId}_${Date.now()}`,
        type: "dm",
        recipient: { id: fromId },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: config.not_following_msg.replace(/\[username\]/gi, uname),
              buttons: [
                { type: "web_url", url: `https://www.instagram.com/${uname}`, title: "Visit Profile" },
                { type: "postback", title: "I'm following ✓", payload: `RECHECK_FOLLOW_${postConfigId}` },
              ],
            },
          },
        },
        igsid: fromId,
        postId: postConfigId,
      });
    }
    return;
  }

  // ── node-graph automation postbacks — resume from Postgres-parked state ───
  if (/^done$/i.test(pbPayload)) {
    const r = await resumeAutomationAfterFollow(fromId, undefined, accountId).catch(() => false);
    if (r) return;
  }
  await resumeAutomationAfterButtonClick(fromId, undefined, accountId).catch(() => false);
}

/* ── follows ───────────────────────────────────────────────────────────────── */

async function processFollow(job: Extract<IngestJob, { kind: "follow" }>) {
  const { accountId, data } = job;
  const { followerId, followerUsername } = data;

  if (!(await claimOwned(k.seen(accountId, job.eventKey), job.eventKey, SEEN_TTL))) {
    bumpCounter(accountId, "deduped");
    return;
  }

  await updateStoreFor(accountId, (s: IgStore) => {
    const existing = (s.followerCache || []).find((f) => f.userId === followerId);
    if (existing) return s;
    return {
      ...s,
      followerCache: [...(s.followerCache || []), { userId: followerId, username: followerUsername, followedAt: Date.now() }].slice(-2000),
    };
  });

  publish({ type: "log", level: "info", msg: `follow: @${followerUsername || followerId} now following`, ts: Date.now() });

  const store = await readStore(accountId);
  const pending = (store.linkPending || []).find((p) => p.userId === followerId);
  if (pending && store.account) {
    const post = store.posts[pending.postId];
    const postTitle = post?.caption?.slice(0, 60) || "this post";
    const linkText = post?.permalink
      ? `Here it is! 🎉\n\n${postTitle}\n👉 ${post.permalink}\n\nHope this helps! Thanks for the support 🙌`
      : `Here it is! 🎉\n\n${postTitle}\n\nHope this helps! Thanks for the support 🙌`;

    const r = await tryPrivateReply(pending.commentId, followerId, linkText);
    await updateStoreFor(accountId, (s: IgStore) => ({ ...s, linkPending: (s.linkPending || []).filter((p) => p.userId !== followerId) }));
    await logFeedEvent({ kind: "link_sent", username: followerUsername || followerId, userId: followerId, postTitle: postTitle.slice(0, 40), detail: r.ok ? "link sent after follow" : `failed: ${r.reason}`, ts: Date.now() });
    publish({ type: "log", level: "info", msg: `follow→link sent @${followerUsername || followerId}`, ts: Date.now() });
  }

  await resumeAutomationAfterFollow(followerId, followerUsername, accountId).catch((e) =>
    publish({ type: "log", level: "error", msg: `automation follow_gate resume: ${String(e)}`, ts: Date.now() })
  );
}

/* ── mentions ──────────────────────────────────────────────────────────────── */

async function processMention(job: Extract<IngestJob, { kind: "mention" }>) {
  const { accountId, data } = job;
  const store = await readStore(accountId);
  const token = store.account?.accessToken;
  if (!store.account || !token) return;
  const igUserId = store.account.igUserId;
  const { commentId, mediaId } = data;

  if (commentId) {
    const r = (await getMentionedComment(igUserId, commentId, token)) as {
      mentioned_comment?: { id?: string; text?: string; username?: string; timestamp?: string; media?: { id?: string; permalink?: string; caption?: string } };
    };
    const mc = r.mentioned_comment;
    if (mc) {
      const mention: Mention = {
        id: `comment:${mc.id || commentId}`,
        kind: "comment",
        mediaId: mc.media?.id || mediaId || "",
        permalink: mc.media?.permalink,
        mediaCaption: mc.media?.caption || "",
        commentId: mc.id || commentId,
        commentText: mc.text || "",
        fromUsername: mc.username,
        ts: mc.timestamp ? new Date(mc.timestamp).getTime() : Date.now(),
        seenAt: Date.now(),
        read: false,
      };
      await updateStoreFor(accountId, (s: IgStore) => {
        const map = new Map((s.mentions || []).map((x) => [x.id, x]));
        map.set(mention.id, mention);
        return { ...s, mentions: Array.from(map.values()).slice(0, 500) };
      });
      publish({ type: "log", level: "info", msg: `mention (comment) from @${mc.username || "unknown"}`, ts: Date.now() });
    }
  } else if (mediaId) {
    const r = (await getMentionedMedia(igUserId, mediaId, token)) as {
      mentioned_media?: { id?: string; caption?: string; media_type?: string; permalink?: string; thumbnail_url?: string; media_url?: string; timestamp?: string; username?: string };
    };
    const mm = r.mentioned_media;
    if (mm) {
      const mention: Mention = {
        id: `caption:${mm.id || mediaId}`,
        kind: "caption",
        mediaId: mm.id || mediaId,
        permalink: mm.permalink,
        thumbnailUrl: mm.thumbnail_url || mm.media_url,
        mediaUrl: mm.media_url,
        mediaCaption: mm.caption || "",
        fromUsername: mm.username,
        ts: mm.timestamp ? new Date(mm.timestamp).getTime() : Date.now(),
        seenAt: Date.now(),
        read: false,
      };
      await updateStoreFor(accountId, (s: IgStore) => {
        const map = new Map((s.mentions || []).map((x) => [x.id, x]));
        map.set(mention.id, mention);
        return { ...s, mentions: Array.from(map.values()).slice(0, 500) };
      });
      publish({ type: "log", level: "info", msg: `mention (caption) from @${mm.username || "unknown"}`, ts: Date.now() });
    }
  }
}
