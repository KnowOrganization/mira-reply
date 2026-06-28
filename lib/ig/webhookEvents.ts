import { query } from "@shaiz/db";

// Append-only raw webhook event log. The receiver writes here BEFORE returning
// 200 to Meta — if this insert fails the receiver returns 5xx and Meta retries
// for 36h. event_key is the natural idempotency key; a duplicate delivery is a
// no-op insert (and the receiver still returns 200 for it).

export type WebhookEventRow = {
  id: number;
  account_id: string;
  field: string;
  event_key: string;
  payload: unknown;
  received_at: number;
  processed_at: number | null;
  error: string | null;
};

/** Insert one raw event. Returns false when the key already existed (duplicate delivery). */
export async function insertWebhookEvent(
  accountId: string,
  field: string,
  eventKey: string,
  payload: unknown
): Promise<boolean> {
  const rows = await query(
    `INSERT INTO webhook_events (account_id, field, event_key, payload, received_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (event_key) DO NOTHING
     RETURNING id`,
    [accountId, field, eventKey, JSON.stringify(payload), Date.now()]
  );
  return rows.length > 0;
}

export async function markWebhookEventProcessed(eventKey: string): Promise<void> {
  await query(`UPDATE webhook_events SET processed_at=$1, error=NULL WHERE event_key=$2`, [Date.now(), eventKey]);
}

export async function markWebhookEventError(eventKey: string, error: string): Promise<void> {
  await query(`UPDATE webhook_events SET error=$1 WHERE event_key=$2`, [error.slice(0, 2000), eventKey]);
}
