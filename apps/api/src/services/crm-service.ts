// CRM business logic (spec Phase 1): contacts, conversations, window-gated
// human sends. No HTTP here — handlers own status codes.
import { query } from "@shaiz/db";
import { enqueueOutbound } from "@/lib/ig/ingestQueue";
import { recordOutboundMessage, importDMThreads } from "@/lib/ig/crm";
import { getDMThreads } from "@/lib/ig/graph";
import { publish } from "@/lib/ig/bus";
import { readStore } from "@/lib/ig/store";
import { assembleContext } from "@/lib/ig/ctx";
import { generateAutomationMessage } from "@/lib/ig/automationReply";
import { AiKeyMissingError } from "@/lib/ig/llm";
import {
  canSend, STANDARD_WINDOW_MS, HUMAN_AGENT_WINDOW_MS,
  type WindowState, type SendDecision,
} from "@/lib/ig/window";

export type ConversationRow = {
  id: string; contact_id: string; folder: string; status: string;
  window_expires_at: number | null; human_agent_window_expires_at: number | null;
  assigned_to: string | null; ai_mode: string; notes: string;
  created_at: number; updated_at: number;
};

// ── contacts ────────────────────────────────────────────────────────────────

/**
 * Pull the account's latest DM threads from Instagram into the inbox. Called on
 * login so a freshly-connected (or just-cleared) inbox shows real history, not
 * an empty list. Idempotent — re-running merges with what webhooks delivered.
 * Own-message detection needs BOTH ids (the conversations API tags the owner by
 * its real IG id, not the app-scoped one).
 */
export async function syncRecentDMs(
  accountId: string,
  limit = 50
): Promise<{ threads: number; messages: number } | { error: string }> {
  const [acct] = await query<{ ig_user_id: string; ig_id: string | null; access_token: string }>(
    `SELECT ig_user_id, ig_id, access_token FROM accounts WHERE ig_user_id = $1`,
    [accountId]
  );
  if (!acct?.access_token) return { error: "not connected" };
  const ownIds = [acct.ig_user_id, acct.ig_id].filter(Boolean) as string[];
  try {
    const threads = await getDMThreads(acct.ig_user_id, acct.access_token, ownIds, limit);
    return await importDMThreads(accountId, threads);
  } catch (e) {
    return { error: String(e) };
  }
}

// ── conversations / inbox ───────────────────────────────────────────────────

export async function listConversations(accountId: string, folder?: string) {
  const args: unknown[] = [accountId];
  let cond = "c.account_id = $1";
  if (folder) {
    args.push(folder);
    cond += ` AND c.folder = $${args.length}`;
  }
  return query(
    `SELECT c.id, c.folder, c.status, c.window_expires_at, c.human_agent_window_expires_at,
            c.assigned_to, c.ai_mode, c.notes, c.updated_at,
            c.ai_draft, c.ai_draft_at, c.referral, c.pending_slot,
            ct.id as contact_id, ct.igsid, ct.display_name, ct.tags, ct.lead_status,
            dl.decision as ai_decision, dl.confidence as ai_confidence, dl.risk_level as ai_risk, dl.reason as ai_reason,
            (SELECT body->>'text' FROM crm_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_text,
            (SELECT m.direction FROM crm_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_direction
     FROM crm_conversations c JOIN contacts ct ON ct.id = c.contact_id
     LEFT JOIN LATERAL (
       SELECT decision, confidence, risk_level, reason FROM decision_log d
       WHERE d.conversation_id = c.id ORDER BY d.created_at DESC LIMIT 1
     ) dl ON true
     WHERE ${cond}
     ORDER BY c.updated_at DESC LIMIT 200`,
    args
  );
}

export async function getConversation(accountId: string, conversationId: string) {
  const [conversation] = await query<ConversationRow & { igsid: string; display_name: string | null }>(
    `SELECT c.*, ct.igsid, ct.display_name FROM crm_conversations c
     JOIN contacts ct ON ct.id = c.contact_id
     WHERE c.account_id = $1 AND c.id = $2`,
    [accountId, conversationId]
  );
  if (!conversation) return null;
  const messages = await query(
    `SELECT id, mid, direction, type, body, sent_by, seen_at, created_at
     FROM crm_messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 500`,
    [conversationId]
  );
  return { conversation, messages };
}

const CONV_PATCH_FIELDS = new Set(["folder", "status", "assigned_to", "ai_mode", "notes"]);

export async function patchConversation(accountId: string, conversationId: string, patch: Record<string, unknown>) {
  const sets: string[] = [];
  const args: unknown[] = [accountId, conversationId];
  for (const [k, v] of Object.entries(patch)) {
    if (!CONV_PATCH_FIELDS.has(k)) continue;
    args.push(v);
    sets.push(`${k} = $${args.length}`);
  }
  if (!sets.length) return null;
  const rows = await query<ConversationRow>(
    `UPDATE crm_conversations SET ${sets.join(", ")} WHERE account_id = $1 AND id = $2 RETURNING *`,
    args
  );
  return rows[0] ?? null;
}

// Generate (or regenerate) Mira's reply draft for a conversation, on demand.
// This is THE producer for ai_draft — same generator the automation engine
// uses (generateAutomationMessage → chat → NIM), so the voice is identical
// everywhere. Throws AiKeyMissingError until a key is configured.
export async function generateDraft(
  accountId: string,
  conversationId: string,
): Promise<{ ok: true; draft: string } | { ok: false; status: number; reason: string }> {
  const found = await getConversation(accountId, conversationId);
  if (!found) return { ok: false, status: 404, reason: "conversation not found" };
  const { conversation, messages } = found;

  type MsgRow = { direction: string; body: { text?: string } | null };
  const lastInbound = ([...messages] as MsgRow[]).reverse().find(
    (m) => m.direction === "in" && !!m.body?.text?.trim()
  );
  const inboundText = lastInbound?.body?.text?.trim();
  if (!inboundText) return { ok: false, status: 400, reason: "no inbound message to reply to" };

  const store = await readStore(accountId);
  if (!store.account) return { ok: false, status: 404, reason: "account not connected" };

  let draft: string;
  try {
    const ctx = await assembleContext(inboundText, undefined, conversation.igsid ?? "", store);
    draft = await generateAutomationMessage("dm_message", ctx, inboundText);
  } catch (e) {
    if (e instanceof AiKeyMissingError) return { ok: false, status: 503, reason: e.message };
    return { ok: false, status: 502, reason: e instanceof Error ? e.message : "generation failed" };
  }
  if (!draft.trim()) return { ok: false, status: 502, reason: "generation produced empty text" };

  await query(
    `UPDATE crm_conversations SET ai_draft = $1, ai_draft_at = $2 WHERE account_id = $3 AND id = $4`,
    [draft, Date.now(), accountId, conversationId]
  );
  publish({ type: "draft", draftId: conversationId, ts: Date.now() });
  return { ok: true, draft };
}

// Dismiss the parked AI draft — a verb, not a PATCH field: dismissal is an
// auditable decision (owner rejected Mira's draft) and must never let a client
// write arbitrary draft text.
export async function dismissDraft(accountId: string, conversationId: string) {
  const rows = await query<ConversationRow>(
    `UPDATE crm_conversations SET ai_draft = NULL, ai_draft_at = NULL
     WHERE account_id = $1 AND id = $2 RETURNING *`,
    [accountId, conversationId]
  );
  const conversation = rows[0] ?? null;
  if (!conversation) return null;
  await query(
    `INSERT INTO audit_log (account_id, actor, action, conversation_id, reason, created_at)
     VALUES ($1, 'human', 'draft_dismiss', $2, $3, $4)`,
    [accountId, conversationId, "owner dismissed Mira's draft", Date.now()]
  );
  // live nudge so other clients drop the parked draft too
  publish({ type: "draft", draftId: conversationId, ts: Date.now() });
  return conversation;
}

// ── window-gated human send ─────────────────────────────────────────────────

export type SendResult =
  | { ok: true; messageId: string; via: "standard" | "human_agent" }
  | { ok: false; status: number; reason: string };

/**
 * Human send from the Inbox (spec Phase 1 acceptance: "a human can read and
 * reply to DMs in-window"). Gate order: standard 24h window first; if closed,
 * the human-agent 7-day window applies because this endpoint is only ever a
 * human action (sentBy=human is enforced here, not caller-supplied).
 */
export async function sendHumanReply(
  accountId: string,
  conversationId: string,
  text: string,
  imageUrl?: string,
): Promise<SendResult> {
  const trimmed = (text ?? "").trim();
  const img = (imageUrl ?? "").trim();
  if (!trimmed && !img) return { ok: false, status: 400, reason: "empty message" };
  if (trimmed.length > 1000) return { ok: false, status: 400, reason: "message exceeds 1000 bytes (spec §3.4)" };

  const found = await getConversation(accountId, conversationId);
  if (!found) return { ok: false, status: 404, reason: "conversation not found" };
  const { conversation } = found;

  // Reconstruct engine state per window from its OWN persisted expiry — the
  // columns are the source of truth (both set only by inbound DMs, but they
  // can be moved independently, e.g. ops closing a window early).
  const now = Date.now();
  const standardState: WindowState = {
    lastUserMessageAt: conversation.window_expires_at == null
      ? null
      : conversation.window_expires_at - STANDARD_WINDOW_MS,
  };
  const humanAgentState: WindowState = {
    lastUserMessageAt: conversation.human_agent_window_expires_at == null
      ? null
      : conversation.human_agent_window_expires_at - HUMAN_AGENT_WINDOW_MS,
  };
  let via: "standard" | "human_agent" = "standard";
  let decision: SendDecision = canSend("standard", standardState, { sentBy: "human" }, now);
  if (!decision.allowed) {
    via = "human_agent";
    decision = canSend("human_agent", humanAgentState, { sentBy: "human" }, now);
  }
  if (!decision.allowed) return { ok: false, status: 409, reason: decision.reason };

  // An image send rides the same outbound queue — Graph takes an attachment
  // message with a PUBLICLY fetchable url (Meta's CDN pulls it).
  const message = img
    ? { attachment: { type: "image", payload: { url: img, is_reusable: false } } }
    : { text: trimmed };
  await enqueueOutbound({
    accountId,
    id: `crm_${conversationId}_${now}`,
    type: "dm",
    recipient: { id: conversation.igsid },
    message,
    igsid: conversation.igsid,
  });
  const messageId = await recordOutboundMessage(accountId, conversationId, {
    body: img ? { imageUrl: img, ...(trimmed ? { text: trimmed } : {}) } : { text: trimmed },
    sentBy: "human",
  });
  // live nudge — the sent bubble appears instantly on the sender's other tabs
  publish({ type: "sent", accountId, conversationId, replyId: messageId, ts: Date.now() });
  // the assisted draft is consumed by the human send (edited or not). The
  // folder is NOT changed — inbox folders are user-managed only.
  await query(
    `UPDATE crm_conversations SET ai_draft = NULL, ai_draft_at = NULL WHERE id = $1`,
    [conversationId]
  );
  await query(
    `INSERT INTO audit_log (account_id, actor, action, conversation_id, reason, created_at)
     VALUES ($1, 'human', 'dm_send', $2, $3, $4)`,
    [accountId, conversationId, `via ${via}: ${decision.reason}`, now]
  );
  return { ok: true, messageId, via };
}

// ── basic analytics (spec Phase 2): response time + leads captured ──────────

export async function getCrmAnalytics(accountId: string) {
  const since = Date.now() - 7 * 24 * 3600_000;
  // avg first-response time: for each inbound message, the gap to the next
  // outbound in the same conversation (7-day window, capped at 24h outliers)
  const [rt] = await query<{ avg_ms: number | null; samples: number }>(
    `SELECT AVG(diff)::float8 AS avg_ms, COUNT(*)::int AS samples FROM (
       SELECT (
         SELECT MIN(o.created_at) FROM crm_messages o
         WHERE o.conversation_id = i.conversation_id
           AND o.direction = 'out' AND o.created_at > i.created_at
       ) - i.created_at AS diff
       FROM crm_messages i
       WHERE i.account_id = $1 AND i.direction = 'in' AND i.created_at > $2
     ) gaps WHERE diff IS NOT NULL AND diff < 86400000`,
    [accountId, since]
  );
  const [leads] = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM contacts WHERE account_id = $1 AND (phone IS NOT NULL OR email IS NOT NULL)`,
    [accountId]
  );
  const [totals] = await query<{ contacts: number; conversations: number; drafts: number }>(
    `SELECT
       (SELECT COUNT(*)::int FROM contacts WHERE account_id = $1) AS contacts,
       (SELECT COUNT(*)::int FROM crm_conversations WHERE account_id = $1) AS conversations,
       (SELECT COUNT(*)::int FROM crm_conversations WHERE account_id = $1 AND ai_draft IS NOT NULL) AS drafts`,
    [accountId]
  );
  return {
    avgResponseMs: rt?.avg_ms == null ? null : Math.round(rt.avg_ms),
    responseSamples: rt?.samples ?? 0,
    leadsCaptured: leads?.n ?? 0,
    contactsTotal: totals?.contacts ?? 0,
    conversationsTotal: totals?.conversations ?? 0,
    pendingDrafts: totals?.drafts ?? 0,
  };
}
