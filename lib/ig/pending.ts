// Postgres-backed automation resume state. Replaces the file-store arrays
// (automationButtonPending / FollowPending / RetryPending) so the worker process
// and the Next process never race on ~/.mira/ig.json. Atomic claim via a single
// transaction (SELECT → DELETE → return) preserves the exact dedup semantics the
// file-store updateStore() gave us: one-per-automation, clear-all-on-claim.
//
// Raw SQL on the existing pg Pool (lib/ig/pg.ts) — keeps this off drizzle so the
// Next-imported automation engine needs no transpilePackages. Same mira_app DB.
import { pool, query, initSchema } from "./pg";
import type { PoolClient } from "pg";

export type PendingKind = "button" | "follow" | "retry";

export type PendingEntry = {
  automationId: string;
  commentId: string;
  fromUserId: string;
  fromUsername?: string;
  remainingNodeIds: string[];
  notBefore?: number;
  attempts?: number;
  postId?: string; // retry only — carried in remaining? we store on the row's ts-less fields
  ts: number;
};

type Row = {
  account_id: string; kind: string; from_user_id: string; from_username: string | null;
  comment_id: string | null; automation_id: string; remaining_node_ids: string[];
  not_before: string; attempts: number; ts: string;
};

function rowToEntry(r: Row): PendingEntry {
  return {
    automationId: r.automation_id,
    commentId: r.comment_id ?? "",
    fromUserId: r.from_user_id,
    fromUsername: r.from_username ?? undefined,
    remainingNodeIds: r.remaining_node_ids ?? [],
    notBefore: Number(r.not_before),
    attempts: r.attempts,
    ts: Number(r.ts),
  };
}

async function withTx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  await initSchema();
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** Park (or replace) one user+automation entry of a kind. */
export async function parkPending(accountId: string, kind: PendingKind, e: PendingEntry): Promise<void> {
  await withTx(async (c) => {
    await c.query(
      "DELETE FROM pending_resume WHERE account_id=$1 AND kind=$2 AND from_user_id=$3 AND automation_id=$4",
      [accountId, kind, e.fromUserId, e.automationId]
    );
    await c.query(
      `INSERT INTO pending_resume (account_id, kind, from_user_id, from_username, comment_id, automation_id, remaining_node_ids, not_before, attempts, ts)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [accountId, kind, e.fromUserId, e.fromUsername ?? null, e.commentId, e.automationId,
       JSON.stringify(e.remainingNodeIds), e.notBefore ?? 0, e.attempts ?? 0, e.ts]
    );
  });
}

/** Atomically claim all of a user's pending of a kind within the window:
 *  dedup to one-per-automation (latest ts), delete ALL of the user's rows of
 *  that kind, return the claimed set. Mirrors the old updateStore claim. */
export async function claimPending(accountId: string, kind: PendingKind, userId: string, windowMs: number): Promise<PendingEntry[]> {
  return withTx(async (c) => {
    // FOR UPDATE locks the rows so a concurrent claim (webhook postback + DM
    // poll firing together) blocks here, then sees zero rows after our DELETE —
    // makes the claim genuinely atomic (no double-send), no Redis lock needed.
    const { rows } = await c.query<Row>(
      "SELECT * FROM pending_resume WHERE account_id=$1 AND kind=$2 AND from_user_id=$3 FOR UPDATE",
      [accountId, kind, userId]
    );
    if (!rows.length) return [];
    await c.query("DELETE FROM pending_resume WHERE account_id=$1 AND kind=$2 AND from_user_id=$3", [accountId, kind, userId]);
    const fresh = rows.filter((r) => Date.now() - Number(r.ts) < windowMs);
    const byAuto = new Map<string, Row>();
    for (const p of fresh) { const e = byAuto.get(p.automation_id); if (!e || Number(p.ts) > Number(e.ts)) byAuto.set(p.automation_id, p); }
    return [...byAuto.values()].map(rowToEntry);
  });
}

/** Atomically claim due retries (not_before <= now). */
export async function claimDueRetries(accountId: string, now: number): Promise<PendingEntry[]> {
  return withTx(async (c) => {
    const { rows } = await c.query<Row>(
      "SELECT * FROM pending_resume WHERE account_id=$1 AND kind='retry' AND not_before<=$2 FOR UPDATE",
      [accountId, now]
    );
    if (!rows.length) return [];
    await c.query("DELETE FROM pending_resume WHERE account_id=$1 AND kind='retry' AND not_before<=$2", [accountId, now]);
    return rows.map(rowToEntry);
  });
}

/** Read-modify-write merge of an automation's stats jsonb (increments). */
export async function bumpAutomationStats(
  automationId: string,
  delta: { triggered?: number; completed?: number; failed?: number; lastTriggered?: number }
): Promise<void> {
  await withTx(async (c) => {
    const { rows } = await c.query<{ stats: Record<string, number> }>("SELECT stats FROM automations WHERE id=$1 FOR UPDATE", [automationId]);
    if (!rows.length) return;
    const s = rows[0].stats ?? {};
    const next = {
      triggered: (s.triggered ?? 0) + (delta.triggered ?? 0),
      completed: (s.completed ?? 0) + (delta.completed ?? 0),
      failed: (s.failed ?? 0) + (delta.failed ?? 0),
      lastTriggered: delta.lastTriggered ?? s.lastTriggered ?? 0,
    };
    await c.query("UPDATE automations SET stats=$2, updated_at=$3 WHERE id=$1", [automationId, JSON.stringify(next), Date.now()]);
  });
}

export { initSchema };
