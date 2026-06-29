// Idempotent, re-runnable backfill: give every legacy IG account a personal org.
// For each distinct accounts.user_id -> a personal org (id = 'org_'<userId>),
// an owner membership, and stamp accounts.org_id. Safe to run repeatedly.
//
// Run: DATABASE_URL=... bun run scripts/backfill-orgs.ts
import { query } from "../src/client";

async function main() {
  const now = Date.now();

  await query(
    `INSERT INTO organizations (id, name, type, plan, created_by, created_at)
     SELECT DISTINCT 'org_' || a.user_id,
            COALESCE(u.name, u.email, 'My workspace'), 'individual', 'free', a.user_id, $1::bigint
     FROM accounts a LEFT JOIN "user" u ON u.id = a.user_id
     WHERE a.user_id IS NOT NULL
     ON CONFLICT (id) DO NOTHING`,
    [now]
  );

  await query(
    `INSERT INTO org_members (org_id, user_id, role, created_at)
     SELECT DISTINCT 'org_' || user_id, user_id, 'owner', $1::bigint
     FROM accounts WHERE user_id IS NOT NULL
     ON CONFLICT (org_id, user_id) DO NOTHING`,
    [now]
  );

  await query(
    `UPDATE accounts SET org_id = 'org_' || user_id, updated_at = $1
     WHERE user_id IS NOT NULL AND org_id IS NULL`,
    [now]
  );

  const [orgs] = await query<{ n: number }>(`SELECT count(*)::int AS n FROM organizations`);
  const [members] = await query<{ n: number }>(`SELECT count(*)::int AS n FROM org_members WHERE role='owner'`);
  const [orphans] = await query<{ n: number }>(
    `SELECT count(*)::int AS n FROM accounts WHERE org_id IS NULL`
  );
  console.log(`[backfill] orgs=${orgs.n} owners=${members.n} accounts_without_org=${orphans.n}`);
  if (orphans.n > 0) {
    console.warn(`[backfill] WARNING: ${orphans.n} accounts have user_id IS NULL — no org assigned (legacy pre-auth rows)`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[backfill] failed:", e);
  process.exit(1);
});
