// Pipeline — Mira v2 orchestrator.
//
// Thin coordinator: reads store once, assembles context (cached), runs
// perception (soul read), checks memory, plans actions, executes handlers,
// applies safety gate, queues or auto-sends the result.
//
// Public API is UNCHANGED — watcher.ts and all API routes import from here.

import {
  readStore,
  updateStore,
  updateStoreFor,
  normalizeMode,
  type PendingDraft,
  type ReplyLog,
  type IgStore,
  type Settings,
  type ReplyMode,
} from "./store";
import { publish } from "./bus";
import { replyToComment } from "./graph";
import { tryPrivateReply } from "./dm";
import { primeSeen } from "./seen";
import { claimOnce, k } from "./redis";
import { recallFact } from "./knowledge";
import { firstEmoji } from "./rulebook";
import { prefilter } from "./rulebook";
import { chat } from "./llm";
import {
  awaitSendSlot,
  withinDailyCap,
  recordDailyStat,
  shouldSkipForVariety,
} from "./sender";
import { quickClassify } from "./intent";

// v2 modules
import { assembleContext, invalidateAccountCache } from "./ctx";
import { brain } from "./mcp/client";
import { perceive } from "./perception";
import { plan } from "./planner";
import { handleReply } from "./handlers/reply";
import { handleLink } from "./handlers/link";
import { handleClarify } from "./handlers/clarify";
import { handleSkip } from "./handlers/skip";

// ── Public types (unchanged) ───────────────────────────────────────────────

export type DraftInput = {
  accountId: string; // owning IG account (ig_user_id) — the tenant this inbound belongs to
  kind: "comment" | "dm";
  threadOrMediaId: string;
  fromUserId: string;
  fromUsername?: string;
  text: string;
  postId?: string;
};

// DraftDecision kept for backward compat (agent.ts, API routes reference it)
export type DraftDecision =
  | { action: "send"; text: string; intent: string; dmText?: string }
  | { action: "draft"; text: string; intent: string; reviewOnly?: boolean }
  | { action: "clarify"; question: string; kind: "context" | "link"; intent: string }
  | { action: "skip"; reason: string; intent: string; hide?: boolean };

// ── Internal helpers ───────────────────────────────────────────────────────

async function recentRepliedTo(
  userId: string,
  withinMs: number,
  s: IgStore
): Promise<boolean> {
  return s.history.some(
    (h) =>
      h.toUserId === userId &&
      h.status === "sent" &&
      Date.now() - h.sentAt < withinMs
  );
}

async function bumpCommenter(
  accountId: string,
  userId: string,
  username: string | undefined,
  s: IgStore
) {
  const ex = s.commenters[userId];
  await updateStoreFor(accountId, (st) => ({
    ...st,
    commenters: {
      ...st.commenters,
      [userId]: {
        igUserId: userId,
        username: username || ex?.username || "",
        firstSeenAt: ex?.firstSeenAt || Date.now(),
        lastSeenAt: Date.now(),
        commentCount: (ex?.commentCount || 0) + 1,
        repliedCount: ex?.repliedCount || 0,
        themes: ex?.themes || [],
      },
    },
  }));
}

async function bumpReplied(accountId: string, userId: string) {
  await updateStoreFor(accountId, (s) => {
    const ex = s.commenters[userId];
    if (!ex) return s;
    return {
      ...s,
      commenters: {
        ...s.commenters,
        [userId]: { ...ex, repliedCount: ex.repliedCount + 1 },
      },
    };
  });
}

/** The reply posture for this channel. Comments → commentMode, DMs → dmMode. */
function modeFor(settings: Settings, kind: "comment" | "dm"): ReplyMode {
  return normalizeMode(kind === "dm" ? settings.dmMode : settings.commentMode);
}

function shouldAutoSend(
  settings: Settings,
  kind: "comment" | "dm",
  reviewOnly: boolean
): boolean {
  const mode = modeFor(settings, kind);
  if (mode === "shadow") return false; // never send
  if (mode === "assisted") return false; // owner approves every reply
  if (reviewOnly) return false; // sensitive (flirty/personal) — always review
  return mode === "auto";
}

// Warm the brain MCP (account cache + KB embedding index) once per process.
void brain.warm();

// ── Main entry points (public API — unchanged) ─────────────────────────────

// No global serialization here any more. Comments run concurrently, bounded by
// the BullMQ ingest worker's concurrency; the lost-write race the old
// __mira_pipeline_chain guarded against is already handled by updateStore()'s
// serialized write queue (store.ts). Serializing every comment behind one
// promise was the "single lane" that made the second message wait on the first.
export async function processInbound(input: DraftInput): Promise<void> {
  const pd = await runPipeline(input);
  if (pd) void pacedAutoSend(pd);
}

export async function reprocessClarification(
  accountId: string,
  c: import("./store").Clarification
): Promise<void> {
  const comments = [
    {
      commentId: c.commentId || c.id,
      fromUserId: c.fromUserId,
      fromUsername: c.fromUsername,
      commentText: c.commentText,
    },
    ...(c.waiters || []),
  ];
  for (const cm of comments) {
    await processInbound({
      accountId,
      kind: "comment",
      threadOrMediaId: cm.commentId,
      fromUserId: cm.fromUserId,
      fromUsername: cm.fromUsername,
      text: cm.commentText,
      postId: c.postId,
    }).catch(() => {});
  }
}

// ── Core pipeline ──────────────────────────────────────────────────────────

async function runPipeline(input: DraftInput): Promise<PendingDraft | null> {
  // ── 1. Single store read — used everywhere below ──────────────────────────
  const store = await readStore(input.accountId);
  if (!store.account) return null;
  const settings = store.settings;

  // ── 2. Hard pre-checks (no LLM, no context needed) ───────────────────────
  if (input.fromUserId === store.account.igUserId && settings.skipOwnComments)
    return null;

  if (store.blocklist.includes(input.fromUserId)) {
    publish({
      type: "log",
      level: "info",
      msg: `Blocked ${input.fromUserId} skipped`,
      ts: Date.now(),
    });
    return null;
  }

  if (store.trustedContacts.find((c) => c.igUserId === input.fromUserId)) {
    publish({
      type: "log",
      level: "warn",
      msg: `Trusted contact ${input.fromUserId} — owner notify`,
      ts: Date.now(),
    });
    return null;
  }

  // ── 3. Structural prefilter (no LLM) ─────────────────────────────────────
  const pre = prefilter(
    input.text,
    store.account.username || "",
    settings.alwaysReply
  );
  if (pre?.action === "skip") {
    publish({
      type: "log",
      level: "info",
      msg: `Prefilter skip (${pre.reason}) @${input.fromUsername || input.fromUserId}`,
      ts: Date.now(),
    });
    return null;
  }

  // Emoji-only → react with one emoji (prefilter says "react")
  if (pre?.action === "react") {
    const raw = await chat(
      [
        {
          role: "system",
          content:
            "Reply to this Instagram comment with EXACTLY ONE emoji that fits its vibe. Output only the emoji — no words, nothing else.",
        },
        { role: "user", content: input.text },
      ],
      { temperature: 0.7 }
    );
    const text = firstEmoji(raw);
    const pd = makeDraft(input, text, "simple_acknowledgement", undefined);
    await queueDraft(pd);
    // Respect the channel mode — in assisted/shadow this stays a draft.
    return shouldAutoSend(settings, input.kind, false) ? pd : null;
  }

  // ── 4. Stats + commenter bump ──────────────────────────────────────────────
  await bumpCommenter(input.accountId, input.fromUserId, input.fromUsername, store);
  await recordDailyStat({ comments: 1 }, input.accountId);

  // ── 5. Cooldown for simple acks ───────────────────────────────────────────
  const cooldownMs = settings.cooldownMinutes * 60_000;
  if (cooldownMs > 0 && quickClassify(input.text) === "simple_acknowledgement") {
    if (await recentRepliedTo(input.fromUserId, cooldownMs, store)) {
      publish({
        type: "log",
        level: "info",
        msg: `Cooldown skip (ack) @${input.fromUsername || input.fromUserId}`,
        ts: Date.now(),
      });
      return null;
    }
  }

  // ── 6. Context assembly — cached, no re-read ──────────────────────────────
  const ctx = await assembleContext(
    input.text,
    input.postId,
    input.fromUserId,
    store
  );

  // ── 7. Trained override — short-circuit before any perception/planning ────
  if (ctx.trainedMatch) {
    const tm = ctx.trainedMatch;
    if (tm.kind === "skip") {
      publish({
        type: "log",
        level: "info",
        msg: `Trained skip @${input.fromUsername || input.fromUserId}`,
        ts: Date.now(),
      });
      return null;
    }
    if (tm.kind === "clarify") {
      await handleClarify(
        { question: tm.question, kind: "context", intent: tm.intent },
        input,
        store
      );
      return null;
    }
    // trained reply — queue directly, no LLM generation
    const pd = makeDraft(input, tm.text, tm.intent, undefined);
    await queueDraft(pd);
    return shouldAutoSend(settings, input.kind, false) ? pd : null;
  }

  // ── 8. Perception — soul read ─────────────────────────────────────────────
  const perception = await perceive(input.text, ctx);

  // ── 9. Memory search — does KB have an answer? ────────────────────────────
  const recalled = perception.is_safe_to_engage
    ? await recallFact(input.text, input.postId, store.knowledge)
    : null;
  const hasKBHit = !!recalled;

  // ── 10. Action planning ───────────────────────────────────────────────────
  const actionPlan = await plan(perception, ctx, hasKBHit, {
    text: input.text,
    fromUserId: input.fromUserId,
    postId: input.postId,
    commentId: input.kind === "comment" ? input.threadOrMediaId : undefined,
  });

  // ── Always-reply override ────────────────────────────────────────────────
  // "Mira should always reply something" (Grok-style). If the planner wants to
  // skip purely because the comment is thin (chatter / low-value) — NOT for a
  // rulebook reason (spam, troll, inappropriate, business, personal, unsafe) —
  // and the comment is safe to engage, reply with a short warm ack instead of
  // staying silent.
  if (
    settings.alwaysReply &&
    perception.is_safe_to_engage &&
    actionPlan.steps.length === 1 &&
    actionPlan.steps[0].tool === "skip" &&
    (actionPlan.steps[0].args.reason === "chatter" ||
      actionPlan.steps[0].args.reason === "low-value")
  ) {
    actionPlan.steps = [{ tool: "reply", args: { style: "warm_ack" } }];
    actionPlan.rationale = "always-reply: benign skip upgraded to a warm ack";
  }

  publish({
    type: "log",
    level: "info",
    msg: `Plan: [${actionPlan.steps.map((s) => s.tool).join(", ")}] — ${actionPlan.rationale}`,
    ts: Date.now(),
  });

  // ── 11. Execute steps ─────────────────────────────────────────────────────
  let replyText: string | null = null;
  let dmText: string | undefined;
  let reviewOnly = false;
  let intent = "unclear";
  let wasSkipped = false;
  let wasClarified = false;

  for (const step of actionPlan.steps) {
    switch (step.tool) {
      case "skip": {
        await handleSkip(
          { ...step.args, intent },
          input,
          store
        );
        wasSkipped = true;
        break;
      }

      case "clarify": {
        const q = (step as { tool: "clarify"; args: { question: string; kind: "context" | "link" } }).args;
        await handleClarify(
          { question: q.question, kind: q.kind, intent },
          input,
          store
        );
        wasClarified = true;
        break;
      }

      case "link": {
        const linkResult = await handleLink(input, ctx);
        if (linkResult.outcome === "found") {
          dmText = linkResult.dmText;
          // Public reply text from link handler (if no reply step follows)
          if (!replyText) replyText = linkResult.publicReply;
          intent = "link_request";
        } else {
          // No link on this post — open a clarification
          await handleClarify(
            {
              question: linkResult.clarifyQuestion,
              kind: "link",
              intent: "link_request",
            },
            input,
            store
          );
          wasClarified = true;
        }
        break;
      }

      case "reply": {
        const replyArgs = (step as { tool: "reply"; args: NonNullable<(typeof step extends { tool: "reply"; args: infer A } ? A : never)> }).args;
        // If KB had a hit, pass it into the reply handler
        if (recalled && replyArgs.style === "knowledge") {
          replyArgs.knownAnswer = recalled.fact.answer;
          replyArgs.knownLink = recalled.fact.link?.url;
        }
        const result = await handleReply(replyArgs, input, ctx, perception);
        if (result.outcome === "reply") {
          replyText = result.text;
          if (result.dmText && !dmText) dmText = result.dmText;
          if (result.reviewOnly) reviewOnly = true;
          intent = perception.relationship_signal === "personal"
            ? "simple_acknowledgement"
            : perception.what_they_want.includes("link")
            ? "link_request"
            : perception.what_they_want.includes("question")
            ? "question_general"
            : "simple_acknowledgement";
        } else {
          // needs_owner — open a clarification
          await handleClarify(
            { question: result.question, kind: "context", intent },
            input,
            store
          );
          wasClarified = true;
        }
        break;
      }
    }

    if (wasSkipped || wasClarified) break; // no further steps after terminal actions
  }

  if (wasSkipped || wasClarified || !replyText) return null;

  // ── 12. Selective reply + daily cap ──────────────────────────────────────
  let allowAutoSend = shouldAutoSend(settings, input.kind, reviewOnly);

  if (allowAutoSend && shouldSkipForVariety(intent, settings)) {
    publish({
      type: "log",
      level: "info",
      msg: `Selective skip @${input.fromUsername || input.fromUserId}`,
      ts: Date.now(),
    });
    return null;
  }

  if (allowAutoSend && !(await withinDailyCap(settings))) {
    allowAutoSend = false;
    publish({
      type: "log",
      level: "warn",
      msg: "Daily send cap reached — queued for review",
      ts: Date.now(),
    });
  }

  // ── 13. Queue the draft (dedup can see it for next comment) ───────────────
  const pd = makeDraft(input, replyText, intent, dmText);
  await queueDraft(pd);

  if (allowAutoSend) return pd;

  await recordDailyStat({ drafted: 1 });
  publish({ type: "draft", draftId: pd.id, ts: Date.now() });
  return null;
}

// ── Draft helpers ──────────────────────────────────────────────────────────

function makeDraft(
  input: DraftInput,
  text: string,
  intent: string,
  dmText: string | undefined
): PendingDraft {
  return {
    id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    accountId: input.accountId,
    kind: input.kind,
    threadOrMediaId: input.threadOrMediaId,
    fromUserId: input.fromUserId,
    fromUsername: input.fromUsername,
    inboundText: input.text,
    draftText: text,
    dmText,
    intent,
    postId: input.postId,
    createdAt: Date.now(),
  };
}

async function queueDraft(pd: PendingDraft): Promise<void> {
  await updateStoreFor(pd.accountId, (s) => ({
    ...s,
    pendingDrafts: [pd, ...s.pendingDrafts].slice(0, 200),
  }));
}

// ── Paced auto-send ────────────────────────────────────────────────────────

async function pacedAutoSend(pd: PendingDraft): Promise<void> {
  const store = await readStore(pd.accountId);
  if (!store.account) return;
  await recordDailyStat({ autoReplied: 1 }, pd.accountId);
  await awaitSendSlot(store.settings);
  await sendDraft(pd, store.account.accessToken, store.account.igUserId);
}

// ── sendDraft (public — unchanged API) ────────────────────────────────────

export async function sendDraft(
  pd: PendingDraft,
  token: string,
  igUserId: string
) {
  const cur0 = await readStore(pd.accountId);
  if (modeFor(cur0.settings, pd.kind) === "shadow") {
    publish({
      type: "log",
      level: "warn",
      msg: `Shadow mode — send suppressed for draft ${pd.id}`,
      ts: Date.now(),
    });
    return;
  }

  // ── Send-side idempotency — the backstop that kills duplicate replies ──────
  // Claimed exactly once per reply target. A second attempt for the same
  // comment/DM (reconciler re-enqueue, worker restart, owner double-clicking
  // Send, the emoji-react path racing the pipeline) is suppressed here, no
  // matter which code path produced the draft.
  const targetKey =
    pd.kind === "comment" ? `c_${pd.threadOrMediaId}` : `m_${pd.threadOrMediaId}`;
  if (!(await claimOnce(k.replied(igUserId, targetKey), 7 * 24 * 3600))) {
    publish({
      type: "log",
      level: "warn",
      msg: `Duplicate send suppressed for ${pd.kind} ${pd.threadOrMediaId}`,
      ts: Date.now(),
    });
    await updateStoreFor(pd.accountId, (s) => ({
      ...s,
      pendingDrafts: s.pendingDrafts.filter((x) => x.id !== pd.id),
    }));
    return;
  }

  const log: ReplyLog = {
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind: pd.kind,
    commentId: pd.kind === "comment" ? pd.threadOrMediaId : undefined,
    inbound: pd.inboundText,
    outbound: pd.draftText,
    intent: pd.intent,
    postId: pd.postId,
    toUserId: pd.fromUserId,
    sentAt: Date.now(),
    status: "sent",
  };

  try {
    if (pd.kind === "comment") {
      const posted = (await replyToComment(
        pd.threadOrMediaId,
        pd.draftText,
        token
      )) as { id?: string } | undefined;
      if (posted?.id) primeSeen([posted.id]);

      if (pd.dmText) {
        const cur = await readStore(pd.accountId);
        if (cur.settings.autoDMLinks) {
          const r = await tryPrivateReply(
            pd.threadOrMediaId,
            pd.fromUserId,
            pd.dmText
          );
          publish({
            type: "log",
            level: r.ok ? "info" : "warn",
            msg: r.ok
              ? `Link DM'd to @${pd.fromUsername || pd.fromUserId}`
              : `Link DM skipped: ${r.reason}`,
            ts: Date.now(),
          });
        }
      }
    } else {
      const { tryDM } = await import("./dm");
      const r = await tryDM(pd.fromUserId, pd.draftText);
      if (!r.ok) {
        log.status = "failed";
        log.reason = r.reason;
      }
    }
  } catch (e) {
    log.status = "failed";
    log.reason = e instanceof Error ? e.message : "unknown";
  }

  await updateStoreFor(pd.accountId, (s) => ({
    ...s,
    pendingDrafts: s.pendingDrafts.filter((x) => x.id !== pd.id),
    history: [log, ...s.history].slice(0, 10000),
  }));

  if (log.status === "sent") {
    await bumpReplied(pd.accountId, pd.fromUserId);
    await recordDailyStat({ sent: 1, dmSent: pd.dmText ? 1 : 0 }, pd.accountId);
    // Invalidate account cache so next comment sees updated hitCounts
    invalidateAccountCache(pd.accountId);
    brain.invalidateAll();
  }

  publish({ type: "sent", replyId: log.id, ts: Date.now() });
}

// re-export for callers that imported from old module path
export { classifyIntent } from "./intent";

/**
 * Compatibility shim for callers that used the old decide() API (playground route).
 * Runs the full v2 pipeline logic against a fake store entry.
 */
export async function decide(
  input: DraftInput,
  post: import("./store").Post | undefined
): Promise<DraftDecision> {
  const { readStore } = await import("./store");
  const store = await readStore(input.accountId);

  // Insert the playground post into a temporary store view
  const fakeStore = post
    ? { ...store, posts: { ...store.posts, [post.id]: post } }
    : store;

  if (!fakeStore.account) {
    return { action: "skip", reason: "no account", intent: "unclear" };
  }

  const ctx = await assembleContext(
    input.text,
    input.postId,
    input.fromUserId,
    fakeStore
  );

  if (ctx.trainedMatch) {
    const tm = ctx.trainedMatch;
    if (tm.kind === "skip") return { action: "skip", reason: "trained-skip", intent: tm.intent };
    if (tm.kind === "clarify") return { action: "clarify", kind: "context", question: tm.question, intent: tm.intent };
    return { action: "send", text: tm.text, intent: tm.intent };
  }

  const { prefilter } = await import("./rulebook");
  const pre = prefilter(input.text, fakeStore.account.username || "");
  if (pre?.action === "skip") return { action: "skip", reason: pre.reason, intent: "unclear" };

  const perception = await perceive(input.text, ctx);
  if (!perception.is_safe_to_engage) {
    return { action: "skip", reason: "unsafe", intent: "unclear" };
  }

  const recalled = await recallFact(input.text, input.postId, fakeStore.knowledge);
  const actionPlan = await plan(perception, ctx, !!recalled, {
    text: input.text,
    fromUserId: input.fromUserId,
    postId: input.postId,
  });

  for (const step of actionPlan.steps) {
    if (step.tool === "skip") {
      return { action: "skip", reason: step.args.reason, intent: "unclear", hide: step.args.hide };
    }
    if (step.tool === "clarify") {
      const s = step as { tool: "clarify"; args: { question: string; kind: "context" | "link" } };
      return { action: "clarify", kind: s.args.kind, question: s.args.question, intent: "unclear" };
    }
    if (step.tool === "reply") {
      const replyArgs = (step as { tool: "reply"; args: Parameters<typeof handleReply>[0] }).args;
      if (recalled && replyArgs.style === "knowledge") {
        replyArgs.knownAnswer = recalled.fact.answer;
      }
      const result = await handleReply(replyArgs, input, ctx, perception);
      if (result.outcome === "needs_owner") {
        return { action: "clarify", kind: "context", question: result.question, intent: "unclear" };
      }
      return { action: "draft", text: result.text, intent: "question_general", reviewOnly: result.reviewOnly };
    }
    if (step.tool === "link") {
      const linkResult = await handleLink(input, ctx);
      if (linkResult.outcome === "missing") {
        return { action: "clarify", kind: "link", question: linkResult.clarifyQuestion, intent: "link_request" };
      }
      return { action: "send", text: linkResult.publicReply, dmText: linkResult.dmText, intent: "link_request" };
    }
  }

  return { action: "skip", reason: "no actionable steps", intent: "unclear" };
}

