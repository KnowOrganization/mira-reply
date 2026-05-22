import {
  readStore,
  updateStore,
  type PendingDraft,
  type ReplyLog,
  type Post,
  type Clarification,
  type PostLink,
  type Settings,
} from "./store";
import { publish } from "./bus";
import { replyToComment, hideComment } from "./graph";
import { tryDM, tryPrivateReply } from "./dm";
import { classifyIntent, quickClassify, type Intent } from "./intent";
import { chat, chatJSON } from "./llm";
import { recallFact, bumpFactHit } from "./knowledge";
import { primeSeen } from "./seen";
import { sanitizeReply, styleSeed, tooSimilar, detectVibe } from "./variation";
import { prefilter, firstEmoji, RULEBOOK_PROMPT } from "./rulebook";
import {
  awaitSendSlot,
  withinDailyCap,
  recordDailyStat,
  shouldSkipForVariety,
} from "./sender";

// the owner's brain — personal + account facts, refreshed on each decide()
// and injected into every reply so Mira sounds like the real owner.
let _personaContext = "";

const ANTI_AI_BLOCKLIST = [
  "as an ai", "i am an ai", "i'm here to help", "i'd be happy to",
  "happy to help", "feel free to", "absolutely!", "delve",
  "i appreciate", "thanks for reaching out", "looking forward",
  "hope this helps", "let me know if",
];

export type DraftInput = {
  kind: "comment" | "dm";
  threadOrMediaId: string;
  fromUserId: string;
  fromUsername?: string;
  text: string;
  postId?: string;
};

function buildPostContext(post?: Post): string {
  if (!post) return "";
  const parts: string[] = [];
  if (post.caption) parts.push(`Caption: "${post.caption}"`);
  if (post.notes) parts.push(`Owner notes: ${post.notes}`);
  if (post.qa.length) {
    parts.push("Owner Q&A:\n" + post.qa.slice(-10).map((x) => `Q: ${x.q}\nA: ${x.a}`).join("\n"));
  }
  if (post.links?.length) {
    parts.push("Saved links: " + post.links.map((l) => `${l.label} (${l.type})`).join(", "));
  }
  return parts.join("\n\n");
}

function buildSystemPrompt(args: {
  toneSummary: string;
  samples: string[];
  postContext: string;
  hint?: string;
}) {
  return [
    "Tu Mira — Instagram account holder ke behalf reply karta hai.",
    "LANGUAGE: mirror the commenter. If the comment is in English, reply in English. If it is in Hinglish / Roman Hindi, reply in Hinglish. Never switch the language they used. Casual, short, real. NO AI tone, NO formal.",
    "Keep replies short and natural — usually 1-2 lines. For a real question, go as long as a proper answer genuinely needs. Natural emoji ok. Match owner style.",
    RULEBOOK_PROMPT,
    args.toneSummary && `Owner tone: ${args.toneSummary}`,
    args.samples.length
      ? `Owner past replies (style):\n${args.samples.slice(0, 5).map((s) => `- ${s}`).join("\n")}`
      : "",
    _personaContext &&
      `ABOUT THE OWNER — Mira's brain. Use this to sound like them and answer questions about them:\n${_personaContext}`,
    args.postContext && `POST CONTEXT:\n${args.postContext}`,
    args.hint || "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * The dedupe comparison set for an intent — recent sent replies AND drafts
 * still pending. Including pending drafts means a burst of similar comments
 * gets distinct replies even before any of them is sent.
 */
async function recentForIntent(
  intent: string
): Promise<{ recent: string[]; threshold: number }> {
  const s = await readStore();
  const sent = s.history
    .filter(
      (h) =>
        h.status === "sent" &&
        h.kind === "comment" &&
        h.intent === intent &&
        !!h.outbound
    )
    .slice(0, 25)
    .map((h) => h.outbound);
  const pending = s.pendingDrafts
    .filter((d) => d.kind === "comment" && d.intent === intent && !!d.draftText)
    .map((d) => d.draftText);
  return {
    recent: [...pending, ...sent].slice(0, 40),
    threshold: s.settings.uniquenessThreshold,
  };
}

/** Sanitize a reply, then regenerate it if it's too close to recent replies. */
async function dedupeReply(
  raw: string,
  intent: string,
  sys: string,
  userContent: string
): Promise<string> {
  let text = sanitizeReply(raw);
  const { recent, threshold } = await recentForIntent(intent);
  let tries = 0;
  while (tries < 2 && tooSimilar(text, recent, threshold).similar) {
    tries++;
    const avoid = recent.slice(0, 6).map((r) => `- ${r}`).join("\n");
    text = sanitizeReply(
      await chat(
        [
          {
            role: "system",
            content: `${sys}\n\nThese recent replies are too repetitive — do NOT echo their wording or structure:\n${avoid}\nWrite something genuinely fresh.`,
          },
          { role: "user", content: userContent },
        ],
        { temperature: 0.97 }
      )
    );
  }
  return text;
}

/** Generate a customer-facing reply: style-seeded, sanitized, deduped. */
async function variedChat(
  sys: string,
  userContent: string,
  intent: string,
  temp = 0.8
): Promise<string> {
  const seeded = `${sys}\n\n${styleSeed()}`;
  const first = await chat(
    [
      { role: "system", content: seeded },
      { role: "user", content: userContent },
    ],
    { temperature: temp }
  );
  return dedupeReply(first, intent, seeded, userContent);
}

function pickLinkForComment(text: string, links: PostLink[]): PostLink | null {
  if (!links?.length) return null;
  const t = text.toLowerCase();
  const has = (kws: string[]) => kws.some((k) => t.includes(k));
  if (has(["where", "location", "place", "kahan", "kaha"])) return links.find((l) => l.type === "location") || null;
  if (has(["song", "music", "track", "gana", "gaana"])) return links.find((l) => l.type === "song") || null;
  if (has(["bike", "gear", "camera", "lens", "ride"])) return links.find((l) => l.type === "gear") || null;
  if (has(["buy", "shop", "price", "kahan se", "where to buy"])) return links.find((l) => l.type === "shop") || null;
  return links[0];
}

/** Mode-aware gate: may this decision auto-send without owner approval? */
function shouldAutoSend(settings: Settings, decision: DraftDecision): boolean {
  const mode = settings.replyMode;
  if (mode === "shadow") return false; // draft only, never send
  // a review-only draft (flirty / sensitive) is never auto-sent, any mode
  if (decision.action === "draft" && decision.reviewOnly) return false;
  if (mode === "auto") return true; // send everything, drafts included
  if (decision.action !== "send") return false; // balanced/assisted need confidence
  if (mode === "balanced") return true; // acks + confident KB answers + links
  // assisted — only generic acknowledgements, and only if enabled
  return (
    decision.intent === "simple_acknowledgement" && settings.autoReplySimpleAcks
  );
}

async function recentRepliedTo(userId: string, withinMs: number): Promise<boolean> {
  const s = await readStore();
  // only an actual sent reply counts — a skipped/hidden log must not gate
  return s.history.some(
    (h) =>
      h.toUserId === userId &&
      h.status === "sent" &&
      Date.now() - h.sentAt < withinMs
  );
}

async function bumpCommenter(userId: string, username: string | undefined) {
  await updateStore((s) => {
    const ex = s.commenters[userId];
    return {
      ...s,
      commenters: {
        ...s.commenters,
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
    };
  });
}

async function bumpReplied(userId: string) {
  await updateStore((s) => {
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

export type DraftDecision =
  | { action: "send"; text: string; intent: Intent; dmText?: string }
  | { action: "draft"; text: string; intent: Intent; reviewOnly?: boolean }
  | { action: "clarify"; question: string; kind: "context" | "link"; intent: Intent }
  | { action: "skip"; reason: string; intent: Intent; hide?: boolean };

async function decide(input: DraftInput, post: Post | undefined): Promise<DraftDecision> {
  const s = await readStore();

  // rulebook prefilter — deterministic structural checks, no LLM spend
  const pre = prefilter(input.text, s.account?.username || "");
  if (pre?.action === "skip")
    return { action: "skip", reason: pre.reason, intent: "unclear" };
  if (pre?.action === "react") {
    const raw = await chat([
      {
        role: "system",
        content:
          "Reply to this Instagram comment with EXACTLY ONE emoji that fits its vibe. Output only the emoji — no words, nothing else.",
      },
      { role: "user", content: input.text },
    ]);
    return {
      action: "send",
      text: firstEmoji(raw),
      intent: "simple_acknowledgement",
    };
  }

  // refresh the persona context from the brain (personal + account facts)
  const personaNow = Date.now();
  _personaContext = s.knowledge
    .filter(
      (f) =>
        f.scope === "account" &&
        (f.topic === "personal" || f.topic === "general") &&
        !(f.expiresAt && f.expiresAt < personaNow)
    )
    .slice(0, 12)
    .map((f) => `- ${f.question} — ${f.answer}`)
    .join("\n");

  const intent = await classifyIntent(input.text, !!(post?.notes || post?.qa.length));
  const vibe = detectVibe(input.text);
  const commenter = s.commenters[input.fromUserId];
  const superfanNote =
    commenter && commenter.commentCount >= 4
      ? ` This commenter is a loyal regular (${commenter.commentCount} comments) — be extra warm and familiar.`
      : "";

  // spam / promo — skipped but left publicly visible (no auto-hide).
  if (intent === "spam_promo")
    return { action: "skip", reason: "spam", intent };
  // troll / hate — hidden from public view. Never auto-blocks the user.
  if (intent === "negative_attack")
    return { action: "skip", reason: "troll", intent, hide: true };
  // brand collab / sponsorship / business contact — never auto-handled; the
  // owner takes these personally.
  if (intent === "business_inquiry")
    return { action: "skip", reason: "business_inquiry", intent };
  // off-topic / follow-back / shoutout / buy-sell / religion / politics
  if (intent === "chatter")
    return { action: "skip", reason: "chatter", intent };
  // sexual / creepy — hidden from public view, never replied to
  if (intent === "inappropriate")
    return { action: "skip", reason: "inappropriate", intent, hide: true };
  // Personal / flirty message. In a DM this may be a genuine private
  // relationship — Mira must never impersonate the owner there, so skip.
  // On a PUBLIC comment it is just a familiar or flirty fan, who still
  // deserves a warm, light reply.
  if (intent === "personal_relationship") {
    if (input.kind === "dm")
      return { action: "skip", reason: "personal_relationship", intent };
    const sys = buildSystemPrompt({
      toneSummary: s.toneSummary,
      samples: s.styleSamples,
      postContext: buildPostContext(post),
      hint: `Inbound is a flirty or familiar comment from a follower. Reply with ONE light, friendly, breezy line — warm but not flirting back. Max 6 words. No question, no emoji wall. Vibe: ${vibe}.${superfanNote}`,
    });
    const text = await variedChat(
      sys,
      `Inbound: "${input.text}"\nReply (just the line, no quotes):`,
      "simple_acknowledgement",
      0.9
    );
    // flirty replies are sensitive — always queued for owner review, even in
    // auto mode (reviewOnly), never auto-sent
    return {
      action: "draft",
      text,
      intent: "simple_acknowledgement",
      reviewOnly: true,
    };
  }

  // Simple acknowledgement → short auto reply
  if (intent === "simple_acknowledgement") {
    // owner wants praise replies only when there is real text — skip bare
    // emoji and one-word praise
    const realWords = input.text
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, " ")
      .trim()
      .split(/\s+/)
      .filter((w) => /[a-zऀ-ॿ]/i.test(w));
    if (realWords.length < 2)
      return { action: "skip", reason: "low-value praise", intent };
    const sys = buildSystemPrompt({
      toneSummary: s.toneSummary,
      samples: s.styleSamples,
      postContext: buildPostContext(post),
      hint: `Inbound is short praise/emoji. Reply with ONE warm casual ack. Max 6 words. NO question, NO emoji wall. Match the commenter's vibe: ${vibe}.${superfanNote}`,
    });
    const text = await variedChat(
      sys,
      `Inbound: "${input.text}"\nReply (just the ack, no quotes):`,
      intent,
      0.9
    );
    return { action: "send", text, intent };
  }

  // Link request → use ONLY this post's attached links (strictly post-scoped —
  // a link attached to one post is never sent on another).
  if (intent === "link_request") {
    const postLink = pickLinkForComment(input.text, post?.links || []);
    if (!postLink) {
      // no link on this post → ask the owner to attach one
      return {
        action: "clarify",
        kind: "link",
        question: `Someone asked for a link on this post. Attach it (paste the URL):`,
        intent,
      };
    }
    const sys = buildSystemPrompt({
      toneSummary: s.toneSummary,
      samples: s.styleSamples,
      postContext: buildPostContext(post),
      hint: `Person asked for a link. Reply publicly in ONE casual line, mention you sent it to their DMs. Vibe: ${vibe}.${superfanNote}`,
    });
    const text = await variedChat(sys, `Inbound: "${input.text}"\nReply:`, intent);
    return {
      action: "send",
      text,
      dmText: `Hey! Here's the ${postLink.label}: ${postLink.url}`,
      intent,
    };
  }

  // Knowledge base first — cross-post recall. A fact Mira learned once, on any
  // post, answers this comment now with no owner involvement.
  const recalled = await recallFact(input.text, input.postId);
  if (recalled) {
    await bumpFactHit(recalled.fact.id);
    const known = recalled.fact;
    const sys = buildSystemPrompt({
      toneSummary: s.toneSummary,
      samples: s.styleSamples,
      postContext: buildPostContext(post),
      hint: `You already KNOW the answer. Fact: "${known.answer}". Reply naturally using it — 1-2 short lines, like a person, not a database lookup. Never say "according to my records". Vibe: ${vibe}.${superfanNote}`,
    });
    const text = await variedChat(
      sys,
      `Inbound: "${input.text}"\nReply (plain text):`,
      intent
    );
    if (known.link) {
      return { action: "send", text, dmText: `Here you go: ${known.link.url}`, intent };
    }
    return { action: "send", text, intent };
  }

  // Generic and post-specific question — ask LLM with optional uncertainty escape
  const sys = buildSystemPrompt({
    toneSummary: s.toneSummary,
    samples: s.styleSamples,
    postContext: buildPostContext(post),
    hint:
      'Output JSON: {"status":"ok","draft":"..."} if confident from POST CONTEXT or general knowledge. ' +
      'If post-specific (where shot, song, gear, who) and POST CONTEXT lacks it, output: {"status":"needs_owner_input","question":"<short question for owner>"}. ' +
      "Don't invent locations/dates/songs/gear.",
  });
  type Out = { status: "ok" | "needs_owner_input"; draft?: string; question?: string };
  const out = await chatJSON<Out>(
    [
      { role: "system", content: sys },
      { role: "user", content: `Inbound ${input.kind}: "${input.text}"\nReply JSON:` },
    ],
    { status: "needs_owner_input", question: "Need more info to reply to this." }
  );
  if (out.status === "needs_owner_input")
    return { action: "clarify", kind: "context", question: out.question || "Need info", intent };

  let draft = sanitizeReply(out.draft || "");
  if (ANTI_AI_BLOCKLIST.some((p) => draft.toLowerCase().includes(p))) {
    const fix = await chat([
      { role: "system", content: sys + "\nNO AI or corporate phrases. Casual only." },
      { role: "user", content: `Rewrite reply for: "${input.text}" (1-2 short lines, plain text):` },
    ]);
    draft = sanitizeReply(fix);
  }
  // dedupe against recent replies — regenerate in plain text if too similar
  const plainSys = buildSystemPrompt({
    toneSummary: s.toneSummary,
    samples: s.styleSamples,
    postContext: buildPostContext(post),
    hint: `Reply to the comment in plain text, 1-2 short lines, casual. Match the commenter's vibe: ${vibe}.${superfanNote}`,
  });
  draft = await dedupeReply(
    draft,
    intent,
    plainSys,
    `Reply naturally to this comment: "${input.text}"`
  );
  return { action: "draft", text: draft, intent };
}

// Generation runs serialized — each comment's dedupe sees the prior drafts,
// so a burst of similar comments still gets distinct replies. Kept on
// globalThis so dev HMR does not spawn parallel chains.
const pq = globalThis as unknown as { __mira_pipeline_chain?: Promise<unknown> };
if (!pq.__mira_pipeline_chain) pq.__mira_pipeline_chain = Promise.resolve();

export async function processInbound(input: DraftInput): Promise<void> {
  const prev = pq.__mira_pipeline_chain as Promise<unknown>;
  const run = prev.then(
    () => runPipeline(input),
    () => runPipeline(input)
  );
  pq.__mira_pipeline_chain = run.then(
    () => undefined,
    () => undefined
  );
  const pd = await run;
  // the send happens OUTSIDE the serialized chain — paced, so a slow send
  // does not block the next comment from generating.
  if (pd) void pacedAutoSend(pd);
}

/**
 * Re-run a clarification's triggering comment plus every comment queued behind
 * it (waiters), now that the answer / link is known. The owner answers once,
 * everyone waiting on it gets replied to.
 */
export async function reprocessClarification(c: Clarification): Promise<void> {
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
      kind: "comment",
      threadOrMediaId: cm.commentId,
      fromUserId: cm.fromUserId,
      fromUsername: cm.fromUsername,
      text: cm.commentText,
      postId: c.postId,
    }).catch(() => {});
  }
}

/**
 * Generate a reply for one inbound comment. Returns a draft to auto-send, or
 * null when it was queued for review / clarified / skipped.
 */
async function runPipeline(input: DraftInput): Promise<PendingDraft | null> {
  const store = await readStore();
  if (!store.account) return null;
  const settings = store.settings;

  // own comment skip
  if (input.fromUserId === store.account.igUserId && settings.skipOwnComments)
    return null;

  // blocklist
  if (store.blocklist.includes(input.fromUserId)) {
    publish({ type: "log", level: "info", msg: `Blocked ${input.fromUserId} skipped`, ts: Date.now() });
    return null;
  }
  // trusted contact
  if (store.trustedContacts.find((c) => c.igUserId === input.fromUserId)) {
    publish({ type: "log", level: "warn", msg: `Trusted contact ${input.fromUserId} — owner notify`, ts: Date.now() });
    return null;
  }

  await bumpCommenter(input.fromUserId, input.fromUsername);
  await recordDailyStat({ comments: 1 });

  // cooldown — suppress *repeat acks* to the same user, but never block a
  // real question or link request (those always deserve an answer)
  const cooldownMs = settings.cooldownMinutes * 60_000;
  if (cooldownMs > 0 && quickClassify(input.text) === "simple_acknowledgement") {
    if (await recentRepliedTo(input.fromUserId, cooldownMs)) {
      publish({
        type: "log",
        level: "info",
        msg: `Cooldown skip (ack) @${input.fromUsername || input.fromUserId}`,
        ts: Date.now(),
      });
      return null;
    }
  }

  const post = input.postId ? store.posts[input.postId] : undefined;
  const decision = await decide(input, post);

  if (decision.action === "skip") {
    if (decision.hide && input.kind === "comment" && store.account) {
      // troll / hate shield — hide the comment from public view. Never
      // auto-blocks the user.
      await hideComment(input.threadOrMediaId, store.account.accessToken).catch(
        () => {}
      );
      await updateStore((s) => ({
        ...s,
        history: [
          {
            id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            kind: "comment" as const,
            commentId: input.threadOrMediaId,
            inbound: input.text,
            outbound: "",
            intent: decision.intent,
            postId: input.postId,
            toUserId: input.fromUserId,
            sentAt: Date.now(),
            status: "skipped" as const,
            reason: decision.reason,
          },
          ...s.history,
        ].slice(0, 1000),
      }));
      publish({
        type: "log",
        level: "warn",
        msg: `Hidden ${decision.reason} comment from @${input.fromUsername || input.fromUserId}`,
        ts: Date.now(),
      });
    } else {
      // business inquiry → flag the owner; everything else is a quiet skip
      const business = decision.reason === "business_inquiry";
      publish({
        type: "log",
        level: business ? "warn" : "info",
        msg: business
          ? `Business / collab inquiry from @${input.fromUsername || input.fromUserId} — over to you`
          : `Skipped (${decision.reason}) @${input.fromUsername || input.fromUserId}`,
        ts: Date.now(),
      });
    }
    return null;
  }

  if (decision.action === "clarify") {
    // dedup — if Mira already has an open clarification of the same kind on
    // this post, never ask the owner twice. Queue this comment behind it as a
    // waiter; it is served the moment that one clarification is answered.
    const dup = store.clarifications.find(
      (x) =>
        x.status === "open" &&
        (x.kind || "context") === decision.kind &&
        x.postId === (input.postId || "")
    );
    if (dup) {
      await updateStore((s) => ({
        ...s,
        clarifications: s.clarifications.map((x) =>
          x.id === dup.id
            ? {
                ...x,
                waiters: [
                  ...(x.waiters || []),
                  {
                    commentId: input.threadOrMediaId,
                    fromUserId: input.fromUserId,
                    fromUsername: input.fromUsername,
                    commentText: input.text,
                  },
                ],
              }
            : x
        ),
      }));
      publish({
        type: "log",
        level: "info",
        msg: `Already asked — @${input.fromUsername || input.fromUserId} queued behind it`,
        ts: Date.now(),
      });
      return null;
    }
    const c: Clarification = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      commentId: input.threadOrMediaId,
      postId: input.postId || "",
      commentText: input.text,
      question: decision.question,
      kind: decision.kind,
      fromUserId: input.fromUserId,
      fromUsername: input.fromUsername,
      createdAt: Date.now(),
      status: "open",
    };
    await updateStore((s) => ({
      ...s,
      clarifications: [c, ...s.clarifications].slice(0, 200),
    }));
    publish({ type: "log", level: "warn", msg: `Need input: ${decision.question}`, ts: Date.now() });
    publish({ type: "draft", draftId: c.id, ts: Date.now() });
    return null;
  }

  // both 'draft' and 'send' produce a PendingDraft
  const pd: PendingDraft = {
    id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind: input.kind,
    threadOrMediaId: input.threadOrMediaId,
    fromUserId: input.fromUserId,
    fromUsername: input.fromUsername,
    inboundText: input.text,
    draftText: decision.text,
    dmText: decision.action === "send" ? decision.dmText : undefined,
    intent: decision.intent,
    postId: input.postId,
    createdAt: Date.now(),
  };

  let allowAutoSend = shouldAutoSend(settings, decision);

  // selective reply — a real person doesn't answer every single ack
  if (allowAutoSend && shouldSkipForVariety(decision.intent, settings)) {
    publish({
      type: "log",
      level: "info",
      msg: `Selective skip @${input.fromUsername || input.fromUserId}`,
      ts: Date.now(),
    });
    return null;
  }
  // daily send cap — over cap, queue for review instead of auto-sending
  if (allowAutoSend && !(await withinDailyCap(settings))) {
    allowAutoSend = false;
    publish({
      type: "log",
      level: "warn",
      msg: "Daily send cap reached — queued for review",
      ts: Date.now(),
    });
  }

  // queue the draft either way — so the next comment's dedupe can see it
  await updateStore((s) => ({
    ...s,
    pendingDrafts: [pd, ...s.pendingDrafts].slice(0, 200),
  }));

  if (allowAutoSend) {
    return pd; // the caller sends it, paced, outside the serialized chain
  }
  await recordDailyStat({ drafted: 1 });
  publish({ type: "draft", draftId: pd.id, ts: Date.now() });
  return null;
}

/** Send an auto-approved draft, paced — runs outside the generation chain. */
async function pacedAutoSend(pd: PendingDraft): Promise<void> {
  const store = await readStore();
  if (!store.account) return;
  await recordDailyStat({ autoReplied: 1 });
  await awaitSendSlot(store.settings); // paced + jittered — never a burst
  await sendDraft(pd, store.account.accessToken, store.account.igUserId);
}

export async function sendDraft(
  pd: PendingDraft,
  token: string,
  igUserId: string
) {
  void igUserId;
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
      // mark Mira's own reply as seen — the watcher must never process it
      // (otherwise Mira replies to its own replies → infinite loop)
      if (posted?.id) primeSeen([posted.id]);
      // link accompaniment → deliver via private reply to the comment
      if (pd.dmText) {
        const cur = await readStore();
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
  await updateStore((s) => ({
    ...s,
    pendingDrafts: s.pendingDrafts.filter((x) => x.id !== pd.id),
    history: [log, ...s.history].slice(0, 1000),
  }));
  if (log.status === "sent") {
    await bumpReplied(pd.fromUserId);
    await recordDailyStat({ sent: 1, dmSent: pd.dmText ? 1 : 0 });
  }
  publish({ type: "sent", replyId: log.id, ts: Date.now() });
}

// re-export for callers that imported from old module path
export { classifyIntent } from "./intent";
