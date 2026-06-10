import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { ig } from "@/lib/ig/config";
import { readStore, updateStore } from "@/lib/ig/store";
import {
  getCommentInfo,
  getMentionedComment,
  getMentionedMedia,
} from "@/lib/ig/graph";
import type { Mention } from "@/lib/ig/store";
import { processInbound } from "@/lib/ig/pipeline";
import { matchAutomations, executeAutomation, resumeAutomationAfterFollow, resumeAutomationAfterButtonClick, type AutomationEvent } from "@/lib/ig/automation";
import { publish } from "@/lib/ig/bus";
import { seenComment } from "@/lib/ig/seen";
import { tryDM, tryPrivateReply } from "@/lib/ig/dm";
import { logFeedEvent } from "@/lib/ig/feedLog";
import {
  getPostConfigByPostId,
  isCommentProcessed,
  markCommentProcessed,
  getUserState,
  upsertUserState,
  setUserStateDelivered,
  insertLog,
} from "@/lib/ig/db";
import { checkFollowStatus } from "@/lib/ig/followCheck";
import { messageQueue } from "@/lib/ig/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === ig.verifyToken && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("forbidden", { status: 403 });
}

function verifySignature(raw: string, sigHeader: string | null) {
  if (!sigHeader || !ig.appSecret) return false;
  const sig = sigHeader.replace(/^sha256=/, "");
  const expected = crypto.createHmac("sha256", ig.appSecret).update(raw).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

type WebhookPayload = {
  object?: string;
  entry?: Array<{
    id: string;
    time: number;
    changes?: Array<{
      field: string;
      value: {
        from?: { id: string; username?: string };
        media?: { id: string; media_product_type?: string };
        id?: string;
        text?: string;
      };
    }>;
    messaging?: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: { mid: string; text?: string };
      postback?: { payload: string; title: string };
    }>;
  }>;
};

function enqueueLink(igsid: string, postConfigId: string, config: { link_msg?: string | null; link_url?: string | null; button_label: string }, _token: string) {
  const text = config.link_msg || "Here it is! 🎉 Enjoy!";
  const url = config.link_url;
  messageQueue.enqueue({
    id: `link_${igsid}_${Date.now()}`,
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

export async function POST(req: NextRequest) {
  const raw = await req.text();
  // dump every incoming webhook for debug
  try {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    const path = await import("node:path");
    const dir = path.join(os.homedir(), ".mira", "webhook-logs");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, `${Date.now()}.json`),
      JSON.stringify(
        {
          ts: Date.now(),
          headers: Object.fromEntries(req.headers.entries()),
          raw,
        },
        null,
        2
      )
    );
  } catch {}

  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) {
    publish({ type: "log", level: "warn", msg: `Webhook signature invalid: ${raw.slice(0, 150)}`, ts: Date.now() });
    return new Response("invalid signature", { status: 403 });
  }
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(raw) as WebhookPayload;
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const store = await readStore();
  const token = store.account?.accessToken;

  publish({ type: "log", level: "info", msg: `webhook received: ${raw.slice(0, 200)}`, ts: Date.now() });

  // Normalize payload — Meta test button sends raw {field, value}, prod sends {entry:[{changes:[...]}]}
  type Change = {
    field: string;
    value: {
      from?: { id: string; username?: string };
      media?: { id: string };
      id?: string;
      text?: string;
      comment_id?: string;
      media_id?: string;
    };
  };
  const normalized: { changes: Change[]; messaging: NonNullable<WebhookPayload["entry"]>[number]["messaging"] }[] = [];
  if (Array.isArray(payload.entry)) {
    for (const e of payload.entry) {
      normalized.push({ changes: e.changes ?? [], messaging: e.messaging ?? [] });
    }
  } else if ((payload as unknown as Change).field) {
    normalized.push({ changes: [payload as unknown as Change], messaging: [] });
  }

  for (const entry of normalized) {
    for (const ch of entry.changes) {
      if (ch.field === "comments" && token) {
        const v = ch.value;
        let text = v.text;
        let fromId = v.from?.id;
        let fromUsername = v.from?.username;
        if (!text && v.id) {
          try {
            const info = (await getCommentInfo(v.id, token)) as {
              text?: string;
              username?: string;
              from?: { id: string };
            };
            text = info.text;
            fromId = fromId || info.from?.id;
            fromUsername = fromUsername || info.username;
          } catch {}
        }
        if (text && fromId && v.id) {
          const cid = v.id;
          const ctext = text;
          const cfrom = fromId;
          const cmedia = v.media?.id;
          if (!cmedia) publish({ type: "log", level: "warn", msg: `webhook: comment ${cid} — v.media.id missing; postId-based automation matching will fail`, ts: Date.now() });
          // shared dedup — skip if the poll (or an earlier webhook) got it first
          if (seenComment(cid)) continue;
          publish({
            type: "comment",
            commentId: cid,
            mediaId: cmedia || "",
            fromUserId: cfrom,
            fromUsername,
            text: ctext,
            ts: Date.now(),
          });
          // cache a stub so the poll's cold-start dedup also skips it
          updateStore((s) => ({
            ...s,
            commentsCache: s.commentsCache.some((c) => c.id === cid)
              ? s.commentsCache
              : [
                  {
                    id: cid,
                    postId: cmedia || "",
                    postCaption: "",
                    text: ctext,
                    fromUserId: cfrom,
                    fromUsername: fromUsername || "",
                    timestamp: new Date().toISOString(),
                    ts: Date.now(),
                    isOwn: false,
                  },
                  ...s.commentsCache,
                ].slice(0, 5000),
          })).catch(() => {});
          // ── New SQLite-based automation (post_configs) ───────────────────
          let handledByNewAutomation = false;
          if (cmedia && token) {
            try {
              const config = getPostConfigByPostId(cmedia);
              const ownId = store.account?.igUserId;
              if (config && cfrom !== ownId && !isCommentProcessed(cid)) {
                const kws: string[] = config.keywords;
                const matches = kws.length === 0 || kws.some((k) => ctext.toLowerCase().includes(k.toLowerCase()));
                if (matches) {
                  handledByNewAutomation = true;
                  markCommentProcessed(cid, cfrom, config.id);
                  upsertUserState({ igsid: cfrom, post_id: config.id, comment_id: cid, state: "awaiting_tap", payload: null });
                  insertLog({ direction: "in", event_type: "comment", igsid: cfrom, post_id: config.id, payload: JSON.stringify({ commentId: cid, text: ctext }), status: "matched", error: null });
                  // Private reply with button — opens 24h messaging window
                  messageQueue.enqueue({
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
                  publish({ type: "log", level: "info", msg: `automation: queued private reply for @${fromUsername ?? cfrom} on post ${cmedia}`, ts: Date.now() });
                }
              }
            } catch (e) {
              publish({ type: "log", level: "error", msg: `automation comment: ${String(e)}`, ts: Date.now() });
            }
          }

          // ── Legacy automation + Mira pipeline (only if new automation didn't handle it) ──
          if (!handledByNewAutomation) {
            const evt: AutomationEvent = { type: "comment_post", commentId: cid, fromUserId: cfrom, fromUsername, text: ctext, postId: cmedia };
            const matched = matchAutomations(store, evt);
            if (matched.length > 0) {
              (async () => {
                for (const auto of matched) {
                  await executeAutomation(auto, evt).catch((e) =>
                    publish({ type: "log", level: "error", msg: `automation: ${String(e)}`, ts: Date.now() })
                  );
                }
              })();
            } else {
              processInbound({
                kind: "comment",
                threadOrMediaId: cid,
                fromUserId: cfrom,
                fromUsername,
                text: ctext,
                postId: cmedia,
              }).catch((e) =>
                publish({ type: "log", level: "error", msg: `pipeline: ${String(e)}`, ts: Date.now() })
              );
            }
          }
        }
      }
      if (ch.field === "mentions" && token && store.account) {
        const v = ch.value as {
          comment_id?: string;
          media_id?: string;
          media?: { id?: string };
        };
        const igUserId = store.account.igUserId;
        const commentId = v.comment_id;
        const mediaId = v.media_id || v.media?.id;

        try {
          if (commentId) {
            const r = (await getMentionedComment(
              igUserId,
              commentId,
              token
            )) as {
              mentioned_comment?: {
                id?: string;
                text?: string;
                username?: string;
                timestamp?: string;
                media?: { id?: string; permalink?: string; caption?: string };
              };
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
              await updateStore((s) => {
                const map = new Map(
                  (s.mentions || []).map((x) => [x.id, x])
                );
                map.set(mention.id, mention);
                return { ...s, mentions: Array.from(map.values()).slice(0, 500) };
              });
              publish({
                type: "log",
                level: "info",
                msg: `mention (comment) from @${mc.username || "unknown"}`,
                ts: Date.now(),
              });
            }
          } else if (mediaId) {
            const r = (await getMentionedMedia(
              igUserId,
              mediaId,
              token
            )) as {
              mentioned_media?: {
                id?: string;
                caption?: string;
                media_type?: string;
                permalink?: string;
                thumbnail_url?: string;
                media_url?: string;
                timestamp?: string;
                username?: string;
              };
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
              await updateStore((s) => {
                const map = new Map(
                  (s.mentions || []).map((x) => [x.id, x])
                );
                map.set(mention.id, mention);
                return { ...s, mentions: Array.from(map.values()).slice(0, 500) };
              });
              publish({
                type: "log",
                level: "info",
                msg: `mention (caption) from @${mm.username || "unknown"}`,
                ts: Date.now(),
              });
            }
          }
        } catch (e) {
          publish({
            type: "log",
            level: "error",
            msg: `mention fetch: ${String(e)}`,
            ts: Date.now(),
          });
        }
      }
      // ── follow events ──────────────────────────────────────────────────
      if (ch.field === "follows" && ch.value?.from?.id) {
        const followerId = ch.value.from.id;
        const followerUsername = ch.value.from.username;

        // add to follower cache
        await updateStore((s) => {
          const existing = (s.followerCache || []).find((f) => f.userId === followerId);
          if (existing) return s;
          return {
            ...s,
            followerCache: [
              ...(s.followerCache || []),
              { userId: followerId, username: followerUsername, followedAt: Date.now() },
            ].slice(-2000),
          };
        });

        publish({ type: "log", level: "info", msg: `follow: @${followerUsername || followerId} now following`, ts: Date.now() });

        // check linkPending — send link if we owe them one
        const freshStore = await readStore();
        const pending = (freshStore.linkPending || []).find((p) => p.userId === followerId);
        if (pending && freshStore.account) {
          const post = freshStore.posts[pending.postId];
          const postTitle = post?.caption?.slice(0, 60) || "this post";
          const linkText = post?.permalink
            ? `Here it is! 🎉\n\n${postTitle}\n👉 ${post.permalink}\n\nHope this helps! Thanks for the support 🙌`
            : `Here it is! 🎉\n\n${postTitle}\n\nHope this helps! Thanks for the support 🙌`;

          const r = await tryPrivateReply(pending.commentId, followerId, linkText);

          await updateStore((s) => ({
            ...s,
            linkPending: (s.linkPending || []).filter((p) => p.userId !== followerId),
          }));

          await logFeedEvent({
            kind: "link_sent",
            username: followerUsername || followerId,
            userId: followerId,
            postTitle: postTitle.slice(0, 40),
            detail: r.ok ? "link sent after follow" : `failed: ${r.reason}`,
            ts: Date.now(),
          });

          publish({ type: "log", level: "info", msg: `follow→link sent @${followerUsername || followerId}`, ts: Date.now() });
        }

        // resume any automation follow_gate waiting for this user
        resumeAutomationAfterFollow(followerId, followerUsername).catch((e) =>
          publish({ type: "log", level: "error", msg: `automation follow_gate resume: ${String(e)}`, ts: Date.now() })
        );
      }
    }

    // ── DM messages + postbacks ───────────────────────────────────────────
    for (const m of entry.messaging ?? [] as NonNullable<typeof entry.messaging>) {
      // ── postback button click ──────────────────────────────────────────
      if (m.postback) {
        const fromId = m.sender.id;
        const pbPayload = m.postback.payload;
        publish({ type: "log", level: "info", msg: `postback from ${fromId}: "${pbPayload}"`, ts: Date.now() });
        insertLog({ direction: "in", event_type: "postback", igsid: fromId, post_id: null, payload: JSON.stringify({ payload: pbPayload, title: m.postback.title }), status: "received", error: null });

        // ── New automation postbacks (GET_LINK_ / RECHECK_FOLLOW_) ──────
        const getLink = pbPayload.match(/^GET_LINK_(.+)$/);
        const recheck = pbPayload.match(/^RECHECK_FOLLOW_(.+)$/);
        const newAutomationPayload = getLink ?? recheck;
        if (newAutomationPayload && token) {
          const postConfigId = newAutomationPayload[1];
          void (async () => {
            try {
              const { getPostConfigById } = await import("@/lib/ig/db");
              const config = getPostConfigById(postConfigId);
              if (!config) return;
              const userState = getUserState(fromId, postConfigId);
              if (userState?.state === "delivered") return; // already sent, ignore

              if (!config.follow_gate) {
                // No follow gate — deliver link immediately
                setUserStateDelivered(fromId, postConfigId);
                enqueueLink(fromId, postConfigId, config, token);
                return;
              }

              const isFollowing = await checkFollowStatus(fromId, token);
              publish({ type: "log", level: "info", msg: `follow check @${fromId}: ${isFollowing}`, ts: Date.now() });

              if (isFollowing) {
                setUserStateDelivered(fromId, postConfigId);
                enqueueLink(fromId, postConfigId, config, token);
              } else {
                upsertUserState({ igsid: fromId, post_id: postConfigId, comment_id: userState?.comment_id ?? "", state: "awaiting_follow", payload: pbPayload });
                const acct = store.account;
                const uname = acct?.username ?? "";
                messageQueue.enqueue({
                  id: `retry_${fromId}_${Date.now()}`,
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
            } catch (e) {
              publish({ type: "log", level: "error", msg: `postback automation: ${String(e)}`, ts: Date.now() });
            }
          })();
          continue;
        }

        // ── Legacy automation postbacks ──────────────────────────────────
        const pbStore = await readStore();
        const followPending = (pbStore.automationFollowPending ?? []).find(
          (p) => p.fromUserId === fromId && Date.now() - p.ts < 24 * 60 * 60_000
        );
        if (followPending && /^done$/i.test(pbPayload)) {
          resumeAutomationAfterFollow(fromId, followPending.fromUsername).catch((e) =>
            publish({ type: "log", level: "error", msg: `postback follow resume: ${String(e)}`, ts: Date.now() })
          );
          continue;
        }
        const buttonPending = (pbStore.automationButtonPending ?? []).find(
          (p) => p.fromUserId === fromId && Date.now() - p.ts < 24 * 60 * 60_000
        );
        if (buttonPending) {
          resumeAutomationAfterButtonClick(fromId, buttonPending.fromUsername).catch((e) =>
            publish({ type: "log", level: "error", msg: `postback button resume: ${String(e)}`, ts: Date.now() })
          );
        }
        continue;
      }

      const text = m.message?.text;
      if (text) {
        publish({
          type: "message",
          messageId: m.message!.mid,
          fromUserId: m.sender.id,
          text,
          ts: m.timestamp,
        });

        const fromId = m.sender.id;

        // ── button-gate resume — highest priority ─────────────────────────
        const freshStore2 = await readStore();
        const buttonPending = (freshStore2.automationButtonPending ?? []).find(
          (p) => p.fromUserId === fromId && Date.now() - p.ts < 24 * 60 * 60_000
        );
        if (buttonPending) {
          publish({ type: "log", level: "info", msg: `dm: button-click from @${buttonPending.fromUsername ?? fromId} — resuming automation ${buttonPending.automationId}`, ts: Date.now() });
          resumeAutomationAfterButtonClick(fromId, buttonPending.fromUsername).catch((e) =>
            publish({ type: "log", level: "error", msg: `automation button resume: ${String(e)}`, ts: Date.now() })
          );
          // don't fall through to pipeline/DM-trigger matching
        } else {
        // check if this is a follow-confirm DM reply
        const FOLLOW_CONFIRM = /\b(send|yes|yep|done|following|followed|follow(ed)?|ok|okay|sure|ready)\b/i;
        const pending = (freshStore2.linkPending || []).find((p) => p.userId === fromId);

        if (pending && FOLLOW_CONFIRM.test(text) && freshStore2.account) {
          const post = freshStore2.posts[pending.postId];
          const postTitle = post?.caption?.slice(0, 60) || "this post";
          const linkText = post?.permalink
            ? `Here it is! 🎉\n\n${postTitle}\n👉 ${post.permalink}\n\nHope this helps! Thanks for the support 🙌`
            : `Here it is! 🎉\n\n${postTitle}\n\nHope this helps! Thanks for the support 🙌`;

          const r = await tryPrivateReply(pending.commentId, fromId, linkText);

          await updateStore((s) => ({
            ...s,
            linkPending: (s.linkPending || []).filter((p) => p.userId !== fromId),
          }));

          await logFeedEvent({
            kind: "link_sent",
            username: pending.username || fromId,
            userId: fromId,
            postTitle: postTitle.slice(0, 40),
            detail: r.ok ? "link sent after DM confirm" : `failed: ${r.reason}`,
            ts: Date.now(),
          });

          publish({ type: "log", level: "info", msg: `dm-confirm→link sent @${pending.username || fromId}`, ts: Date.now() });
          // also check automation follow_gate pending
          resumeAutomationAfterFollow(fromId).catch(() => {});
        } else {
          // not a link-confirm — pass to normal pipeline
          processInbound({
            kind: "dm",
            threadOrMediaId: m.message!.mid,
            fromUserId: fromId,
            text,
          }).catch((e) =>
            publish({ type: "log", level: "error", msg: `pipeline: ${String(e)}`, ts: Date.now() })
          );
          // automation matching for DM trigger
          {
            const freshStore3 = await readStore();
            const evt: AutomationEvent = { type: "dm", commentId: m.message!.mid, fromUserId: fromId, text };
            const matched = matchAutomations(freshStore3, evt);
            for (const auto of matched) {
              executeAutomation(auto, evt).catch((e) =>
                publish({ type: "log", level: "error", msg: `automation: ${String(e)}`, ts: Date.now() })
              );
            }
          }
        }
        } // end else (not button-pending)
      }
    }
  }

  return NextResponse.json({ ok: true });
}
