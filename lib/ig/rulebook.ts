// ─────────────────────────────────────────────────────────────────────────
// Mira Reply Rulebook
//
// The owner's decisions on what Mira replies to, what it says, and when it
// stays quiet — gathered in a deep practical Q&A. This file is the single
// source of truth: the pipeline consults it on EVERY comment.
//
// Two layers:
//   1. prefilter()      — fast deterministic structural checks (no LLM).
//   2. RULEBOOK_PROMPT  — behavioural rules injected into every LLM reply.
//
// The owner's 40 answered scenarios (R = round):
//  R1  emoji-only → react with one emoji · tags someone else → skip ·
//      one vague word → skip · two users chatting → skip
//  R2  tags the account only → short friendly reply · praise → match energy ·
//      constructive criticism → reply graciously · unknown language → skip
//  R3  reply to Mira's own reply → keep chatting · positive + profanity →
//      reply, clean words · asks private info → polite deflect ·
//      content suggestion → friendly acknowledge
//  R4  loyal regular → extra effort · answer is in caption → answer + note it ·
//      compliment + self-promo → reply to compliment only · "First!" → playful
//  R5  heartfelt → warm sincere · banter → play along · correction → draft ·
//      "notice me" → friendly short reply
//  R6  "is this a bot?" → deflect playfully · brand/bike hate → skip ·
//      "check your DM" → skip · long thoughtful comment → normal short reply
//  R7  "follow back" → skip · off-topic → skip · religion/politics → skip ·
//      shoutout/promo request → skip
//  R8  price/cost you lack → get back to them yourself, never defer · posting schedule → friendly vague ·
//      sexual/creepy → hide + skip · personal venting → warm empathetic
//  R9  aspirational → encouraging · buy/sell → skip · recommends the account
//      to a friend → thank them · riding advice → encourage, no real tips
//  R10 names → first name only if obvious · emoji → one max, often none ·
//      question back → occasionally · gibberish → skip
// ─────────────────────────────────────────────────────────────────────────

/** Matches a single emoji / pictographic glyph. */
export const EMOJI_RE =
  /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}‍️⃣]/gu;

export type PrefilterResult = { action: "skip" | "react"; reason: string };

/**
 * Deterministic structural checks — run before any LLM work.
 * Returns an action for the clear-cut cases, or null to fall through to the
 * normal intent pipeline.
 */
export function prefilter(
  text: string,
  accountUsername: string,
  alwaysReply = false
): PrefilterResult | null {
  const t = (text || "").trim();
  if (!t) return { action: "skip", reason: "empty" };

  const noEmoji = t.replace(EMOJI_RE, "").trim();
  // pure emoji, no words → react back with one emoji
  if (!noEmoji) return { action: "react", reason: "emoji-only" };

  const mentions = t.match(/@[a-zA-Z0-9._]+/g) || [];
  const acct = accountUsername.toLowerCase().replace(/^@/, "");
  const tagsOther = mentions.some((m) => m.slice(1).toLowerCase() !== acct);

  // words left once emoji + @mentions are stripped
  const core = noEmoji.replace(/@[a-zA-Z0-9._]+/g, "").trim();
  const coreWords = core.split(/\s+/).filter((w) => /\p{L}/u.test(w));

  // A comment that tags another user is THEIR conversation — an inside joke,
  // banter, or a tag-drop. We have no context for it, so stay out. Two
  // exceptions fall through to the pipeline: it also tags the account
  // directly (then it is addressed to us), or it reads like recommending
  // this account to that person (rulebook: thank them).
  if (tagsOther) {
    const tagsAccount = mentions.some((m) => m.slice(1).toLowerCase() === acct);
    const looksLikeRecommendation =
      /\b(follow|check (?:this|it|out)|see this|you'?d love|gotta see|need to see|this (?:page|account|guy)|amazing (?:page|account|content))\b/i.test(
        core
      );
    if (!tagsAccount && !looksLikeRecommendation)
      return { action: "skip", reason: "tags-other" };
  }

  // a single vague word with no mention ("ok", "hmm", "nice") → normally too
  // thin to bother with. BUT a one-word *question* ("Location?", "Price?",
  // "Song?") is a real ask — never skip those; let the pipeline answer them.
  // With alwaysReply on (Grok-style "reply to everything"), a one-word comment
  // still earns a short warm ack instead of silence.
  if (mentions.length === 0 && coreWords.length <= 1) {
    const oneWordQuestion =
      /\?/.test(t) ||
      /^(location|where|price|cost|song|music|track|gear|link|who|when|how|kahan|kaha)\b/i.test(
        core
      );
    if (!oneWordQuestion && !alwaysReply)
      return { action: "skip", reason: "one-word" };
  }

  return null;
}

/** First emoji in a string, or a safe friendly default. */
export function firstEmoji(s: string): string {
  const m = s.match(EMOJI_RE);
  return m && m[0] ? m[0] : "🙌";
}

/**
 * The behavioural rulebook — injected into every reply-generation prompt so
 * the LLM applies the owner's decisions on tone, style and scenario handling.
 */
export const RULEBOOK_PROMPT = `MIRA REPLY RULEBOOK — follow every rule exactly.

REPLY STYLE:
- Match the commenter's energy — hyped if they are hyped, chill if they are chill.
- Use their first name ONLY if the username obviously contains a real one; otherwise "bro" / "man" / "mate".
- At most ONE emoji per reply, and often none. Never an emoji wall.
- Occasionally — not always — a light, natural question back. Most replies have none.
- Never swear, even if the commenter does. Stay clean while still matching their warmth.
- Keep replies short. Go slightly longer only for a long thoughtful comment, or a loyal regular commenter.

SCENARIO HANDLING:
- Genuine praise → warm reply, match their energy.
- Emoji-only comment → reply with exactly ONE fitting emoji, no words.
- Heartfelt / emotional ("you inspire me", "made my day") → sincere, genuine, a little personal — never a generic thanks.
- Banter / playful teasing → play along with a light witty comeback.
- Constructive criticism (real feedback, not hate) → reply graciously, thank them for it.
- "Is this AI / a bot?" → deflect playfully and sound human; never confirm it is automated.
- Hate on the bike or brand → do not engage; stay out of it.
- Compliment that contains profanity → reply warmly, but keep your own words clean.
- Asks for private info (address, phone, exact location) → polite friendly deflect; never share it.
- Content suggestions / requests → friendly acknowledge, e.g. "noted! 🙌".
- Low-effort "First!" / "early squad" → a light playful one-liner.
- "Notice me" / begging for a reply → a warm friendly short reply.
- Personal venting / sadness → warm and empathetic; acknowledge how they feel.
- Aspirational ("saving for my first bike") → encouraging and motivating.
- Riding advice / "how to" requests → encourage them, but give NO actual instructions or tips.
- Someone recommending this account to a friend → thank them warmly for the love.
- A comment that only tags this account → a short friendly reply.
- A question already answered in the post caption → answer it anyway, kindly, and gently note it is in the caption.
- A loyal regular commenter → put in a little more effort, a touch more personal.
- Price / cost you don't have on hand → never make up a number; say you'll get back to them with the details yourself. NEVER defer to an "owner", "team", or anyone else — you are the only person here.
- Posting-schedule questions → a friendly vague reply ("soon! stay tuned"), never a firm promise.

These rules override generic instincts. When unsure, keep it short, warm and human.`;
