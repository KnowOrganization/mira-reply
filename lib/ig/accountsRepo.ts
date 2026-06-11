import { query, initSchema } from "./pg";
import type { Automation, IgAccount } from "./store";

// Multi-account source of truth (Postgres). Accounts + their automation graphs.
// Each connected IG account is a row; automations are scoped by account_id.

export type StoredAccount = IgAccount & { settings?: Record<string, unknown> };

export async function upsertAccount(a: StoredAccount): Promise<void> {
  await query(
    `INSERT INTO accounts (ig_user_id, username, access_token, token_expires_at, connected_at, settings, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (ig_user_id) DO UPDATE SET
       username=EXCLUDED.username, access_token=EXCLUDED.access_token,
       token_expires_at=EXCLUDED.token_expires_at, settings=EXCLUDED.settings,
       updated_at=EXCLUDED.updated_at`,
    [a.igUserId, a.username ?? "", a.accessToken, a.tokenExpiresAt ?? 0, a.connectedAt ?? Date.now(), JSON.stringify(a.settings ?? {}), Date.now()]
  );
}

type AccountRow = {
  ig_user_id: string; username: string; access_token: string;
  token_expires_at: string; connected_at: string; settings: Record<string, unknown>;
};
function rowToAccount(r: AccountRow): StoredAccount {
  return {
    igUserId: r.ig_user_id,
    username: r.username,
    accessToken: r.access_token,
    tokenExpiresAt: Number(r.token_expires_at),
    connectedAt: Number(r.connected_at),
    settings: r.settings,
  };
}

export async function getAccount(igUserId: string): Promise<StoredAccount | null> {
  const rows = await query<AccountRow>("SELECT * FROM accounts WHERE ig_user_id=$1", [igUserId]);
  return rows[0] ? rowToAccount(rows[0]) : null;
}

export async function listAccounts(): Promise<StoredAccount[]> {
  const rows = await query<AccountRow>("SELECT * FROM accounts ORDER BY connected_at DESC");
  return rows.map(rowToAccount);
}

// ── automations ─────────────────────────────────────────────────────────────
type AutoRow = {
  id: string; account_id: string; name: string; enabled: boolean;
  trigger: Automation["trigger"]; nodes: Automation["nodes"]; edges: Automation["edges"];
  stats: Automation["stats"]; created_at: string; updated_at: string;
};
function rowToAutomation(r: AutoRow): Automation {
  return {
    id: r.id, name: r.name, enabled: r.enabled,
    trigger: r.trigger, nodes: r.nodes, edges: r.edges, stats: r.stats,
    createdAt: Number(r.created_at), updatedAt: Number(r.updated_at),
  };
}

export async function listAutomations(accountId: string): Promise<Automation[]> {
  const rows = await query<AutoRow>("SELECT * FROM automations WHERE account_id=$1 ORDER BY created_at DESC", [accountId]);
  return rows.map(rowToAutomation);
}

export async function getAutomation(accountId: string, id: string): Promise<Automation | null> {
  const rows = await query<AutoRow>("SELECT * FROM automations WHERE account_id=$1 AND id=$2", [accountId, id]);
  return rows[0] ? rowToAutomation(rows[0]) : null;
}

export async function upsertAutomation(accountId: string, a: Automation): Promise<void> {
  await query(
    `INSERT INTO automations (id, account_id, name, enabled, trigger, nodes, edges, stats, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (id) DO UPDATE SET
       name=EXCLUDED.name, enabled=EXCLUDED.enabled, trigger=EXCLUDED.trigger,
       nodes=EXCLUDED.nodes, edges=EXCLUDED.edges, stats=EXCLUDED.stats, updated_at=EXCLUDED.updated_at`,
    [a.id, accountId, a.name, a.enabled, JSON.stringify(a.trigger), JSON.stringify(a.nodes),
     JSON.stringify(a.edges), JSON.stringify(a.stats), a.createdAt ?? Date.now(), a.updatedAt ?? Date.now()]
  );
}

export async function deleteAutomation(accountId: string, id: string): Promise<boolean> {
  const rows = await query<{ id: string }>("DELETE FROM automations WHERE account_id=$1 AND id=$2 RETURNING id", [accountId, id]);
  return rows.length > 0;
}

/**
 * One-time import of the existing single-account file store (~/.mira/ig.json)
 * into Postgres. Idempotent (upserts). Returns what it imported.
 */
export async function importFromFileStore(): Promise<{ account: string | null; automations: number }> {
  await initSchema();
  const { readStore } = await import("./store");
  const store = await readStore();
  if (!store.account) return { account: null, automations: 0 };
  await upsertAccount({ ...store.account, settings: store.settings as unknown as Record<string, unknown> });
  const autos = store.automations ?? [];
  for (const a of autos) await upsertAutomation(store.account.igUserId, a);
  return { account: store.account.igUserId, automations: autos.length };
}
