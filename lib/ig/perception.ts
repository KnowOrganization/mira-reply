// Perception — Layer 2 of the Mira v2 pipeline.
//
// One LLM call that produces a deep structured "soul read" of the comment.
// Replaces the two-step classifyIntent → detect_vibe pattern with a single
// richer output that the planner and handlers can act on directly.
//
// Not a category label — an understanding.

import { chatJSON } from "./llm";
import { type AssembledContext } from "./ctx";
import { RULEBOOK_PROMPT } from "./rulebook";

// ── Types ──────────────────────────────────────────────────────────────────

export type EmotionalTone =
  | "hype"
  | "curious"
  | "playful"
  | "genuine"
  | "sad"
  | "testing"
  | "aggressive"
  | "neutral";

export type RelationshipSignal =
  | "new_fan"
  | "regular"
  | "superfan"
  | "troll"
  | "business"
  | "personal"; // flirty / family-like

export type Perception = {
  // What does this person actually want?
  what_they_want: string;

  // Emotional energy of the comment
  emotional_tone: EmotionalTone;

  // What kind of relationship are they signalling?
  relationship_signal: RelationshipSignal;

  // Can Mira safely engage? false = troll/hate/inappropriate/spam
  is_safe_to_engage: boolean;

  // What information is missing to answer fully?
  // Empty array = Mira has everything it needs
  knowledge_gaps: string[];

  // True if the comment needs more than one action (reply + link, etc.)
  compound: boolean;

  // 0–1: how confident is Mira it can answer without owner input?
  confidence: number;

  // What would the owner naturally feel reading this?
  owner_would_feel: string;

  // Should this be handled privately (DM/skip) vs publicly?
  sensitive: boolean;
};

// ── Prompt ─────────────────────────────────────────────────────────────────

function buildPerceptionPrompt(ctx: AssembledContext): string {
  const lines: string[] = [
    "You are reading an Instagram comment on behalf of the account owner.",
    "Your job is to deeply understand the comment — not categorise it, but truly read it.",
    "",
    RULEBOOK_PROMPT,
  ];

  if (ctx.personaContext) {
    lines.push(
      "",
      "OWNER FACTS (who you are replying as):",
      ctx.personaContext
    );
  }

  if (ctx.postContext) {
    lines.push("", "POST CONTEXT:", ctx.postContext);
  }

  if (ctx.commenter) {
    lines.push(
      "",
      `COMMENTER HISTORY: ${ctx.commenter.commentCount} previous comment(s). ` +
        `Relationship depth: ${ctx.relationshipDepth}.${ctx.superfanNote}`
    );
  }

  lines.push(
    "",
    "Output ONLY valid JSON matching this exact schema:",
    `{
  "what_they_want": "plain language — what is this person actually asking for or expressing?",
  "emotional_tone": "hype|curious|playful|genuine|sad|testing|aggressive|neutral",
  "relationship_signal": "new_fan|regular|superfan|troll|business|personal",
  "is_safe_to_engage": true,
  "knowledge_gaps": ["list what info is missing to answer — empty if Mira can answer fully"],
  "compound": false,
  "confidence": 0.9,
  "owner_would_feel": "brief — e.g. happy, this is a gear question, creepy",
  "sensitive": false
}`,
    "",
    "Rules:",
    "- is_safe_to_engage: false for troll/hate/spam/sexual/religious-political comments.",
    "- knowledge_gaps: what specific info is missing (e.g. 'jacket brand', 'shoot location'). Empty if post context or owner facts already answer it.",
    "- compound: true if the comment needs BOTH a reply AND a link delivery, or needs a reply AND a knowledge save.",
    "- confidence: 1.0 = owner facts / post context fully answer it. 0.0 = Mira has nothing.",
    "- sensitive: true for flirty, personal relationship, business inquiry, or anything owner should see."
  );

  return lines.join("\n");
}

// ── Fallback ───────────────────────────────────────────────────────────────

const SAFE_FALLBACK: Perception = {
  what_they_want: "unclear",
  emotional_tone: "neutral",
  relationship_signal: "new_fan",
  is_safe_to_engage: true,
  knowledge_gaps: [],
  compound: false,
  confidence: 0.5,
  owner_would_feel: "neutral",
  sensitive: false,
};

// ── Quick perception — no LLM, for clear-cut cases ─────────────────────────

const SPAM_RE =
  /\b(f4f|l4l|follow ?for ?follow|follow ?back|buy (followers|likes|views)|cheap (followers|likes|views)|free followers|followers? promo|grow your (account|page|insta)|boost your|gain followers)\b/i;

const TROLL_RE =
  /\b(hate|trash|worst|ugly|cringe|boring|sucks|fake|stupid|flop|idiot|loser)\b/i;

const LINK_RE =
  /\b(link|dm me|send link|drop link|where to buy|price\??)\b/i;

/**
 * Fast heuristic perception for obvious cases — no LLM spend.
 * Returns null for anything that needs real understanding.
 */
export function quickPercept(text: string): Perception | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;

  if (SPAM_RE.test(t)) {
    return {
      ...SAFE_FALLBACK,
      what_they_want: "spam/promo",
      relationship_signal: "troll",
      is_safe_to_engage: false,
      confidence: 1,
      owner_would_feel: "spam",
      sensitive: false,
    };
  }

  if (TROLL_RE.test(t)) {
    return {
      ...SAFE_FALLBACK,
      what_they_want: "negative attack",
      emotional_tone: "aggressive",
      relationship_signal: "troll",
      is_safe_to_engage: false,
      confidence: 1,
      owner_would_feel: "ignore this",
      sensitive: true,
    };
  }

  // Pure emoji — no need for LLM
  if (/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u.test(text)) {
    return {
      ...SAFE_FALLBACK,
      what_they_want: "emoji reaction",
      emotional_tone: "hype",
      relationship_signal: "new_fan",
      is_safe_to_engage: true,
      knowledge_gaps: [],
      compound: false,
      confidence: 1,
      owner_would_feel: "happy",
      sensitive: false,
    };
  }

  return null; // fall through to LLM
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Perceive an Instagram comment — understand it deeply before deciding anything.
 *
 * Tries a fast heuristic check first; falls back to a single LLM call for
 * anything that needs real understanding.
 */
export async function perceive(
  commentText: string,
  ctx: AssembledContext
): Promise<Perception> {
  // Quick check first — saves an LLM call for obvious cases
  const quick = quickPercept(commentText);
  if (quick) return quick;

  const sys = buildPerceptionPrompt(ctx);

  const result = await chatJSON<Perception>(
    [
      { role: "system", content: sys },
      {
        role: "user",
        content: `Comment to understand: "${commentText}"\n\nOutput JSON:`,
      },
    ],
    SAFE_FALLBACK,
    0.3 // low temp — we want consistent structured output, not creativity
  );

  // Validate the result has the shape we expect; fill gaps with fallback
  return {
    what_they_want: result.what_they_want || SAFE_FALLBACK.what_they_want,
    emotional_tone: result.emotional_tone || SAFE_FALLBACK.emotional_tone,
    relationship_signal:
      result.relationship_signal || SAFE_FALLBACK.relationship_signal,
    is_safe_to_engage: result.is_safe_to_engage ?? SAFE_FALLBACK.is_safe_to_engage,
    knowledge_gaps: Array.isArray(result.knowledge_gaps)
      ? result.knowledge_gaps
      : [],
    compound: result.compound ?? false,
    confidence: typeof result.confidence === "number" ? result.confidence : 0.5,
    owner_would_feel: result.owner_would_feel || SAFE_FALLBACK.owner_would_feel,
    sensitive: result.sensitive ?? false,
  };
}
