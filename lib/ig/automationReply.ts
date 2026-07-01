// Automation node message generation — every reply/DM-sending automation node
// (comment_reply, opening/text_message, card_message, ask_follow, follow_gate,
// followup_message) has no manual text field anymore. This is the single call
// site that turns a node's fixed "purpose" + live account/post/persona context
// into an actual message, via the same chat()/sanitizeReply() pipeline the
// organic reply and DM engines use.

import { chat } from "./llm";
import { sanitizeReply } from "./variation";
import { type AssembledContext } from "./ctx";
import { RULEBOOK_PROMPT } from "./rulebook";

export type AutomationPurpose =
  | "comment_reply"
  | "dm_message"
  | "card_message"
  | "ask_follow"
  | "follow_gate"
  | "followup_message";

const PURPOSE_HINTS: Record<AutomationPurpose, string> = {
  comment_reply:
    "Reply publicly to this comment, naturally, 1-2 short lines.",
  dm_message:
    "Send a warm opening DM to someone who just triggered this automation (e.g. commented or messaged a keyword). Invite them into the conversation naturally.",
  card_message:
    "Write a short, compelling message (title-like first line, one-line follow-up) continuing this DM conversation.",
  ask_follow:
    "Warmly ask them to follow the account, briefly explain the benefit, stay natural and non-pushy.",
  follow_gate:
    "They tried to continue but haven't followed yet. Gently, warmly ask them to follow first before you continue.",
  followup_message:
    "Send a friendly check-in follow-up — they haven't responded in a while. Keep it light, no pressure.",
};

export async function generateAutomationMessage(
  purpose: AutomationPurpose,
  ctx: AssembledContext,
  inboundText?: string,
  extraFacts?: string
): Promise<string> {
  const sys = [
    "Tu Mira — Instagram account holder ke behalf message likhta hai.",
    "LANGUAGE: mirror the inbound text's language if given, else default to the owner's usual language (English/Hinglish).",
    "Keep it short and natural — usually 1-2 lines. At most one emoji, often none. No AI tone, no formal language. Output ONLY the message text.",
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
    ctx.postContext && `POST CONTEXT:\n${ctx.postContext}`,
    extraFacts,
    PURPOSE_HINTS[purpose],
  ]
    .filter(Boolean)
    .join("\n\n");

  const user = inboundText
    ? `Inbound: "${inboundText}"\nMessage (plain text):`
    : "Message (plain text):";

  return sanitizeReply(
    await chat(
      [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      { temperature: 0.85 }
    )
  );
}
