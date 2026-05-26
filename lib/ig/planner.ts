// Planner — Layer 4 of the Mira v2 pipeline.
//
// Reads the perception (soul read) + assembled context and produces a
// multi-step action plan. This is where compound comments get handled:
// "jacket kahan se mili + mast content 🔥" → [reply, link].
//
// Simple cases (pure ack, obvious skip, trained override) are short-circuited
// before reaching the planner — it only runs for genuinely ambiguous or
// compound situations.

import { chatJSON } from "./llm";
import { type AssembledContext } from "./ctx";
import { type Perception } from "./perception";
import { type ReplyStyle } from "./handlers/reply";

// ── Types ──────────────────────────────────────────────────────────────────

export type ActionStep =
  | {
      tool: "reply";
      args: {
        style: ReplyStyle;
        knownAnswer?: string;
        knownLink?: string;
        allowEscapeToOwner?: boolean;
      };
    }
  | {
      tool: "link";
      // no args needed — handler reads from ctx
    }
  | {
      tool: "clarify";
      args: {
        question: string;
        kind: "context" | "link";
      };
    }
  | {
      tool: "skip";
      args: {
        reason:
          | "spam"
          | "troll"
          | "inappropriate"
          | "business_inquiry"
          | "chatter"
          | "personal_relationship"
          | "low-value"
          | "unsafe";
        hide?: boolean;
      };
    };

export type ActionPlan = {
  steps: ActionStep[];
  rationale: string; // logged only, never sent
};

// ── Fast deterministic planner ─────────────────────────────────────────────
// Handles clear-cut cases without an LLM call.
// Returns null when the situation is too complex for heuristics.

export function quickPlan(
  perception: Perception,
  ctx: AssembledContext,
  hasKBHit: boolean
): ActionPlan | null {
  const { relationship_signal, is_safe_to_engage, emotional_tone, compound, confidence, sensitive } = perception;

  // Unsafe — skip immediately
  if (!is_safe_to_engage) {
    const isTroll =
      relationship_signal === "troll" || emotional_tone === "aggressive";
    const isSpam = perception.what_they_want.includes("spam");
    const isInappropriate = sensitive && relationship_signal === "troll";

    return {
      steps: [
        {
          tool: "skip",
          args: {
            reason: isSpam
              ? "spam"
              : isInappropriate
              ? "inappropriate"
              : isTroll
              ? "troll"
              : "unsafe",
            hide: isTroll || isInappropriate,
          },
        },
      ],
      rationale: `Unsafe to engage: ${perception.what_they_want}`,
    };
  }

  // Business inquiry — never auto-handled
  if (relationship_signal === "business") {
    return {
      steps: [{ tool: "skip", args: { reason: "business_inquiry" } }],
      rationale: "Business/collab inquiry — owner takes these personally",
    };
  }

  // Pure emoji ack — react with one emoji (handled upstream in prefilter)
  // This path shouldn't be reached but is here as a safety net
  if (
    emotional_tone === "hype" &&
    perception.what_they_want === "emoji reaction"
  ) {
    return {
      steps: [{ tool: "reply", args: { style: "warm_ack" } }],
      rationale: "Emoji-only comment — simple warm ack",
    };
  }

  // Simple warm ack — confident, not compound, high confidence
  // ("business" already handled above; "personal" signals flirty → needs LLM)
  if (
    !compound &&
    confidence >= 0.9 &&
    !hasKBHit &&
    perception.knowledge_gaps.length === 0 &&
    (emotional_tone === "hype" || emotional_tone === "genuine") &&
    relationship_signal !== "personal"
  ) {
    return {
      steps: [{ tool: "reply", args: { style: "warm_ack" } }],
      rationale: "Simple warm ack — confident, no knowledge gaps",
    };
  }

  // KB hit — answer from knowledge base
  if (hasKBHit && !compound) {
    return {
      steps: [{ tool: "reply", args: { style: "knowledge" } }],
      rationale: "KB hit — answer from knowledge base directly",
    };
  }

  // KB hit + link needed — compound: reply + deliver link
  if (hasKBHit && compound) {
    return {
      steps: [
        { tool: "reply", args: { style: "knowledge" } },
        { tool: "link" },
      ],
      rationale: "KB hit + link requested — compound action",
    };
  }

  return null; // fall through to LLM planner
}

// ── LLM planner prompt ─────────────────────────────────────────────────────

function buildPlannerPrompt(
  perception: Perception,
  ctx: AssembledContext
): string {
  return [
    "You are planning the actions Mira will take for an Instagram comment.",
    "You have already understood the comment deeply. Now decide what to DO.",
    "",
    "PERCEPTION:",
    `- What they want: ${perception.what_they_want}`,
    `- Emotional tone: ${perception.emotional_tone}`,
    `- Relationship: ${perception.relationship_signal}`,
    `- Knowledge gaps: ${perception.knowledge_gaps.join(", ") || "none"}`,
    `- Confidence Mira can answer: ${perception.confidence}`,
    `- Compound (needs multiple actions): ${perception.compound}`,
    `- Sensitive: ${perception.sensitive}`,
    "",
    ctx.postContext ? `POST CONTEXT:\n${ctx.postContext}` : "No post context.",
    "",
    "AVAILABLE TOOLS:",
    '- "reply" — generate a text reply. styles: warm_ack | knowledge | question_answer | casual_personal | general',
    '- "link" — find and deliver the post link via DM + post public comment',
    '- "clarify" — ask the owner for missing context or a link',
    '- "skip" — do nothing (for unsafe/spam/business/chatter)',
    "",
    "RULES:",
    "- confidence >= 0.7 + no knowledge gaps → reply (don't clarify).",
    "- confidence < 0.4 + post-specific question → clarify with context kind.",
    "- link asked + link exists on post → reply + link (compound).",
    "- link asked + no link on post → link (clarify kind link).",
    "- personal/flirty → reply with casual_personal style (reviewOnly).",
    "- business → skip with business_inquiry reason.",
    "- compound = true → include both reply and link steps.",
    "",
    'Output ONLY valid JSON: {"steps":[{"tool":"...","args":{...}}],"rationale":"..."}',
    "Steps execute in order. Include only what is actually needed.",
  ].join("\n");
}

// ── Fallback plan ──────────────────────────────────────────────────────────

const FALLBACK_PLAN: ActionPlan = {
  steps: [
    {
      tool: "reply",
      args: { style: "general", allowEscapeToOwner: true },
    },
  ],
  rationale: "Fallback — general reply with owner escape",
};

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Produce an action plan for one comment.
 *
 * Tries the fast deterministic path first.
 * Falls back to a single LLM call for complex/compound situations.
 */
export async function plan(
  perception: Perception,
  ctx: AssembledContext,
  hasKBHit: boolean
): Promise<ActionPlan> {
  // Fast path — handles ~60-70% of comments without an LLM call
  const fast = quickPlan(perception, ctx, hasKBHit);
  if (fast) return fast;

  // LLM path — for complex, compound, or ambiguous comments
  const prompt = buildPlannerPrompt(perception, ctx);

  const result = await chatJSON<ActionPlan>(
    [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `Plan the actions for this comment. Output JSON only.`,
      },
    ],
    FALLBACK_PLAN,
    0.3 // low temp — consistent structured output
  );

  // Validate structure
  if (!Array.isArray(result.steps) || result.steps.length === 0) {
    return FALLBACK_PLAN;
  }

  return {
    steps: result.steps,
    rationale: result.rationale || "LLM plan",
  };
}
