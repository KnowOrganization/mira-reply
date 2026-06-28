// Team roles. Authorization resolves through the org/membership model:
//   org owner|admin           -> full access to every account the org owns
//   org agent|viewer + cross-org users -> access only via account_access grants
// (the per-account table also carries influencer<->agency shares).
import { query } from "@shaiz/db";

export type Role = "owner" | "admin" | "agent" | "viewer";

const RANK: Record<Role, number> = { viewer: 0, agent: 1, admin: 2, owner: 3 };

/** Resolve the caller's effective role on an account, or null if no access. */
export async function roleFor(accountId: string, userId: string): Promise<Role | null> {
  const [acct] = await query<{ org_id: string | null }>(
    "SELECT org_id FROM accounts WHERE ig_user_id = $1",
    [accountId]
  );
  if (acct?.org_id) {
    const [m] = await query<{ role: string }>(
      "SELECT role FROM org_members WHERE org_id = $1 AND user_id = $2",
      [acct.org_id, userId]
    );
    if (m && (m.role === "owner" || m.role === "admin")) return m.role as Role;
  }
  const [g] = await query<{ role: string }>(
    "SELECT role FROM account_access WHERE account_id = $1 AND user_id = $2",
    [accountId, userId]
  );
  return (g?.role as Role) ?? null;
}

export function roleAtLeast(role: Role | null, need: Role): boolean {
  return role !== null && RANK[role] >= RANK[need];
}

export function canEnableAutonomous(role: Role | null): boolean {
  return roleAtLeast(role, "admin");
}

/** Can take write/send actions (everyone except viewers and non-members). */
export function canAct(role: Role | null): boolean {
  return roleAtLeast(role, "agent");
}

/** Resolve the caller's role and assert they may act; returns an error tuple
 *  (status, message) to return, or null when allowed. */
export async function assertCanAct(accountId: string, userId: string): Promise<{ status: number; error: string } | null> {
  const role = await roleFor(accountId, userId);
  return canAct(role) ? null : { status: 403, error: "this action requires agent role or higher" };
}
