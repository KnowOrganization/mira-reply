// Elysia-side auth: validate the BetterAuth session from the request headers
// (the Next rewrite forwards the session cookie / Authorization bearer), then
// resolve the caller's ACTIVE org + account and their role on it. Active
// selection is explicit (x-mira-account / x-mira-org header or cookie) so a
// user with many accounts isn't silently pinned to one. Single source of truth
// for the session = the shared BetterAuth instance (@shaiz/auth).
import { getSessionUserId } from "@shaiz/auth";
import { query } from "@shaiz/db";
import { roleFor, type Role } from "./roles";

const ACCOUNT_HEADER = "x-mira-account";
const ORG_HEADER = "x-mira-org";
const ACCOUNT_COOKIE = "mira_active_account";
const ORG_COOKIE = "mira_active_org";

function cookie(headers: Headers, name: string): string | null {
  const raw = headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
const wanted = (headers: Headers, header: string, ck: string): string | null =>
  headers.get(header) || cookie(headers, ck);

/** Legacy single-account fallback (pre-backfill rows). */
export async function accountIdForUser(userId: string): Promise<string | null> {
  const rows = await query<{ ig_user_id: string }>(
    "SELECT ig_user_id FROM accounts WHERE user_id=$1 ORDER BY connected_at DESC LIMIT 1",
    [userId]
  );
  return rows[0]?.ig_user_id ?? null;
}

/** Verify a user has any access to a given account (per-resource ownership). */
export async function userOwnsAccount(userId: string, accountId: string): Promise<boolean> {
  return (await roleFor(accountId, userId)) !== null;
}

/** Every account this user can reach: orgs they admin + per-account grants. */
export async function accessibleAccounts(userId: string): Promise<{ accountId: string; orgId: string | null }[]> {
  const rows = await query<{ ig_user_id: string; org_id: string | null }>(
    `SELECT a.ig_user_id, a.org_id, a.connected_at FROM accounts a
       JOIN org_members m ON m.org_id = a.org_id AND m.user_id = $1 AND m.role IN ('owner','admin')
     UNION
     SELECT a.ig_user_id, a.org_id, a.connected_at FROM accounts a
       JOIN account_access g ON g.account_id = a.ig_user_id AND g.user_id = $1
     ORDER BY connected_at DESC`,
    [userId]
  );
  return rows.map((r) => ({ accountId: r.ig_user_id, orgId: r.org_id }));
}

/** Orgs this user belongs to, with their role. */
export async function userOrgs(userId: string): Promise<{ orgId: string; role: Role }[]> {
  const rows = await query<{ org_id: string; role: string }>(
    "SELECT org_id, role FROM org_members WHERE user_id=$1 ORDER BY created_at ASC",
    [userId]
  );
  return rows.map((r) => ({ orgId: r.org_id, role: r.role as Role }));
}

async function orgIdForAccount(accountId: string): Promise<string | null> {
  const [r] = await query<{ org_id: string | null }>("SELECT org_id FROM accounts WHERE ig_user_id=$1", [accountId]);
  return r?.org_id ?? null;
}

/** The user's personal org, creating it (id = org_<userId>) if they have none. */
export async function ensurePersonalOrg(userId: string): Promise<string> {
  const orgs = await userOrgs(userId);
  const pick = orgs.find((o) => o.role === "owner") ?? orgs[0];
  if (pick) return pick.orgId;
  const id = `org_${userId}`;
  const now = Date.now();
  const [u] = await query<{ name: string | null; email: string | null }>(
    'SELECT name, email FROM "user" WHERE id=$1', [userId]
  );
  await query(
    "INSERT INTO organizations (id,name,type,plan,created_by,created_at) VALUES ($1,$2,'individual','free',$3,$4) ON CONFLICT (id) DO NOTHING",
    [id, u?.name || u?.email || "My workspace", userId, now]
  );
  await query(
    "INSERT INTO org_members (org_id,user_id,role,created_at) VALUES ($1,$2,'owner',$3) ON CONFLICT (org_id,user_id) DO NOTHING",
    [id, userId, now]
  );
  return id;
}

/** Active org for write flows (header/cookie if a member), else personal org. */
export async function resolveCallerOrg(userId: string, headers: Headers): Promise<string> {
  const req = wanted(headers, ORG_HEADER, ORG_COOKIE);
  if (req) {
    const orgs = await userOrgs(userId);
    if (orgs.some((o) => o.orgId === req)) return req;
  }
  return ensurePersonalOrg(userId);
}

export type AuthCtx = { userId: string; orgId: string | null; accountId: string | null; role: Role | null };

/** Guard: resolve {userId, orgId, accountId, role} from request headers, or an
 *  error tuple. 401 if no session; 403 if an explicit account is requested the
 *  user can't access. */
export async function requireUser(headers: Headers): Promise<{ ctx?: AuthCtx; status?: number; error?: string }> {
  const userId = await getSessionUserId(headers);
  if (!userId) return { status: 401, error: "unauthorized" };

  // Resolve active account.
  let accountId: string | null = null;
  let role: Role | null = null;
  const requested = wanted(headers, ACCOUNT_HEADER, ACCOUNT_COOKIE);
  if (requested) {
    role = await roleFor(requested, userId);
    if (!role) return { status: 403, error: "no access to this account" };
    accountId = requested;
  } else {
    const list = await accessibleAccounts(userId);
    if (list.length >= 1) {
      // No explicit choice -> default to most-recently-connected account
      // (accessibleAccounts is ordered by connected_at DESC). The switcher
      // (CanvasAccountSwitcher) lets the user pick a different one any time.
      accountId = list[0].accountId;
      role = await roleFor(accountId, userId);
    } else {
      // Legacy fallback: account stamped by user_id but org not backfilled yet.
      const legacy = await accountIdForUser(userId);
      if (legacy) { accountId = legacy; role = "owner"; }
    }
  }

  // Resolve active org (for org-management routes). Independent of account.
  let orgId: string | null = null;
  const requestedOrg = wanted(headers, ORG_HEADER, ORG_COOKIE);
  const orgs = await userOrgs(userId);
  if (requestedOrg && orgs.some((o) => o.orgId === requestedOrg)) orgId = requestedOrg;
  else if (accountId) orgId = await orgIdForAccount(accountId);
  if (!orgId) orgId = orgs.find((o) => o.role === "owner" || o.role === "admin")?.orgId ?? orgs[0]?.orgId ?? null;

  return { ctx: { userId, orgId, accountId, role } };
}

export { getSessionUserId };
