// crm-migrate.ts — create the CRM tables the recovered Inbox/Opportunities stack
// needs, SEPARATE from the DM pipeline's conversations/messages (zero pipeline
// risk). Idempotent (CREATE TABLE IF NOT EXISTS). Run:
//   MIRA_STORE=drizzle bun --env-file=.env.local scripts/crm-migrate.ts
import { query } from "../lib/ig/pg";

const STMTS: string[] = [
  // contacts
  `CREATE TABLE IF NOT EXISTS contacts (
    id text PRIMARY KEY,
    account_id text NOT NULL,
    igsid text NOT NULL,
    display_name text,
    phone text,
    email text,
    consent_at bigint,
    tags jsonb NOT NULL DEFAULT '[]'::jsonb,
    lead_status text NOT NULL DEFAULT 'cold',
    lead_score real NOT NULL DEFAULT 0,
    owner_id text,
    first_seen_at bigint NOT NULL DEFAULT 0,
    last_interaction_at bigint NOT NULL DEFAULT 0
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_igsid ON contacts (account_id, igsid)`,
  `CREATE INDEX IF NOT EXISTS idx_contacts_account_interaction ON contacts (account_id, last_interaction_at)`,

  // crm_conversations (separate from the DM-pipeline conversations table)
  `CREATE TABLE IF NOT EXISTS crm_conversations (
    id text PRIMARY KEY,
    account_id text NOT NULL,
    contact_id text NOT NULL,
    folder text NOT NULL DEFAULT 'primary',
    window_expires_at bigint,
    human_agent_window_expires_at bigint,
    status text NOT NULL DEFAULT 'open',
    assigned_to text,
    ai_mode text NOT NULL DEFAULT 'assisted',
    notes text NOT NULL DEFAULT '',
    ai_draft text,
    ai_draft_at bigint,
    referral jsonb,
    pending_slot jsonb,
    created_at bigint NOT NULL DEFAULT 0,
    updated_at bigint NOT NULL DEFAULT 0
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_conversations_acct_contact ON crm_conversations (account_id, contact_id)`,
  `CREATE INDEX IF NOT EXISTS idx_crm_conversations_account ON crm_conversations (account_id, updated_at)`,

  // crm_messages
  `CREATE TABLE IF NOT EXISTS crm_messages (
    id text PRIMARY KEY,
    account_id text NOT NULL,
    conversation_id text NOT NULL,
    mid text,
    direction text NOT NULL,
    type text NOT NULL DEFAULT 'text',
    body jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_echo boolean NOT NULL DEFAULT false,
    sent_by text NOT NULL DEFAULT 'user',
    seen_at bigint,
    created_at bigint NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_crm_messages_conversation_ts ON crm_messages (conversation_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_crm_messages_mid ON crm_messages (account_id, mid)`,

  // opportunities
  `CREATE TABLE IF NOT EXISTS opportunities (
    id text PRIMARY KEY,
    account_id text NOT NULL,
    conversation_id text NOT NULL,
    type text NOT NULL,
    confidence real NOT NULL DEFAULT 0,
    value_estimate real,
    status text NOT NULL DEFAULT 'open',
    reason text,
    notes text,
    detected_at bigint NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_opportunities_account_ts ON opportunities (account_id, detected_at)`,

  // audit_log
  `CREATE TABLE IF NOT EXISTS audit_log (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id text NOT NULL,
    actor text NOT NULL,
    action text NOT NULL,
    conversation_id text,
    reason text NOT NULL DEFAULT '',
    created_at bigint NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_account_ts ON audit_log (account_id, created_at)`,

  // decision_log
  `CREATE TABLE IF NOT EXISTS decision_log (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id text NOT NULL,
    conversation_id text,
    comment_id text,
    decision text NOT NULL,
    confidence real NOT NULL DEFAULT 0,
    risk_level text NOT NULL DEFAULT 'low',
    reason text NOT NULL DEFAULT '',
    created_at bigint NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_decision_log_account_ts ON decision_log (account_id, created_at)`,
];

async function main() {
  let ok = 0;
  for (const sql of STMTS) {
    try {
      await query(sql);
      ok++;
      const m = sql.match(/(?:TABLE|INDEX)(?: IF NOT EXISTS)? ([a-z_]+)/i);
      console.log(`✓ ${m?.[1] ?? "stmt"}`);
    } catch (e) {
      console.error(`✗ failed: ${String(e).slice(0, 120)}\n   ${sql.slice(0, 80)}`);
    }
  }
  // verify
  const r = await query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1)`,
    [["contacts", "crm_conversations", "crm_messages", "opportunities", "audit_log", "decision_log"]]
  );
  console.log(`\n${ok}/${STMTS.length} statements ok. CRM tables present:`, r.map((x) => x.table_name).sort().join(", "));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
