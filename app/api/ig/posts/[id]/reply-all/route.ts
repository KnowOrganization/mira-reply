import { NextRequest, NextResponse } from "next/server";
import { readStore, updateStore, type ReplyLog } from "@/lib/ig/store";
import { getMediaComments, replyToComment } from "@/lib/ig/graph";
import { tryPrivateReply } from "@/lib/ig/dm";
import { markSeen } from "@/lib/ig/seen";
import { chatJSON, chat } from "@/lib/ig/llm";
import { sanitizeReply, tooSimilar } from "@/lib/ig/variation";
import { logFeedEvent } from "@/lib/ig/feedLog";
import { publish } from "@/lib/ig/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const g = globalThis as unknown as { __mira_stop_reply_all?: boolean };

// ── types ──────────────────────────────────────────────────────────────────

type RawComment = {
  id: string;
  text?: string;
  from?: { id: string; username?: string };
  timestamp?: string;
};

type CommentClass = "link" | "laugh_cry" | "toxic" | "unrelated";

type WorkItem = {
  commentId: string;
  commentText: string;
  fromUserId: string;
  fromUsername: string;
  dmOnly: boolean; // true = already got comment reply, just needs DM
};

// ── fast pre-classifier (no LLM) ──────────────────────────────────────────

const LAUGH_EMOJI = /^[\s😂🤣😆😅😹🤭🫢🫣]*$/u;
const CRY_EMOJI   = /^[\s😭😢😿💔🥺😔😞😟🙁☹️]*$/u;
const PURE_EMOJI  = /^\p{Extended_Pictographic}[\p{Extended_Pictographic}\s\u{1F1E6}-\u{1F1FF}]*$/u;

function fastPreClassify(text: string): CommentClass | null {
  const t = text.trim();
  if (!t) return "unrelated";
  if (LAUGH_EMOJI.test(t) && /😂|🤣|😆|😅|😹/u.test(t)) return "laugh_cry";
  if (CRY_EMOJI.test(t) && /😭|😢|😿|💔|🥺/u.test(t)) return "laugh_cry";
  if (PURE_EMOJI.test(t)) return "link";
  const lower = t.toLowerCase();
  if (/\b(racist|racism|hate|kill|die|ugly|stupid|loser|scam|spam|bot|fake)\b/.test(lower)) return "toxic";
  return null;
}

// ── batch LLM classify (1 call per 25 comments) ──────────────────────────

const CLASSIFY_BATCH = 25;

async function classifyBatch(
  comments: Array<{ id: string; text: string }>,
  postCaption: string
): Promise<Record<string, CommentClass>> {
  const result: Record<string, CommentClass> = {};
  const needsLLM: typeof comments = [];

  for (const c of comments) {
    const fast = fastPreClassify(c.text);
    if (fast !== null) result[c.id] = fast;
    else needsLLM.push(c);
  }
  if (!needsLLM.length) return result;

  // Build numbered list for LLM
  const list = needsLLM.map((c, i) => `${i + 1}. [${c.id}] "${c.text.slice(0, 100)}"`).join("\n");

  try {
    const llmResult = await chatJSON<Record<string, CommentClass>>(
      [
        {
          role: "system",
          content: `Classify each Instagram comment. Post context: "${postCaption.slice(0, 150)}"

Categories:
"link"      — wants info/link/process/product. Default for most questions and interest.
"laugh_cry" — pure laughing 😂 or crying 😭 reaction, no real question.
"toxic"     — hate, spam, harassment, racism.
"unrelated" — tagging others with no interest, totally off-topic.

Reply ONLY as JSON object with comment ID as key:
{"COMMENT_ID": "link", "COMMENT_ID2": "toxic", ...}`,
        },
        { role: "user", content: list },
      ],
      Object.fromEntries(needsLLM.map((c) => [c.id, "link" as CommentClass])),
      0.1
    );
    return { ...result, ...llmResult };
  } catch {
    // LLM down — default all to "link"
    for (const c of needsLLM) result[c.id] = "link";
    return result;
  }
}

// ── semaphore for parallel sends ─────────────────────────────────────────

async function withSemaphore<T>(
  tasks: Array<() => Promise<T>>,
  concurrency = 5
): Promise<T[]> {
  const results: T[] = [];
  let i = 0;

  async function worker(): Promise<void> {
    while (i < tasks.length) {
      if (g.__mira_stop_reply_all) break;
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

// ── content pool generation (2 LLM calls total, not 80) ─────────────────

const POOL_SIZE = 40;
const recentDMOpenings: string[] = [];

const DM_FALLBACKS = [
  "Here's what you asked for!",
  "Got something for you! 🎯",
  "Just for you! ✨",
  "Dropping it right here!",
  "This one's for you! 🙌",
  "Your request, delivered!",
  "Here's the good stuff!",
  "Straight to the point! 👇",
];

const REPLY_FALLBACKS = [
  "Dropped it in your DMs! 📩",
  "Check your DMs — sent it over!",
  "It's in your inbox now! 🙌",
  "Sent it your way, check DMs!",
  "DM's on the way to you!",
  "Just messaged you the details!",
  "Shared it with you via DMs!",
  "Look out for my DM! 🙌",
  "Details sent to your inbox!",
  "Sent you the info, check DMs!",
];

async function generateDMOpeningPool(): Promise<string[]> {
  const avoid = recentDMOpenings.slice(0, 10).join(", ") || "none";
  try {
    const result = await chatJSON<{ openings: string[] }>(
      [
        {
          role: "system",
          content: `Generate exactly ${POOL_SIZE} unique short warm sentences (max 8 words each) to open a DM sharing a link.
Rules: no "Hi"/"Hey", optional 1 emoji per sentence, vary tone/phrasing completely each time, never repeat structure.
Avoid these recently used: ${avoid}.
Reply ONLY as JSON: {"openings": ["sentence1", "sentence2", ...]}`,
        },
        { role: "user", content: `Generate ${POOL_SIZE} openings.` },
      ],
      { openings: DM_FALLBACKS },
      0.95
    );
    const pool = (result.openings || []).map((s) => sanitizeReply(String(s)) || s).filter(Boolean);
    if (pool.length >= 20) {
      recentDMOpenings.unshift(...pool.slice(0, 10));
      if (recentDMOpenings.length > 50) recentDMOpenings.splice(50);
      return pool;
    }
  } catch { /* fall through */ }
  return Array.from({ length: POOL_SIZE }, (_, i) => DM_FALLBACKS[i % DM_FALLBACKS.length]);
}

async function generateCommentReplyPool(recentReplies: string[]): Promise<string[]> {
  const avoid = recentReplies.slice(0, 5).join(", ") || "none";
  try {
    const result = await chatJSON<{ replies: string[] }>(
      [
        {
          role: "system",
          content: `Generate exactly ${POOL_SIZE} unique short sentences (max 12 words each) for Instagram comments telling someone you just DM'd them.
Rules: warm, natural, no "Hi"/"Hey", no hashtags, optional 1 emoji at end, vary phrasing completely, never repeat.
Avoid these recently used: ${avoid}.
Reply ONLY as JSON: {"replies": ["reply1", "reply2", ...]}`,
        },
        { role: "user", content: `Generate ${POOL_SIZE} replies.` },
      ],
      { replies: REPLY_FALLBACKS },
      0.92
    );
    const pool = (result.replies || []).map((s) => sanitizeReply(String(s)) || s).filter(Boolean);
    if (pool.length >= 20) return pool;
  } catch { /* fall through */ }
  return Array.from({ length: POOL_SIZE }, (_, i) => REPLY_FALLBACKS[i % REPLY_FALLBACKS.length]);
}

// ── DM builder (uses pre-generated opening from pool) ────────────────────

function assembleDM(
  opening: string,
  accountUsername: string,
  linkUrl: string,
  linkLabel: string
): string {
  return `${opening}\n\nHere is your link — ${linkLabel}:\n👉 ${linkUrl}\n\nMake sure to follow @${accountUsername} for more! 🙌`;
}

// ── main handler ─────────────────────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const store = await readStore();

  if (!store.account) {
    return NextResponse.json({ error: "no account connected" }, { status: 400 });
  }

  const { accessToken, igUserId, username: accountUsername } = store.account;
  const post = store.posts[postId];

  const vaultLink = post?.links?.[0];
  if (!vaultLink?.url) {
    return NextResponse.json(
      { error: "No link in Link Vault — add one to this post first" },
      { status: 400 }
    );
  }
  const linkUrl   = vaultLink.url;
  const linkLabel = vaultLink.label || "the link";
  const postTitle = post?.caption?.slice(0, 80) || "this post";

  // ── Phase A: fetch + filter ───────────────────────────────────────────

  let rawComments: RawComment[] = [];
  try {
    const result = await getMediaComments(postId, accessToken, 50); // 50 pages × 50 = 2500 comments max
    rawComments = result.data as RawComment[];
  } catch (e) {
    return NextResponse.json({ error: `fetch failed: ${String(e)}` }, { status: 500 });
  }

  // commentIds already replied to (any post)
  const repliedMap = new Map(
    store.history.filter((h) => h.status === "sent" && h.commentId).map((h) => [h.commentId!, h])
  );
  // userIds who already received a DM for THIS post — persisted across runs, never resend
  const dmSentForPost = new Set(
    (store.postDMsSent || []).filter((x) => x.postId === postId).map((x) => x.userId)
  );
  // userIds whose DMs are permanently blocked (archived/restricted)
  const dmBlockedIds = new Set(
    (store.dmBlocked || []).map((x) => x.userId)
  );
  const recentReplies = store.history.filter((h) => h.status === "sent" && h.outbound).slice(0, 50).map((h) => h.outbound);

  g.__mira_stop_reply_all = false;

  // Split into workItems
  const workItems: WorkItem[] = [];
  for (const c of rawComments) {
    if (!c.id || !c.text || !c.from?.id) continue;
    // skip own account (check both ID and username)
    if (c.from.id === igUserId || c.from.id === String(igUserId)) continue;
    if (c.from.username && c.from.username.toLowerCase() === accountUsername.toLowerCase()) continue;
    const alreadyDMed    = dmSentForPost.has(c.from.id); // already got DM for this post
    const alreadyReplied = repliedMap.has(c.id);          // this exact comment already replied

    // already got DM for this post → skip entirely
    if (alreadyDMed) continue;
    // permanently blocked (archived/restricted) → skip forever
    if (dmBlockedIds.has(c.from.id)) continue;

    // comment already replied but no DM yet → DM only
    const dmOnly = alreadyReplied && !alreadyDMed;

    workItems.push({
      commentId: c.id,
      commentText: c.text,
      fromUserId: c.from.id,
      fromUsername: c.from.username || c.from.id,
      dmOnly,
    });
  }

  publish({ type: "log", level: "info", msg: `reply-all: ${workItems.length} comments to process`, ts: Date.now() });

  // ── Phase B+C: classify + generate pools in parallel ────────────────

  const newItems    = workItems.filter((w) => !w.dmOnly);
  const dmOnlyItems = workItems.filter((w) => w.dmOnly);

  // Build classify batches
  const classifyBatches: Array<{ id: string; text: string }[]> = [];
  for (let i = 0; i < newItems.length; i += CLASSIFY_BATCH) {
    classifyBatches.push(
      newItems.slice(i, i + CLASSIFY_BATCH).map((w) => ({ id: w.commentId, text: w.commentText }))
    );
  }

  // Run ALL classification batches + pool generation simultaneously
  // Ollama queues requests — overlap is free, total LLM time unchanged
  const caption = post?.caption || "";
  const [classifyResults, dmOpeningPool, commentReplyPool] = await Promise.all([
    Promise.all(classifyBatches.map((b) => classifyBatch(b, caption))),
    generateDMOpeningPool(),
    generateCommentReplyPool(recentReplies),
  ]);

  const classifyMap: Record<string, CommentClass> = {};
  for (const r of classifyResults) Object.assign(classifyMap, r);

  // undefined = LLM missed the ID → default to "link" (safe fallback)
  const linkItems = newItems.filter((w) => (classifyMap[w.commentId] ?? "link") === "link");
  const skipItems = newItems.filter((w) => (classifyMap[w.commentId] ?? "link") !== "link");

  publish({ type: "log", level: "info", msg: `classified: ${linkItems.length} link, ${skipItems.length} skip, ${dmOnlyItems.length} dm-only`, ts: Date.now() });

  // Log skips fire-and-forget
  for (const w of skipItems) {
    logFeedEvent({ kind: "skipped", username: w.fromUsername, userId: w.fromUserId, detail: `${classifyMap[w.commentId]}: ${w.commentText.slice(0, 50)}`, ts: Date.now() }).catch(() => {});
  }

  const totalNeedingContent = linkItems.length + dmOnlyItems.length;
  if (totalNeedingContent === 0) {
    return NextResponse.json({ processed: workItems.length, replied: 0, skipped: skipItems.length, dmSent: 0 });
  }

  let dmOpeningIdx    = 0;
  let commentReplyIdx = 0;

  function nextDMOpening(): string {
    const o = dmOpeningPool[dmOpeningIdx % dmOpeningPool.length] || "Here's what you asked for!";
    dmOpeningIdx++;
    return o;
  }

  function nextCommentReply(): string {
    const r = commentReplyPool[commentReplyIdx % commentReplyPool.length] || "Dropped it in your DMs! 📩";
    commentReplyIdx++;
    return r;
  }

  // ── Phase D: parallel sends (semaphore=5) ────────────────────────────

  let replied = 0, dmSent = 0;
  const pendingLogs: ReplyLog[] = [];

  // dedupe by userId — same user may have multiple comments, send DM only once
  const seenUserIds = new Set<string>();
  const allSendItems = [...linkItems, ...dmOnlyItems].filter((w) => {
    if (seenUserIds.has(w.fromUserId)) return false;
    seenUserIds.add(w.fromUserId);
    return true;
  });

  const tasks = allSendItems.map((w) => async () => {
    if (g.__mira_stop_reply_all) return;

    const dm = assembleDM(nextDMOpening(), accountUsername, linkUrl, linkLabel);

    // retry with smart backoff: pause 60s on rate limit 613, skip permanently on 400 blocked
    let dmResult: { ok: boolean; reason?: string } = { ok: false, reason: "not attempted" };
    for (let attempt = 0; attempt < 3; attempt++) {
      dmResult = await tryPrivateReply(w.commentId, w.fromUserId, dm);
      if (dmResult.ok) break;

      const reason = dmResult.reason || "";
      // 400 archived/blocked → permanent failure, record and don't retry
      if (reason.includes('"code":400') || reason.includes('400 {')) {
        updateStore((s) => ({
          ...s,
          dmBlocked: [...(s.dmBlocked || []), { userId: w.fromUserId, reason: reason.slice(0, 100), ts: Date.now() }].slice(-5000),
        })).catch(() => {});
        break;
      }
      // 613 rate limit → pause 60s then retry once
      if (reason.includes('"code":613') || reason.includes('613')) {
        publish({ type: "log", level: "warn", msg: `Rate limit hit — pausing 60s`, ts: Date.now() });
        await new Promise((r) => setTimeout(r, 60000));
        continue;
      }
      // generic 500 → wait 2s / 4s
      if (attempt < 2) await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }

    // fire-and-forget feed log — don't block on store write
    logFeedEvent({
      kind: dmResult.ok ? "link_sent" : "skipped",
      username: w.fromUsername,
      userId: w.fromUserId,
      postTitle: linkLabel.slice(0, 40),
      detail: dmResult.ok ? "link sent" : `failed: ${dmResult.reason}`,
      ts: Date.now(),
    }).catch(() => {});
    publish({ type: "log", level: dmResult.ok ? "info" : "warn", msg: `DM @${w.fromUsername}: ${dmResult.ok ? "ok" : dmResult.reason}`, ts: Date.now() });

    if (!dmResult.ok) return;
    dmSent++;

    // persist that this user got a DM for this post — prevents resend in future runs
    updateStore((s) => ({
      ...s,
      postDMsSent: [...(s.postDMsSent || []), { userId: w.fromUserId, postId }].slice(-10000),
    })).catch(() => {});

    if (w.dmOnly) return; // already has comment reply

    // comment reply
    const commentReply = nextCommentReply();
    let commentReplySent = false;
    try {
      await replyToComment(w.commentId, commentReply, accessToken);
      markSeen(w.commentId);
      commentReplySent = true;
      replied++;
    } catch (e) {
      publish({ type: "log", level: "error", msg: `comment reply failed @${w.fromUsername}: ${String(e)}`, ts: Date.now() });
    }

    pendingLogs.push({
      id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      kind: "comment",
      commentId: w.commentId,
      inbound: w.commentText,
      outbound: commentReply,
      intent: "link_request",
      postId,
      toUserId: w.fromUserId,
      sentAt: Date.now(),
      status: commentReplySent ? "sent" : "failed",
    });

    if (commentReplySent) {
      logFeedEvent({ kind: "comment_replied", username: w.fromUsername, userId: w.fromUserId, postTitle: postTitle.slice(0, 40), detail: commentReply, ts: Date.now() }).catch(() => {});
    }
  });

  await withSemaphore(tasks, 3);

  // ── Phase E: single batch store write ────────────────────────────────

  if (pendingLogs.length > 0) {
    await updateStore((s) => ({
      ...s,
      history: [...pendingLogs, ...s.history].slice(0, 10000),
    }));
  }

  return NextResponse.json({
    processed: workItems.length,
    replied,
    skipped: skipItems.length,
    dmSent,
  });
}
