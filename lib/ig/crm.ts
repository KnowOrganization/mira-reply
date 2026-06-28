// CRM ingestion (spec Phase 1): every inbound IGSID becomes a Contact, every
// DM thread a Conversation, every DM a Message row. Called from the worker's
// ingest processors — additive observers; a CRM failure must never break the
// reply pipeline (callers wrap + log).
import { v4 as uuidv4 } from "uuid";
import { query } from "@shaiz/db";
import { STANDARD_WINDOW_MS, HUMAN_AGENT_WINDOW_MS } from "./window";

export type ContactRef = { contactId: string; conversationId: string };

/**
 * Best-effort: fill a contact's display_name from their IG profile. DM webhooks
 * carry no sender handle, so the inbox shows a bare IGSID until this resolves
 * the name. No-op if a name is already set or Meta can't resolve it.
 */
export async function resolveContactName(accountId: string, igsid: string, token: string): Promise<void> {
  const { getUserProfile } = await import("./graph");
  const prof = await getUserProfile(igsid, token);
  const label = prof?.username || prof?.name;
  if (!label) return;
  await query(
    `UPDATE contacts SET display_name = $3
     WHERE account_id = $1 AND igsid = $2 AND (display_name IS NULL OR display_name = '')`,
    [accountId, igsid, label]
  );
}

/**
 * Upsert contact + its conversation, bumping last-interaction. The window
 * columns are NOT touched here — only an inbound DM (recordInboundMessage)
 * moves windows, per spec §3.10 (comments never open the 24h window).
 */
export async function upsertContactAndConversation(
  accountId: string,
  igsid: string,
  username: string | undefined,
  ts: number
): Promise<ContactRef | null> {
  // never create a contact/conversation for the account ITSELF — Meta sometimes
  // surfaces the owner's own id (app-scoped OR real IG id) as a participant
  // (self-thread / echo); that must not show up as an inbox conversation.
  const [acct] = await query<{ mode: string | null; ig_id: string | null }>(
    `SELECT settings->>'defaultAiMode' AS mode, ig_id FROM accounts WHERE ig_user_id = $1`,
    [accountId]
  );
  if (igsid === accountId || (acct?.ig_id && igsid === acct.ig_id)) return null;

  const contactRows = await query<{ id: string }>(
    `INSERT INTO contacts (id, account_id, igsid, display_name, first_seen_at, last_interaction_at)
     VALUES ($1, $2, $3, $4, $5, $5)
     ON CONFLICT (account_id, igsid) DO UPDATE SET
       last_interaction_at = GREATEST(contacts.last_interaction_at, EXCLUDED.last_interaction_at),
       display_name = COALESCE(EXCLUDED.display_name, contacts.display_name)
     RETURNING id`,
    [uuidv4(), accountId, igsid, username ?? null, ts]
  );
  const contactId = contactRows[0].id;

  // new threads inherit the account's default ai_mode (existing threads keep
  // whatever the owner set — the conflict branch never touches ai_mode/folder)
  const aiMode = acct?.mode === "autonomous" || acct?.mode === "manual" ? acct.mode : "assisted";
  // New conversations land in 'primary' (the main inbox). Inbox folders are
  // managed by the user in-app (the Folder selector) — NOT derived from
  // Instagram (no follower / follow-check classification). Create-only: the
  // ON CONFLICT branch never touches folder, so manual moves are preserved.
  const folder = "primary";

  const convRows = await query<{ id: string }>(
    `INSERT INTO crm_conversations (id, account_id, contact_id, ai_mode, folder, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     ON CONFLICT (account_id, contact_id) DO UPDATE SET
       updated_at = GREATEST(crm_conversations.updated_at, EXCLUDED.updated_at)
     RETURNING id`,
    [uuidv4(), accountId, contactId, aiMode, folder, ts]
  );
  return { contactId, conversationId: convRows[0].id };
}

/**
 * Record an inbound DM and move the conversation windows forward (the ONLY
 * window mutator, mirroring window.ts onUserMessage): standard = ts+24h,
 * human-agent = ts+7d, both monotonic against out-of-order delivery.
 */
export async function recordInboundMessage(
  accountId: string,
  conversationId: string,
  msg: { mid: string; text?: string; ts: number; type?: string }
): Promise<void> {
  await query(
    `INSERT INTO crm_messages (id, account_id, conversation_id, mid, direction, type, body, sent_by, created_at)
     VALUES ($1, $2, $3, $4, 'in', $5, $6, 'user', $7)
     ON CONFLICT (id) DO NOTHING`,
    [`msg_${msg.mid}`, accountId, conversationId, msg.mid, msg.type ?? "text", JSON.stringify({ text: msg.text ?? "" }), msg.ts]
  );
  await query(
    `UPDATE crm_conversations SET
       window_expires_at = GREATEST(COALESCE(window_expires_at, 0), $1),
       human_agent_window_expires_at = GREATEST(COALESCE(human_agent_window_expires_at, 0), $2),
       updated_at = GREATEST(updated_at, $3),
       status = 'open'
     WHERE id = $4`,
    [msg.ts + STANDARD_WINDOW_MS, msg.ts + HUMAN_AGENT_WINDOW_MS, msg.ts, conversationId]
  );
}

/**
 * Import recent DM threads (from getDMThreads) into the CRM — the "load my last
 * N DMs" inbox sync. Upserts contact (+ handle), conversation, and each message
 * with its REAL historical timestamp + direction. Idempotent: messages dedupe on
 * mid, so re-running is safe and merges with webhook-delivered rows.
 */
export async function importDMThreads(
  accountId: string,
  threads: { threadId: string; updatedTime: number; contact: { igsid: string; username?: string }; messages: { id: string; fromOwn: boolean; text: string; ts: number }[] }[]
): Promise<{ threads: number; messages: number }> {
  let nThreads = 0, nMsgs = 0;
  for (const th of threads) {
    if (!th.contact.igsid) continue;
    const convTs = th.updatedTime || Date.now();
    const ref = await upsertContactAndConversation(accountId, th.contact.igsid, th.contact.username, convTs);
    if (!ref) continue; // self-thread (own id) — skip
    let latestInbound = 0;
    for (const m of th.messages) {
      if (!m.text) continue;
      await query(
        `INSERT INTO crm_messages (id, account_id, conversation_id, mid, direction, type, body, sent_by, created_at)
         VALUES ($1, $2, $3, $4, $5, 'text', $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [`msg_${m.id}`, accountId, ref.conversationId, m.id, m.fromOwn ? "out" : "in",
         JSON.stringify({ text: m.text }), m.fromOwn ? "human" : "user", m.ts]
      );
      nMsgs++;
      if (!m.fromOwn && m.ts > latestInbound) latestInbound = m.ts;
    }
    if (latestInbound > 0) {
      await query(
        `UPDATE crm_conversations SET
           window_expires_at = GREATEST(COALESCE(window_expires_at, 0), $1),
           human_agent_window_expires_at = GREATEST(COALESCE(human_agent_window_expires_at, 0), $2),
           updated_at = GREATEST(updated_at, $3)
         WHERE id = $4`,
        [latestInbound + STANDARD_WINDOW_MS, latestInbound + HUMAN_AGENT_WINDOW_MS, convTs, ref.conversationId]
      );
    } else {
      await query(`UPDATE crm_conversations SET updated_at = GREATEST(updated_at, $1) WHERE id = $2`, [convTs, ref.conversationId]);
    }
    nThreads++;
  }
  return { threads: nThreads, messages: nMsgs };
}

/** Record an outbound send (human/ai). Sends never move windows. */
export async function recordOutboundMessage(
  accountId: string,
  conversationId: string,
  msg: { body: Record<string, unknown>; sentBy: "ai" | "human"; mid?: string; type?: string }
): Promise<string> {
  const id = `msg_${msg.mid ?? uuidv4()}`;
  await query(
    `INSERT INTO crm_messages (id, account_id, conversation_id, mid, direction, type, body, sent_by, created_at)
     VALUES ($1, $2, $3, $4, 'out', $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [id, accountId, conversationId, msg.mid ?? null, msg.type ?? "text", JSON.stringify(msg.body), msg.sentBy, Date.now()]
  );
  await query(`UPDATE crm_conversations SET updated_at = $1 WHERE id = $2`, [Date.now(), conversationId]);
  return id;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s\-()]{7,20}$/;

/**
 * Quick-reply phone/email capture (spec §3.3/§3.5): prefilled quick replies
 * deliver the user's email/phone as the message text with a quick_reply
 * payload attached. Store on the contact WITH consent timestamp + an opt_ins
 * consent record (source: quick_reply).
 */
export async function captureQuickReplyContact(
  accountId: string,
  igsid: string,
  text: string | undefined,
  ts: number
): Promise<"email" | "phone" | null> {
  const v = (text ?? "").trim();
  let field: "email" | "phone" | null = null;
  if (EMAIL_RE.test(v)) field = "email";
  else if (PHONE_RE.test(v)) field = "phone";
  if (!field) return null;

  const rows = await query<{ id: string }>(
    `UPDATE contacts SET ${field} = $1, consent_at = $2 WHERE account_id = $3 AND igsid = $4 RETURNING id`,
    [v, ts, accountId, igsid]
  );
  if (rows[0]) {
    await query(
      `INSERT INTO opt_ins (account_id, contact_id, topic, source, consented_at)
       VALUES ($1, $2, $3, 'quick_reply', $4)
       ON CONFLICT (account_id, contact_id, topic) DO UPDATE SET consented_at = EXCLUDED.consented_at`,
      [accountId, rows[0].id, `contact_${field}`, ts]
    );
  }
  return field;
}
