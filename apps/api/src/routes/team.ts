// Multitenancy management: orgs, members, per-account grants, invitations.
// Authorization is per path resource (the auth macro only resolves the ACTIVE
// account), so each handler re-checks the caller's role on the org/account it
// touches. Invite links are returned in the response — there's no mailer yet,
// so the admin shares the link manually. // ponytail: wire email when one exists.
import { Elysia } from "elysia";
import { query } from "@shaiz/db";
import { authPlugin } from "../plugins/auth";
import { roleFor, roleAtLeast, type Role } from "../lib/roles";

const ROLES: Role[] = ["owner", "admin", "agent", "viewer"];
const isRole = (v: unknown): v is Role => typeof v === "string" && ROLES.includes(v as Role);
const INVITE_TTL = 7 * 24 * 3600_000;

async function orgRole(orgId: string, userId: string): Promise<Role | null> {
  const [r] = await query<{ role: string }>("SELECT role FROM org_members WHERE org_id=$1 AND user_id=$2", [orgId, userId]);
  return (r?.role as Role) ?? null;
}
async function ownerCount(orgId: string): Promise<number> {
  const [r] = await query<{ n: number }>("SELECT count(*)::int AS n FROM org_members WHERE org_id=$1 AND role='owner'", [orgId]);
  return r?.n ?? 0;
}
async function userEmail(userId: string): Promise<string | null> {
  const [r] = await query<{ email: string | null }>('SELECT email FROM "user" WHERE id=$1', [userId]);
  return r?.email ?? null;
}
const baseUrl = () => process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const teamRoute = new Elysia()
  .use(authPlugin)

  // ── switcher data ──────────────────────────────────────────────────────────
  .get("/api/ig/accounts", async ({ auth }) => {
    // accounts the caller can reach: orgs they admin + per-account grants.
    const rows = await query<{ ig_user_id: string; username: string; org_id: string | null; role: string }>(
      `SELECT a.ig_user_id, a.username, a.org_id, m.role
         FROM accounts a JOIN org_members m ON m.org_id=a.org_id
        WHERE m.user_id=$1 AND m.role IN ('owner','admin')
       UNION
       SELECT a.ig_user_id, a.username, a.org_id, g.role
         FROM accounts a JOIN account_access g ON g.account_id=a.ig_user_id
        WHERE g.user_id=$1`,
      [auth.userId]
    );
    return { accounts: rows.map((r) => ({ accountId: r.ig_user_id, username: r.username, orgId: r.org_id, role: r.role })) };
  }, { auth: true })

  .get("/api/ig/orgs", async ({ auth }) => {
    const rows = await query<{ id: string; name: string; type: string; plan: string; role: string }>(
      `SELECT o.id, o.name, o.type, o.plan, m.role
         FROM organizations o JOIN org_members m ON m.org_id=o.id
        WHERE m.user_id=$1 ORDER BY m.created_at ASC`,
      [auth.userId]
    );
    return { orgs: rows.map((r) => ({ orgId: r.id, name: r.name, type: r.type, plan: r.plan, role: r.role })) };
  }, { auth: true })

  // ── org members ────────────────────────────────────────────────────────────
  .get("/api/ig/orgs/:orgId/members", async ({ auth, params, set }) => {
    if (!roleAtLeast(await orgRole(params.orgId, auth.userId), "admin")) { set.status = 403; return { error: "admin required" }; }
    const rows = await query<{ user_id: string; role: string; name: string | null; email: string | null }>(
      `SELECT m.user_id, m.role, u.name, u.email FROM org_members m
         LEFT JOIN "user" u ON u.id=m.user_id WHERE m.org_id=$1 ORDER BY m.created_at ASC`,
      [params.orgId]
    );
    return { members: rows.map((r) => ({ userId: r.user_id, role: r.role, name: r.name, email: r.email })) };
  }, { auth: true })

  .patch("/api/ig/orgs/:orgId/members/:userId", async ({ auth, params, body, set }) => {
    const callerRole = await orgRole(params.orgId, auth.userId);
    if (!roleAtLeast(callerRole, "admin")) { set.status = 403; return { error: "admin required" }; }
    const next = ((body ?? {}) as { role?: string }).role;
    if (!isRole(next)) { set.status = 400; return { error: "invalid role" }; }
    if (!roleAtLeast(callerRole, next)) { set.status = 403; return { error: "cannot grant a role above your own" }; }
    const target = await orgRole(params.orgId, params.userId);
    if (!target) { set.status = 404; return { error: "not a member" }; }
    if (target === "owner" && next !== "owner" && (await ownerCount(params.orgId)) <= 1) {
      set.status = 409; return { error: "cannot demote the last owner" };
    }
    await query("UPDATE org_members SET role=$3 WHERE org_id=$1 AND user_id=$2", [params.orgId, params.userId, next]);
    return { ok: true };
  }, { auth: true })

  .delete("/api/ig/orgs/:orgId/members/:userId", async ({ auth, params, set }) => {
    if (!roleAtLeast(await orgRole(params.orgId, auth.userId), "admin")) { set.status = 403; return { error: "admin required" }; }
    const target = await orgRole(params.orgId, params.userId);
    if (!target) { set.status = 404; return { error: "not a member" }; }
    if (target === "owner" && (await ownerCount(params.orgId)) <= 1) { set.status = 409; return { error: "cannot remove the last owner" }; }
    await query("DELETE FROM org_members WHERE org_id=$1 AND user_id=$2", [params.orgId, params.userId]);
    return { ok: true };
  }, { auth: true })

  // ── account grants (scoped members + cross-org shares) ───────────────────────
  .get("/api/ig/accounts/:accountId/members", async ({ auth, params, set }) => {
    if (!roleAtLeast(await roleFor(params.accountId, auth.userId), "admin")) { set.status = 403; return { error: "admin required" }; }
    const rows = await query<{ user_id: string; role: string; name: string | null; email: string | null }>(
      `SELECT g.user_id, g.role, u.name, u.email FROM account_access g
         LEFT JOIN "user" u ON u.id=g.user_id WHERE g.account_id=$1 ORDER BY g.created_at ASC`,
      [params.accountId]
    );
    return { members: rows.map((r) => ({ userId: r.user_id, role: r.role, name: r.name, email: r.email })) };
  }, { auth: true })

  .delete("/api/ig/accounts/:accountId/members/:userId", async ({ auth, params, set }) => {
    if (!roleAtLeast(await roleFor(params.accountId, auth.userId), "admin")) { set.status = 403; return { error: "admin required" }; }
    await query("DELETE FROM account_access WHERE account_id=$1 AND user_id=$2", [params.accountId, params.userId]);
    return { ok: true };
  }, { auth: true })

  // ── invitations ──────────────────────────────────────────────────────────────
  .post("/api/ig/orgs/:orgId/invite", async ({ auth, params, body, set }) => {
    const callerRole = await orgRole(params.orgId, auth.userId);
    if (!roleAtLeast(callerRole, "admin")) { set.status = 403; return { error: "admin required" }; }
    const b = (body ?? {}) as { email?: string; role?: string };
    const email = (b.email || "").trim().toLowerCase();
    if (!email) { set.status = 400; return { error: "email required" }; }
    if (!isRole(b.role)) { set.status = 400; return { error: "invalid role" }; }
    if (!roleAtLeast(callerRole, b.role)) { set.status = 403; return { error: "cannot grant a role above your own" }; }
    const token = crypto.randomUUID();
    const now = Date.now();
    await query(
      `INSERT INTO invitations (id,token,email,kind,org_id,role,invited_by,status,expires_at,created_at)
       VALUES ($1,$2,$3,'org',$4,$5,$6,'pending',$7,$8)`,
      [crypto.randomUUID(), token, email, params.orgId, b.role, auth.userId, now + INVITE_TTL, now]
    );
    return { ok: true, token, link: `${baseUrl()}/invite/${token}` };
  }, { auth: true })

  .post("/api/ig/accounts/:accountId/invite", async ({ auth, params, body, set }) => {
    const callerRole = await roleFor(params.accountId, auth.userId);
    if (!roleAtLeast(callerRole, "admin")) { set.status = 403; return { error: "admin required" }; }
    const b = (body ?? {}) as { email?: string; role?: string };
    const email = (b.email || "").trim().toLowerCase();
    if (!email) { set.status = 400; return { error: "email required" }; }
    if (!isRole(b.role)) { set.status = 400; return { error: "invalid role" }; }
    if (!roleAtLeast(callerRole, b.role)) { set.status = 403; return { error: "cannot grant a role above your own" }; }
    const token = crypto.randomUUID();
    const now = Date.now();
    await query(
      `INSERT INTO invitations (id,token,email,kind,account_id,role,invited_by,status,expires_at,created_at)
       VALUES ($1,$2,$3,'account',$4,$5,$6,'pending',$7,$8)`,
      [crypto.randomUUID(), token, email, params.accountId, b.role, auth.userId, now + INVITE_TTL, now]
    );
    return { ok: true, token, link: `${baseUrl()}/invite/${token}` };
  }, { auth: true })

  // Preview an invite (signed-in user; used by the accept page).
  .get("/api/ig/invites/:token", async ({ params, set }) => {
    const [inv] = await query<{ kind: string; role: string; email: string; status: string; expires_at: number; org_id: string | null; account_id: string | null }>(
      "SELECT kind, role, email, status, expires_at, org_id, account_id FROM invitations WHERE token=$1",
      [params.token]
    );
    if (!inv) { set.status = 404; return { error: "invite not found" }; }
    const valid = inv.status === "pending" && inv.expires_at > Date.now();
    let label = "";
    if (inv.kind === "org" && inv.org_id) label = (await query<{ name: string }>("SELECT name FROM organizations WHERE id=$1", [inv.org_id]))[0]?.name ?? "";
    if (inv.kind === "account" && inv.account_id) label = (await query<{ username: string }>("SELECT username FROM accounts WHERE ig_user_id=$1", [inv.account_id]))[0]?.username ?? "";
    return { kind: inv.kind, role: inv.role, email: inv.email, label, valid };
  }, { auth: true })

  .post("/api/ig/invites/accept", async ({ auth, body, set }) => {
    const token = ((body ?? {}) as { token?: string }).token;
    if (!token) { set.status = 400; return { error: "token required" }; }
    const [inv] = await query<{ id: string; kind: string; role: string; email: string; status: string; expires_at: number; org_id: string | null; account_id: string | null }>(
      "SELECT id,kind,role,email,status,expires_at,org_id,account_id FROM invitations WHERE token=$1",
      [token]
    );
    if (!inv) { set.status = 404; return { error: "invite not found" }; }
    if (inv.status !== "pending" || inv.expires_at <= Date.now()) { set.status = 410; return { error: "invite expired or already used" }; }
    const myEmail = (await userEmail(auth.userId))?.toLowerCase();
    if (!myEmail || myEmail !== inv.email.toLowerCase()) { set.status = 403; return { error: "invite is for a different email" }; }
    const now = Date.now();
    if (inv.kind === "org" && inv.org_id) {
      await query(
        "INSERT INTO org_members (org_id,user_id,role,invited_by,created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (org_id,user_id) DO UPDATE SET role=EXCLUDED.role",
        [inv.org_id, auth.userId, inv.role, null, now]
      );
    } else if (inv.kind === "account" && inv.account_id) {
      await query(
        "INSERT INTO account_access (account_id,user_id,role,granted_by,created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (account_id,user_id) DO UPDATE SET role=EXCLUDED.role",
        [inv.account_id, auth.userId, inv.role, null, now]
      );
    } else { set.status = 400; return { error: "malformed invite" }; }
    await query("UPDATE invitations SET status='accepted', accepted_user_id=$2 WHERE id=$1", [inv.id, auth.userId]);
    return { ok: true, kind: inv.kind };
  }, { auth: true });
