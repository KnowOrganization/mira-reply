// Opportunity engine — a scalable cascade that watches every inbound DM and
// catches business opportunities (sponsorship / brand_deal / collab / podcast /
// investor / partnership / media) at high recall + low LLM cost:
//
//   Stage 0  keyword pre-filter   — ~0 cost, every DM, recall-tuned
//   Stage 1  semantic pre-filter  — embedding cosine vs prototype phrases
//   Stage 2  LLM classify         — candidates only, ONCE per conversation
//                                    (drafted convos reuse the draft's result, free)
//   record   upsert + triage      — one row per conversation, confidence-gated
//
// At lakhs of users ~99% of DMs die at Stage 0/1 (no LLM); the rest classify
// cheaply once per conversation. Runs in the worker → horizontal scale.

import { v4 as uuidv4 } from "uuid";
import { query } from "@shaiz/db";
import { embed, cosine, isEmbedAvailable } from "./embed";
import { claimOnce, k } from "./redis";
import { publish } from "./bus";
import { chatJSON } from "./llm";

export const OPPORTUNITY_TYPES = new Set([
  "sponsorship", "brand_deal", "collab", "podcast", "investor", "partnership", "media",
]);

export type DetectedOpp = { type: string; confidence: number; value_estimate: number | null; rationale?: string };

// ── Stage 0: keyword pre-filter (broad, recall-tuned) ───────────────────────
const KEYWORD_RE = new RegExp(
  [
    "sponsor", "sponsorship", "collab", "collaborat", "brand deal", "brand partnership",
    "paid (promo|partnership|post|collab)", "paid promotion", "promote", "promotion",
    "ambassador", "\\bUGC\\b", "rate card", "\\brates?\\b", "budget", "campaign",
    "barter", "gift(ed|ing)?", "\\bPR\\b", "press", "feature you", "work (with|together)",
    "partner with", "partnership", "investor", "invest", "funding", "podcast", "interview you",
    "press release", "media kit", "deliverables", "\\bfee\\b", "compensat", "commission",
    "affiliate", "endorse", "shoutout", "\\bdeal\\b",
    "\\$\\s?\\d", "₹\\s?\\d", "\\d+\\s?(k|lakh|lakhs|cr|crore)", "rs\\.?\\s?\\d",
  ].join("|"),
  "i"
);

export function keywordCandidate(text: string): boolean {
  return KEYWORD_RE.test(text);
}

// ── Stage 1: semantic pre-filter (catches paraphrases keywords miss) ────────
const PROTOTYPES = [
  "we'd love to collaborate with you on a paid sponsorship campaign",
  "our brand wants to partner with you, what are your rates",
  "interested in a paid brand deal / promotion for our product",
  "we'd like to send you our product to feature (gifting / barter)",
  "would you come on our podcast / do an interview",
  "we're an investor interested in funding your work",
  "media / press opportunity — we'd like to feature you",
  "looking for a long-term brand ambassador partnership",
];
const SIM_THRESHOLD = 0.72; // permissive-ish; the LLM stage filters precision
let protoVecs: number[][] | null = null;
let protoTried = false;

async function ensurePrototypes(): Promise<number[][] | null> {
  if (protoVecs || protoTried) return protoVecs;
  protoTried = true;
  const vecs: number[][] = [];
  for (const p of PROTOTYPES) {
    const v = await embed(`search_document: ${p}`);
    if (v) vecs.push(v);
  }
  protoVecs = vecs.length ? vecs : null;
  return protoVecs;
}

async function semanticCandidate(text: string): Promise<boolean> {
  if (isEmbedAvailable() === false) return false; // embeddings down → keyword-only
  const protos = await ensurePrototypes();
  if (!protos?.length) return false;
  const v = await embed(`search_query: ${text}`);
  if (!v) return false;
  return protos.some((p) => cosine(v, p) >= SIM_THRESHOLD);
}

/** Stage 0 + 1: is this message worth an LLM look? Cheap; most DMs return false. */
export async function isOpportunityCandidate(text: string): Promise<boolean> {
  if (!text || text.trim().length < 4) return false;
  if (keywordCandidate(text)) return true;
  return semanticCandidate(text);
}

// ── Stage 2: LLM classify (candidates only) ─────────────────────────────────
const CLASSIFY_SYSTEM =
  "You classify whether an Instagram DM is a BUSINESS OPPORTUNITY for the creator. " +
  "Types: sponsorship, brand_deal, collab, podcast, investor, partnership, media. " +
  "Reply ONLY JSON: {\"is_opportunity\": bool, \"type\": one-of-the-types-or-null, " +
  "\"confidence\": 0.0-1.0, \"value_estimate\": number-or-null (INR if a budget/rate is stated), " +
  "\"rationale\": \"one short sentence naming the SPECIFIC signal that makes this an opportunity — what they're proposing/offering/asking (not a generic label)\"}. " +
  "Fan messages, questions, spam, greetings → is_opportunity:false. Be precise on type.";

async function classifyWithLLM(text: string): Promise<DetectedOpp | null> {
  const out = await chatJSON<{ is_opportunity?: boolean; type?: string; confidence?: number; value_estimate?: number | null; rationale?: string }>(
    [
      { role: "system", content: CLASSIFY_SYSTEM },
      { role: "user", content: text.slice(0, 1500) },
    ],
    { is_opportunity: false },
    0.2
  );
  if (!out.is_opportunity || !out.type || !OPPORTUNITY_TYPES.has(out.type)) return null;
  return { type: out.type, confidence: typeof out.confidence === "number" ? out.confidence : 0.6, value_estimate: out.value_estimate ?? null, rationale: out.rationale };
}

// ── record + triage (dedup: one row per conversation) ───────────────────────
function triageStatus(confidence: number): "open" | "needs_review" | null {
  if (confidence >= 0.7) return "open";
  if (confidence >= 0.5) return "needs_review";
  return null; // too weak — drop
}

export async function recordOpportunity(
  accountId: string,
  conversationId: string,
  igsid: string,
  opp: DetectedOpp,
  fallbackReason: string
): Promise<void> {
  const status = triageStatus(opp.confidence ?? 0);
  if (!status || !OPPORTUNITY_TYPES.has(opp.type)) return;

  // "Why flagged" = the model's rationale (a real sentence), not the raw message.
  const reason = (opp.rationale?.trim() || fallbackReason).slice(0, 280);

  // dedup: update the existing live row for this conversation, else insert
  const existing = await query<{ id: string; confidence: number; value_estimate: number | null }>(
    `SELECT id, confidence, value_estimate FROM opportunities
     WHERE account_id = $1 AND conversation_id = $2 AND status IN ('open','needs_review')
     ORDER BY detected_at DESC LIMIT 1`,
    [accountId, conversationId]
  );

  if (existing[0]) {
    const e = existing[0];
    const stronger = (opp.confidence ?? 0) >= (e.confidence ?? 0); // keep the strongest signal's rationale
    const nextConf = Math.max(e.confidence ?? 0, opp.confidence ?? 0);
    const nextVal = Math.max(e.value_estimate ?? 0, opp.value_estimate ?? 0) || null;
    await query(
      `UPDATE opportunities
       SET confidence = $2, value_estimate = $3,
           type = CASE WHEN $8 THEN $4 ELSE type END,
           reason = CASE WHEN $8 THEN $5 ELSE reason END,
           status = CASE WHEN status = 'needs_review' AND $6 = 'open' THEN 'open' ELSE status END,
           detected_at = $7
       WHERE id = $1`,
      [e.id, nextConf, nextVal, opp.type, reason, status, Date.now(), stronger]
    );
  } else {
    await query(
      `INSERT INTO opportunities (id, account_id, conversation_id, type, confidence, value_estimate, status, reason, detected_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [uuidv4(), accountId, conversationId, opp.type, opp.confidence, opp.value_estimate ?? null, status, reason, Date.now()]
    );
  }

  // best-effort: resolve the contact's @username if we only have the IGSID, so
  // the opportunity card/drawer shows a name instead of a numeric id
  query<{ display_name: string | null; access_token: string }>(
    `SELECT c.display_name, a.access_token FROM contacts c, accounts a
     WHERE c.account_id = $1 AND c.igsid = $2 AND a.ig_user_id = $1`,
    [accountId, igsid]
  ).then(async (rows) => {
    if (rows[0] && !rows[0].display_name && rows[0].access_token) {
      const { resolveContactName } = await import("./crm");
      await resolveContactName(accountId, igsid, rows[0].access_token).catch(() => {});
    }
  }).catch(() => {});

  publish({ type: "log", level: "info", msg: `opportunity: ${opp.type} (${Math.round((opp.confidence ?? 0) * 100)}%, ${status}) from @${igsid}`, ts: Date.now() });
  publish({ type: "opportunity", accountId, conversationId, opType: opp.type, status, ts: Date.now() });
}

/**
 * Main entry — called from ingest on EVERY inbound DM. Cheap by default.
 *  - draftOpp present (drafted convos): use it directly (free, best quality).
 *  - else: cheap pre-filter; only candidates → LLM classify, once per
 *    conversation (Redis claim). Non-candidates pass with zero LLM cost.
 */
export async function detectOpportunity(
  accountId: string,
  conversationId: string,
  igsid: string,
  text: string,
  draftOpp?: DetectedOpp | null
): Promise<void> {
  try {
    if (draftOpp && OPPORTUNITY_TYPES.has(draftOpp.type) && (draftOpp.confidence ?? 0) >= 0.5) {
      await recordOpportunity(accountId, conversationId, igsid, draftOpp, text.slice(0, 280));
      return;
    }
    // cheap pre-filter — most DMs stop here, no LLM
    if (!(await isOpportunityCandidate(text))) return;
    // classify a conversation at most once per window (dedup the LLM call)
    if (!(await claimOnce(k.oppClassified(accountId, conversationId), 24 * 60 * 60))) return;
    const opp = await classifyWithLLM(text);
    if (opp) await recordOpportunity(accountId, conversationId, igsid, opp, text.slice(0, 280));
  } catch (e) {
    publish({ type: "log", level: "warn", msg: `opportunity detect failed: ${String(e).slice(0, 160)}`, ts: Date.now() });
  }
}
