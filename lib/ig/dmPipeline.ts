// DM Conversation Engine — the lane that makes DMs feel like a conversation.
//
// Unlike the comment pipeline (which judges each comment in isolation against
// post context), this loads the FULL thread history + the owner's trained brain
// and continues the conversation. A follow-up like "what do you sell?" is
// answered from the brain in the context of the prior turns — which is exactly
// what was broken before (Mira replied to the first message, ignored the next).
//
// Ordering is guaranteed by a per-conversation Redis lock in ingest.ts, so two
// messages from the same person are handled in order while different
// conversations run in parallel.

import { readStore, updateStore, normalizeMode, type IgStore, type PendingDraft } from "./store";
import { publish } from "./bus";
import { chat } from "./llm";
import { sanitizeReply } from "./variation";
import { RULEBOOK_PROMPT } from "./rulebook";
import { recallFact } from "./knowledge";
import { catalogIntent, lookupProducts, catalogBlock } from "./catalog";
import { quickPercept } from "./perception";
import { tryDM } from "./dm";
import { claimOnce, k, redis } from "./redis";
import {
  getOrCreateConversation,
  recordInbound,
  recordOutbound,
  recentTurns,
  updateSummary,
  withinWindow,
  type ConversationRow,
} from "./conversation";

// Mira stays draft-only until the brain has at least this many facts — "we
// always create the brain first" without hard-blocking the rest of the app.
const MIN_BRAIN_FACTS = 3;
// Burst-debounce window: when someone fires several DMs in a row, wait this long
// after the LAST one and reply ONCE to the whole batch (not once per message).
const DM_DEBOUNCE_MS = Number(process.env.DM_DEBOUNCE_MS || 5000);
const SUMMARY_EVERY = 6; // refresh the rolling summary every N turns

export type DmInput = {
  accountId: string;
  igsid: string;
  username?: string;
  mid: string;
  text: string;
};

/** Account-scope persona facts rendered for the prompt. Includes `shop` facts
 *  (shipping/returns/policy) so store-related questions are grounded too. */
function personaBlock(s: IgStore): string {
  return s.knowledge
    .filter((f) => f.scope === "account" && (f.topic === "personal" || f.topic === "general" || f.topic === "shop"))
    .slice(0, 12)
    .map((f) => `- ${f.question} — ${f.answer}`)
    .join("\n");
}

function brainReady(s: IgStore): boolean {
  return s.knowledge.length >= MIN_BRAIN_FACTS;
}

function buildSystemPrompt(s: IgStore, persona: string, recalledAnswer: string | null, summary: string, catalog: string): string {
  return [
    `You ARE the person who runs the Instagram account @${s.account?.username || "this account"} — replying to your own DMs as yourself. You are a real human, not an assistant.`,
    "This is a 1:1 conversation — read the whole thread and continue it naturally, like texting.",
    "IDENTITY: if anyone asks whether you're Mira, a bot, an AI, automated, or 'the assistant' — NEVER confirm it and never use those words. Brush it off playfully and stay human (you're just the person behind this account).",
    "YOU ARE THE ONLY PERSON HERE. There is NO team, manager, owner, assistant, colleague, or 'the right person'. NEVER mention or hand off to anyone else, never say 'I'll pass it along', 'check with', 'forward to', or 'the right person'. Handle everything yourself in the first person. For a collab/deal/big ask, answer as yourself ('sounds interesting, tell me more about it', 'let me think on it and get back to you').",
    "LANGUAGE: mirror the person. English → English, Hinglish → Hinglish. Never switch.",
    "Keep it short and human, usually 1-2 lines. At most one emoji, often none. No AI/corporate tone.",
    "Be a genuinely good person: warm, kind, polite, and caring to everyone. Spread positivity and love (platonic only, never romantic or sexual). Never be rude, mean, hateful, judgmental, or vulgar, even if they are.",
    "Write exactly like a real person texting: plain everyday words, simple punctuation, commas not dashes. NEVER use a dash of any kind ( - , -- , or em/en dashes ). No semicolons.",
    "Answer from the FACTS / known answer below. If you genuinely don't know (incl. a price you don't have), briefly say you'll get back to them on that YOURSELF — never invent prices, links, or details, and never say you'll pass it to or check with anyone.",
    RULEBOOK_PROMPT,
    s.toneSummary && `Your tone: ${s.toneSummary}`,
    persona && `ABOUT YOU (who you are):\n${persona}`,
    recalledAnswer && `KNOWN ANSWER to weave in naturally: ${recalledAnswer}`,
    catalog,
    summary && `CONVERSATION SO FAR (summary): ${summary}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Render recent turns as a chat transcript for the model. */
function turnsToMessages(turns: { direction: "in" | "out"; text: string }[]) {
  return turns.map((t) => ({
    role: (t.direction === "in" ? "user" : "assistant") as "user" | "assistant",
    content: t.text,
  }));
}

async function refreshSummary(conv: ConversationRow, turns: { direction: "in" | "out"; text: string }[]): Promise<void> {
  try {
    const transcript = turns.map((t) => `${t.direction === "in" ? "Them" : "Mira"}: ${t.text}`).join("\n");
    const summary = sanitizeReply(
      await chat(
        [
          { role: "system", content: "Summarize this DM conversation in 1-2 short sentences — who they are, what they want, anything Mira promised. Plain text only." },
          { role: "user", content: transcript },
        ],
        { temperature: 0.3 }
      )
    );
    if (summary) await updateSummary(conv.id, summary.slice(0, 600));
  } catch {
    /* summary is best-effort */
  }
}

/**
 * Process one inbound DM as part of a conversation. Loads thread + brain,
 * generates a contextual reply, and either sends it (dmMode auto + brain ready)
 * or queues it as a draft for the owner to approve.
 */
export async function processDM(input: DmInput): Promise<void> {
  const store = await readStore(input.accountId);
  if (!store.account) return;

  const conv = await getOrCreateConversation(input.accountId, input.igsid, input.username);
  await recordInbound(conv, input.mid, input.text);

  // ── Burst debounce ─────────────────────────────────────────────────────────
  // Several DMs fired in a row should get ONE reply to the whole batch, not one
  // per message. Each message claims the debounce token then waits out the quiet
  // window; only the message still holding the token proceeds — earlier ones bail
  // (their text is already in the thread, so the final reply sees everything).
  const dkey = `dmdebounce:${input.accountId}:${input.igsid}`;
  await redis.set(dkey, input.mid, "EX", 120);
  await new Promise((r) => setTimeout(r, DM_DEBOUNCE_MS));
  if ((await redis.get(dkey)) !== input.mid) return; // a newer message will reply for the batch

  // Rulebook safety gate — don't engage obvious spam/troll DMs.
  const quick = quickPercept(input.text);
  if (quick && !quick.is_safe_to_engage) {
    publish({ type: "log", level: "info", msg: `DM skip (${quick.what_they_want}) from ${input.igsid}`, ts: Date.now() });
    return;
  }

  // ── Build context: thread history + brain ─────────────────────────────────
  const turns = await recentTurns(conv.id, 12);
  const persona = personaBlock(store);
  const recalled = await recallFact(input.text).catch(() => null);
  // DM marketplace: ground the reply in the real catalog so "do you have X?" is
  // answered truthfully (never invents stock). Pure in-memory over the loaded
  // store; only runs when the message looks product-related (most DMs skip).
  const intent = catalogIntent(input.text);
  const prod = intent === "ask_specific" ? lookupProducts(store.products, input.text) : null;
  const catalog = intent !== "none" ? catalogBlock(intent, prod?.match ?? null, store.products) : "";
  const sys = buildSystemPrompt(store, persona, recalled?.fact.answer ?? null, conv.summary, catalog);

  // History already includes the just-recorded inbound as the final user turn.
  const reply = sanitizeReply(
    await chat([{ role: "system", content: sys }, ...turnsToMessages(turns)], { temperature: 0.8 })
  );
  if (!reply) return;

  // Refresh the rolling summary occasionally so context stays bounded.
  if (turns.length > 0 && turns.length % SUMMARY_EVERY === 0) void refreshSummary(conv, turns);

  // ── Send vs draft ─────────────────────────────────────────────────────────
  // Per-contact auto allowlist: a listed contact (igsid or username) auto-replies
  // even when the account dmMode is assisted and before the brain is trained.
  const allow = store.settings.dmAutoAllowlist ?? [];
  const onAllowlist = allow.includes(input.igsid) || (!!input.username && allow.includes(input.username));
  const mode = onAllowlist ? "auto" : normalizeMode(store.settings.dmMode);
  // Draft-only until the brain is trained (or in shadow/assisted mode) — allowlisted
  // contacts bypass the brain gate so they auto-reply immediately.
  const ready = onAllowlist || brainReady(store);
  const autoSend = mode === "auto" && ready && withinWindow(conv);

  if (!autoSend) {
    if (mode === "auto" && !ready) {
      publish({ type: "log", level: "info", msg: `DM draft (brain not trained yet) for ${input.igsid}`, ts: Date.now() });
    }
    await queueDmDraft(input, reply);
    publish({ type: "draft", draftId: `dm_${input.mid}`, ts: Date.now() });
    return;
  }

  // ── Auto-send with send-side idempotency (same backstop as comments) ───────
  if (!(await claimOnce(k.replied(input.accountId, `m_${input.mid}`), 7 * 24 * 3600))) {
    publish({ type: "log", level: "warn", msg: `Duplicate DM reply suppressed for ${input.mid}`, ts: Date.now() });
    return;
  }

  const r = await tryDM(input.igsid, reply, { skipRateGate: true }); // user initiated → no cold-DM gate
  if (r.ok) {
    await recordOutbound(conv, `out_${input.mid}`, reply, "ai");
    publish({ type: "sent", replyId: `dm_${input.mid}`, ts: Date.now() });
    publish({ type: "log", level: "info", msg: `DM replied to @${input.username || input.igsid}`, ts: Date.now() });
  } else {
    publish({ type: "log", level: "warn", msg: `DM send failed (${r.reason}) — queuing draft`, ts: Date.now() });
    await queueDmDraft(input, reply);
  }
}

async function queueDmDraft(input: DmInput, text: string): Promise<void> {
  const pd: PendingDraft = {
    id: `d_dm_${input.mid}`,
    kind: "dm",
    threadOrMediaId: input.mid,
    fromUserId: input.igsid,
    fromUsername: input.username,
    inboundText: input.text,
    draftText: text,
    intent: "dm_conversation",
    createdAt: Date.now(),
  };
  await updateStore((s) => ({
    ...s,
    pendingDrafts: [pd, ...s.pendingDrafts.filter((d) => d.id !== pd.id)].slice(0, 200),
  }));
}
