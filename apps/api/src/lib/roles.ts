// Team roles (spec Phase 4): account owner (accounts.user_id) is implicit
// "owner"; everyone else resolves through team_members. Gates who may enable
// autonomous mode (owner/admin) and, later, who sees revenue.
import { query } from "@shaiz/db";

export type Role = "owner" | "admin" | "agent" | "viewer";

export async function roleFor(accountId: string, userId: string): Promise<Role | null> {
  const [acct] = await query<{ user_id: string | null }>(
    "SELECT user_id FROM accounts WHERE ig_user_id = $1",
    [accountId]
  );
  if (acct?.user_id === userId) return "owner";
  const [tm] = await query<{ role: string }>(
    "SELECT role FROM team_members WHERE account_id = $1 AND user_id = $2",
    [accountId, userId]
  );
  return (tm?.role as Role) ?? null;
}

export function canEnableAutonomous(role: Role | null): boolean {
  return role === "owner" || role === "admin";
}

/** Can take write/send actions (everyone except viewers and non-members). */
export function canAct(role: Role | null): boolean {
  return role === "owner" || role === "admin" || role === "agent";
}

/** Resolve the caller's role and assert they may act; returns an error tuple
 *  (status, message) to return, or null when allowed. */
export async function assertCanAct(accountId: string, userId: string): Promise<{ status: number; error: string } | null> {
  const role = await roleFor(accountId, userId);
  return canAct(role) ? null : { status: 403, error: "this action requires agent role or higher" };
}
