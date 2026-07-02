// Reply generation handler — extracted from pipeline.ts decide().
// Handles ALL reply scenarios: simple acks, knowledge-backed answers,
// post-specific questions, personal/flirty comments, general questions.
// Returns the generated reply text (and optional DM text for KB-linked facts).

import { type AssembledContext } from "../ctx";
import { type DraftInput } from "../pipeline";
import { type Perception } from "../perception";
import { chat, chatJSON } from "../llm";
import {
  sanitizeReply,
  styleSeed,
  tooSimilar,
  mostlyWrongLanguage,
} from "../variation";
import { recallFact, bumpFactHit } from "../knowledge";
import { RULEBOOK_PROMPT } from "../rulebook";

export type ReplyStyle =
  | "warm_ack"         // short praise reply
  | "knowledge"        // answer from KB
  | "question_answer"  // answer a question with post context
  | "casual_personal"  // flirty/personal — light, breezy
  | "general";         // catch-all

export type ReplyArgs = {
  style: ReplyStyle;
  // For knowledge style: fact answer to weave in
  knownAnswer?: string;
  knownLink?: string;
  // For question_answer style: whether to try owner-input escape
  allowEscapeToOwner?: boolean;
};

export type ReplyResult =
  | { outcome: "reply"; text: string; dmText?: string; reviewOnly?: boolean }
  | { outcome: "needs_owner"; question: string };

// ── System prompt builder ──────────────────────────────────────────────────

function buildSystemPrompt(
  ctx: AssembledContext,
  hint: string
): string {
  return [
    "Tu Mira — Instagram account holder ke behalf reply karta hai.",
    "LANGUAGE: mirror the commenter. English → English. Hinglish → Hinglish. Never switch.",
    "Keep replies short and natural — usually 1-2 lines. Go longer only for a genuine question that needs a full answer.",
    "At most ONE emoji, often none. No AI tone, no formal language. Output ONLY the reply text.",
    RULEBOOK_PROMPT,
    ctx.toneSummary && `Owner tone: ${ctx.toneSummary}`,
    ctx.styleSamples.length
      ? `Owner past replies (style):\n${ctx.styleSamples
          .slice(0, 5)
          .map((s) => `- ${s}`)
          .join("\n")}`
      : "",
    ctx.personaContext &&
      `ABOUT THE OWNER — Mira's brain. Use to sound like them:\n${ctx.personaContext}`,
    ctx.trainingContext,
    ctx.postContext && `POST CONTEXT:\n${ctx.postContext}`,
    hint,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ── Core generation with dedup + wrong-language guard ─────────────────────

async function generateAndClean(
  sys: string,
  userContent: string,
  ctx: AssembledContext,
  temp = 0.85
): Promise<string> {
  const seeded = `${sys}\n\n${styleSeed()}`;

  let text = sanitizeReply(
    await chat(
      [
        { role: "system", content: seeded },
        { role: "user", content: userContent },
      ],
      { temperature: temp, accountId: ctx.account?.igUserId }
    )
  );

  // Wrong-language guard — regenerate once if LLM answered in wrong script
  if (mostlyWrongLanguage(text)) {
    text = sanitizeReply(
      await chat(
        [
          {
            role: "system",
            content: `${seeded}\n\nCRITICAL: reply ONLY in English or Hinglish. No other language.`,
          },
          { role: "user", content: userContent },
        ],
        { temperature: 0.5, accountId: ctx.account?.igUserId }
      )
    );
  }

  // Dedup — regenerate if too similar to recent replies
  const threshold = ctx.settings.uniquenessThreshold;
  let tries = 0;
  while (tries < 2 && tooSimilar(text, ctx.recentReplies, threshold).similar) {
    tries++;
    const avoid = ctx.recentReplies
      .slice(0, 6)
      .map((r) => `- ${r}`)
      .join("\n");
    text = sanitizeReply(
      await chat(
        [
          {
            role: "system",
            content: `${seeded}\n\nThese recent replies are too repetitive — do NOT echo their wording:\n${avoid}\nWrite something genuinely fresh.`,
          },
          { role: "user", content: userContent },
        ],
        { temperature: 0.97, accountId: ctx.account?.igUserId }
      )
    );
  }

  return text;
}

// ── Anti-AI blocklist ──────────────────────────────────────────────────────

const ANTI_AI = [
  "as an ai", "i am an ai", "i'm here to help", "i'd be happy to",
  "happy to help", "feel free to", "absolutely!", "delve",
  "i appreciate", "thanks for reaching out", "looking forward",
  "hope this helps", "let me know if",
];

async function fixAntiAI(
  text: string,
  sys: string,
  commentText: string
): Promise<string> {
  if (!ANTI_AI.some((p) => text.toLowerCase().includes(p))) return text;
  return sanitizeReply(
    await chat(
      [
        {
          role: "system",
          content: sys + "\nNO AI or corporate phrases. Casual only.",
        },
        {
          role: "user",
          content: `Rewrite reply for: "${commentText}" (1-2 short lines, plain text):`,
        },
      ],
      { temperature: 0.7 }
    )
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export async function handleReply(
  args: ReplyArgs,
  input: DraftInput,
  ctx: AssembledContext,
  perception: Perception
): Promise<ReplyResult> {
  const vibe = perception.emotional_tone;
  const superfanNote = ctx.superfanNote;

  // ── Knowledge-backed reply ────────────────────────────────────────────────
  if (args.style === "knowledge" && args.knownAnswer) {
    // Try to recall the best matching fact (embeddings already done in ctx)
    const recalled = await recallFact(input.text, input.postId, ctx.kb);
    const factAnswer = recalled?.fact.answer ?? args.knownAnswer;
    const factLink = recalled?.fact.link ?? (args.knownLink ? { url: args.knownLink, label: "link" } : undefined);

    if (recalled) await bumpFactHit(recalled.fact.id);

    const sys = buildSystemPrompt(
      ctx,
      `You already KNOW the answer. Fact: "${factAnswer}". Reply naturally using it — 1-2 short lines, like a person, not a database lookup. Never say "according to my records". State ONLY what the fact says. Vibe: ${vibe}.${superfanNote}`
    );

    const text = await generateAndClean(
      sys,
      `Inbound: "${input.text}"\nReply (plain text):`,
      ctx,
      0.6
    );

    return {
      outcome: "reply",
      text,
      dmText: factLink ? `Here you go: ${factLink.url}` : undefined,
    };
  }

  // ── Simple warm ack ───────────────────────────────────────────────────────
  if (args.style === "warm_ack") {
    const sys = buildSystemPrompt(
      ctx,
      `Inbound is short praise/emoji. Reply with ONE warm casual ack. Max 6 words. NO question, NO emoji wall. Match the commenter's vibe: ${vibe}.${superfanNote}`
    );
    const text = await generateAndClean(
      sys,
      `Inbound: "${input.text}"\nReply (just the ack, no quotes):`,
      ctx,
      0.9
    );
    return { outcome: "reply", text };
  }

  // ── Casual/personal reply (flirty or familiar fan) ────────────────────────
  if (args.style === "casual_personal") {
    const sys = buildSystemPrompt(
      ctx,
      `Inbound is a flirty or familiar comment. Reply with ONE light, friendly, breezy line — warm but not flirting back. Max 6 words. No question, no emoji wall. Vibe: ${vibe}.${superfanNote}`
    );
    const text = await generateAndClean(
      sys,
      `Inbound: "${input.text}"\nReply (just the line, no quotes):`,
      ctx,
      0.9
    );
    // Flirty/personal are sensitive — always queue for owner review
    return { outcome: "reply", text, reviewOnly: true };
  }

  // ── Question answer — with optional escape to owner if context is missing ──
  if (args.style === "question_answer" || args.style === "general") {
    const canEscape = args.allowEscapeToOwner ?? true;

    const hint = canEscape
      ? 'Output JSON: {"status":"ok","draft":"..."} if confident from POST CONTEXT or general knowledge. ' +
        'If post-specific (where shot, song, gear, who) and POST CONTEXT lacks it, output: {"status":"needs_owner_input","question":"<short question for owner>"}. ' +
        "READ Owner notes, Q&A, caption and hashtags first — these ARE the owner's answers. Only output needs_owner_input if NONE of that has the answer. " +
        "Don't invent locations/dates/songs/gear."
      : "Reply naturally in 1-2 short lines, casual. Match the commenter's vibe: " +
        vibe +
        "." +
        superfanNote;

    const sys = buildSystemPrompt(ctx, hint);

    if (canEscape) {
      type Out = { status: "ok" | "needs_owner_input"; draft?: string; question?: string };
      const out = await chatJSON<Out>(
        [
          { role: "system", content: sys },
          {
            role: "user",
            content: `Inbound ${input.kind}: "${input.text}"\nReply JSON:`,
          },
        ],
        { status: "needs_owner_input", question: "Need more info to reply to this." }
      );

      if (out.status === "needs_owner_input") {
        return {
          outcome: "needs_owner",
          question: out.question || "Need info",
        };
      }

      let draft = sanitizeReply(out.draft || "");
      draft = await fixAntiAI(draft, sys, input.text);
      draft = await generateAndClean(
        buildSystemPrompt(
          ctx,
          `Reply to the comment in plain text, 1-2 short lines, casual. Match the commenter's vibe: ${vibe}.${superfanNote}`
        ),
        `Reply naturally to this comment: "${input.text}"`,
        ctx,
        0.8
      );
      return { outcome: "reply", text: draft };
    } else {
      // No escape — generate directly
      const text = await generateAndClean(
        sys,
        `Inbound: "${input.text}"\nReply:`,
        ctx,
        0.85
      );
      return { outcome: "reply", text };
    }
  }

  // Fallback — should never reach here if planner did its job
  const sys = buildSystemPrompt(ctx, `Reply naturally. Vibe: ${vibe}.`);
  const text = await generateAndClean(sys, `Inbound: "${input.text}"\nReply:`, ctx);
  return { outcome: "reply", text };
}
