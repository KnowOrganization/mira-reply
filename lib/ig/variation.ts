// Reply variation — the anti-ban engine. Instagram flags accounts that post
// the same text repeatedly. Every reply Mira sends must be unique and match
// the commenter's vibe.

/** Lowercase, strip punctuation/emoji, collapse whitespace. */
export function normalize(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Word n-grams (trigrams by default) for phrase-level similarity. */
export function shingles(t: string, n = 3): string[] {
  const w = normalize(t).split(" ").filter(Boolean);
  if (w.length < n) return w.length ? [w.join(" ")] : [];
  const out: string[] = [];
  for (let i = 0; i <= w.length - n; i++) out.push(w.slice(i, i + n).join(" "));
  return out;
}

/** Jaccard similarity of two token lists. */
export function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

/**
 * Similarity of two replies, 0–1. Blends token-set overlap (catches short
 * acks) with trigram overlap (catches reused phrasing). Exact match = 1.
 */
export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const tok = jaccard(na.split(" "), nb.split(" "));
  const tri = jaccard(shingles(a), shingles(b));
  return Math.max(tok, tri);
}

/** Is this candidate too close to anything sent recently? */
export function tooSimilar(
  candidate: string,
  recent: string[],
  threshold: number
): { similar: boolean; worst: number } {
  let worst = 0;
  for (const r of recent) {
    const s = similarity(candidate, r);
    if (s > worst) worst = s;
  }
  return { similar: worst >= threshold, worst };
}

// CJK scripts the local model occasionally leaks into replies.
const STRAY_CJK =
  /[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/gu;

/** Drop control characters but keep tab, newline and carriage return. */
function stripControl(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    if (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) continue;
    out += ch;
  }
  return out;
}

/**
 * Clean a model-generated reply: drop surrounding quotes, strip stray CJK
 * tokens the local model sometimes leaks, remove control chars. Emoji and
 * Latin/Devanagari (Hinglish) are kept.
 */
export function sanitizeReply(text: string): string {
  return stripControl(text)
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(STRAY_CJK, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type Vibe = "hype" | "funny" | "question" | "critical" | "chill";

/** Read the commenter's tone so the reply can mirror it. Heuristic, no LLM. */
export function detectVibe(text: string): Vibe {
  const t = text.toLowerCase();
  if (/\b(haha+|lol|lmao|lmfao|rofl|hehe)\b/.test(t) || /😂|🤣/u.test(text))
    return "funny";
  if (/\b(hate|trash|worst|ugly|cringe|boring|sucks|fake|stupid|flop)\b/.test(t))
    return "critical";
  const hype = (text.match(/🔥|💯|😍|🤩|❤|🙌|👏|⚡|✨|💪/gu) || []).length;
  const bangs = (text.match(/!/g) || []).length;
  const caps = text.length > 6 && text === text.toUpperCase() && /[A-Z]/.test(text);
  if (hype >= 2 || bangs >= 2 || caps) return "hype";
  if (text.includes("?")) return "question";
  return "chill";
}

const LENGTHS = ["one very short line", "one short line", "two short lines"];
const EMOJI = ["no emoji", "no emoji", "exactly one emoji", "one emoji"];
const OPENERS = [
  "jump straight to the point",
  "react first, then answer",
  "open casual and loose",
  "answer plainly, no preamble",
];

/** A randomized style directive so even first-try replies spread out. */
export function styleSeed(): string {
  const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
  return `STYLE: ${pick(LENGTHS)}; ${pick(EMOJI)}; ${pick(OPENERS)}. Use fresh wording — never a stock phrase.`;
}
