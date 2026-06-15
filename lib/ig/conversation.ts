// DM conversation store — gives direct messages real thread memory.
//
// Each (account, person) is one conversation row; every inbound/outbound DM is
// a message row. The DM engine (dmPipeline.ts) loads the recent turns + rolling
// summary so a follow-up message is answered in context, not in isolation.
//
// Backed by raw Postgres (lib/ig/pg.ts) like db.ts / outbound.ts. The canonical
// DDL lives in packages/db/src/schema.ts (conversations, messages); the
// IF-NOT-EXISTS bootstrap below only guarantees the worker still runs if
// migrations haven't been pushed yet — it never diverges from the Drizzle shape.

import { query, pool } from "./pg";

const DM_WINDOW_MS = 24 * 60 * 60 * 1000; // Meta 24h standard messaging window

export type ConversationRow = {
  id: string;
  account_id: string;
  igsid: string;
  username: string | null;
  last_inbound_at: number;
  last_outbound_at: number;
  window_expires_at: number;
  summary: string;
  status: string;
  created_at: number;
  updated_at: number;
};

export type Turn = { direction: "in" | "out"; text: string; sentBy: string; createdAt: number };

let ensured = false;
async function ensureSchema(): Promise<void> {
  if (ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id text PRIMARY KEY,
      account_id text NOT NULL,
      igsid text NOT NULL,
      username text,
      last_inbound_at bigint NOT NULL DEFAULT 0,
      last_outbound_at bigint NOT NULL DEFAULT 0,
      window_expires_at bigint NOT NULL DEFAULT 0,
      summary text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'open',
      created_at bigint NOT NULL DEFAULT 0,
      updated_at bigint NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_acct_igsid ON conversations (account_id, igsid);
    CREATE TABLE IF NOT EXISTS messages (
      id text PRIMARY KEY,
      conversation_id text NOT NULL,
      account_id text NOT NULL,
      direction text NOT NULL,
      text text NOT NULL DEFAULT '',
      sent_by text NOT NULL DEFAULT 'user',
      created_at bigint NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at);
  `);
  ensured = true;
}

const convId = (accountId: string, igsid: string) => `conv_${accountId}_${igsid}`;

/** Find or create the conversation for one person; bumps username if provided. */
export async function getOrCreateConversation(
  accountId: string,
  igsid: string,
  username?: string
): Promise<ConversationRow> {
  await ensureSchema();
  const id = convId(accountId, igsid);
  const now = Date.now();
  const rows = await query<ConversationRow>(
    `INSERT INTO conversations (id, account_id, igsid, username, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$5)
     ON CONFLICT (account_id, igsid) DO UPDATE
       SET username = COALESCE(EXCLUDED.username, conversations.username),
           updated_at = $5
     RETURNING *`,
    [id, accountId, igsid, username ?? null, now]
  );
  return rows[0];
}

/** Append one message (inbound or outbound) to a thread. Idempotent on id. */
export async function appendMessage(m: {
  id: string;
  conversationId: string;
  accountId: string;
  direction: "in" | "out";
  text: string;
  sentBy?: "user" | "ai" | "human";
}): Promise<void> {
  await ensureSchema();
  await query(
    `INSERT INTO messages (id, conversation_id, account_id, direction, text, sent_by, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO NOTHING`,
    [m.id, m.conversationId, m.accountId, m.direction, m.text, m.sentBy ?? (m.direction === "in" ? "user" : "ai"), Date.now()]
  );
}

/** Record an inbound DM: append it + (re)open the 24h window. */
export async function recordInbound(
  conv: ConversationRow,
  mid: string,
  text: string
): Promise<void> {
  const now = Date.now();
  await appendMessage({ id: mid, conversationId: conv.id, accountId: conv.account_id, direction: "in", text, sentBy: "user" });
  await query(
    `UPDATE conversations SET last_inbound_at=$2, window_expires_at=$3, status='open', updated_at=$2 WHERE id=$1`,
    [conv.id, now, now + DM_WINDOW_MS]
  );
}

/** Record an outbound DM we sent. */
export async function recordOutbound(
  conv: ConversationRow,
  mid: string,
  text: string,
  sentBy: "ai" | "human" = "ai"
): Promise<void> {
  const now = Date.now();
  await appendMessage({ id: mid, conversationId: conv.id, accountId: conv.account_id, direction: "out", text, sentBy });
  await query(`UPDATE conversations SET last_outbound_at=$2, updated_at=$2 WHERE id=$1`, [conv.id, now]);
}

/** Last N turns of a thread, oldest → newest, for prompt context. */
export async function recentTurns(conversationId: string, n = 12): Promise<Turn[]> {
  await ensureSchema();
  const rows = await query<{ direction: "in" | "out"; text: string; sent_by: string; created_at: number }>(
    `SELECT direction, text, sent_by, created_at FROM messages
     WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [conversationId, n]
  );
  return rows
    .map((r) => ({ direction: r.direction, text: r.text, sentBy: r.sent_by, createdAt: r.created_at }))
    .reverse();
}

export async function updateSummary(conversationId: string, summary: string): Promise<void> {
  await query(`UPDATE conversations SET summary=$2, updated_at=$3 WHERE id=$1`, [conversationId, summary, Date.now()]);
}

export async function setStatus(conversationId: string, status: "open" | "needs_human" | "closed"): Promise<void> {
  await query(`UPDATE conversations SET status=$2, updated_at=$3 WHERE id=$1`, [conversationId, status, Date.now()]);
}

/** Is the 24h standard messaging window still open? */
export function withinWindow(conv: ConversationRow): boolean {
  return conv.window_expires_at > Date.now();
}
