import { chatJSON } from "./llm";

export type Intent =
  | "simple_acknowledgement"
  | "question_general"
  | "question_post_specific"
  | "link_request"
  | "spam_promo"
  | "personal_relationship"
  | "negative_attack"
  | "business_inquiry"
  | "chatter"
  | "inappropriate"
  | "unclear";

const SIMPLE_TOKENS = [
  "🔥", "❤", "❤️", "👏", "🙌", "💯", "👍", "😍", "🤩", "🥰",
  "wow", "nice", "great", "amazing", "beautiful", "lit", "dope",
  "kya baat", "mast", "bhai mast", "zabardast", "shandar", "love it",
  "love this", "incredible", "stunning", "🤙", "💪",
];

// Blatant spam — caught before the link-keyword check so "dm me, buy
// followers" is shielded as spam, not mistaken for a link request.
const SPAM_RE =
  /\b(f4f|l4l|follow ?for ?follow|follow ?back|buy (followers|likes|views)|cheap (followers|likes|views)|free followers|followers? promo|grow your (account|page|insta)|boost your|gain followers)\b/i;

export function quickClassify(text: string): Intent | null {
  const t = text.trim().toLowerCase();
  if (!t) return "unclear";
  if (SPAM_RE.test(t)) return "spam_promo";
  // pure emoji or ≤3 word praise
  if (/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u.test(text)) return "simple_acknowledgement";
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length <= 4 && SIMPLE_TOKENS.some((tok) => t.includes(tok))) return "simple_acknowledgement";
  if (/\b(link|dm me|share location|send link|drop link|location\?|where to buy|price\??)\b/i.test(t)) return "link_request";
  return null;
}

export async function classifyIntent(text: string, hasPostContext: boolean): Promise<Intent> {
  const quick = quickClassify(text);
  if (quick) return quick;

  type Out = { intent: Intent };
  const j = await chatJSON<Out>(
    [
      {
        role: "system",
        content:
          "Classify Instagram comment into ONE: simple_acknowledgement, question_general, question_post_specific, link_request, spam_promo, personal_relationship, negative_attack, business_inquiry, chatter, inappropriate, unclear. " +
          "question_post_specific = needs info about THIS specific post (location, song, gear, what is it). " +
          "question_general = answerable with common knowledge or owner persona. " +
          "link_request = explicitly asks for link/url/dm with link. " +
          "personal_relationship = endearment/family ('babe', 'jaan', 'love', 'mom'). " +
          "business_inquiry = explicit brand collab, sponsorship, paid promotion, or a request for business contact. " +
          "chatter = off-topic remarks, follow-for-follow ('follow back'), shoutout/promo requests ('feature me'), buy/sell posts, religion or politics, or two users talking to each other. " +
          "inappropriate = sexual, creepy, or vulgar advances. " +
          (hasPostContext ? "Post has context notes available. " : "Post has NO context notes. ") +
          'Output JSON only: {"intent":"..."}',
      },
      { role: "user", content: text },
    ],
    { intent: "unclear" }
  );
  return j.intent || "unclear";
}
