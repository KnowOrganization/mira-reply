// Instagram account lifecycle, multi-tenant: every connected IG account is owned
// by an organization (accounts.org_id). Completing OAuth proves IG control, but
// per policy we never silently absorb an account already owned by another org —
// we refresh its shared token and offer "request access" / "transfer ownership".
import { Elysia } from "elysia";
import { upsertAccount, getAccount, type StoredAccount } from "@/lib/ig/accountsRepo";
import { query } from "@shaiz/db";
import type { Settings } from "@/lib/ig/store";
import { requireUser, getSessionUserId, resolveCallerOrg } from "../lib/auth";
import { roleAtLeast } from "../lib/roles";

const ig = {
  appId: process.env.META_APP_ID || "",
  appSecret: process.env.META_APP_SECRET || "",
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  scopes: [
    "instagram_business_basic",
    "instagram_business_manage_comments",
    "instagram_business_manage_messages",
    "instagram_business_manage_insights",
  ],
};
const redirectUri = () => `${ig.baseUrl}/api/ig/callback`;
const isConfigured = () => Boolean(ig.appId && ig.appSecret);

const DEFAULT_SETTINGS: Settings = {
  replyMode: "assisted",
  // New accounts: comments assisted (owner approves), DMs auto (conversational).
  commentMode: "assisted", dmMode: "auto", alwaysReply: true,
  skipOwnComments: true, autoReplySimpleAcks: true, autoDMLinks: true,
  cooldownMinutes: 0, dailySendCap: 1000, minSecondsBetweenSends: 45, sendJitter: true,
  selectiveReplyRate: 0, uniquenessThreshold: 0.55,
};

async function validateToken(t: string): Promise<{ id: string; username: string } | null> {
  for (const attempt of ["bearer", "query"] as const) {
    const url = `https://graph.instagram.com/v23.0/me?fields=id,username${attempt === "query" ? `&access_token=${encodeURIComponent(t)}` : ""}`;
    const res = await fetch(url, attempt === "bearer" ? { headers: { Authorization: `Bearer ${t}` } } : {});
    const me = (await res.json()) as { id?: string; username?: string };
    if (me.id) return { id: String(me.id), username: me.username || "" };
  }
  return null;
}

async function extendToken(t: string): Promise<{ token: string; expiresIn: number }> {
  try {
    const url = new URL("https://graph.instagram.com/access_token");
    url.searchParams.set("grant_type", "ig_exchange_token");
    url.searchParams.set("client_secret", ig.appSecret);
    url.searchParams.set("access_token", t);
    const j = (await (await fetch(url)).json()) as { access_token?: string; expires_in?: number };
    if (j.access_token) return { token: j.access_token, expiresIn: j.expires_in ?? 60 * 24 * 3600 };
  } catch {}
  return { token: t, expiresIn: 60 * 24 * 3600 };
}

// The org that currently owns an IG account (null if unconnected/legacy).
async function accountOrg(id: string): Promise<string | null> {
  const [r] = await query<{ org_id: string | null }>("SELECT org_id FROM accounts WHERE ig_user_id=$1", [id]);
  return r?.org_id ?? null;
}

// Refresh only the shared token (used when a non-owner re-OAuths — the owner
// still benefits from the fresh token, but the caller gets no access).
async function refreshTokenOnly(id: string, accessToken: string, expiresIn: number) {
  await query(
    "UPDATE accounts SET access_token=$2, token_expires_at=$3, updated_at=$4 WHERE ig_user_id=$1",
    [id, accessToken, Date.now() + expiresIn * 1000, Date.now()]
  );
}

// Persist the IG account; bind connector (no clobber) + owning org (COALESCE so
// an existing owner is never silently replaced — transfer is explicit below).
async function persistAccount(userId: string, orgId: string, id: string, username: string, accessToken: string, expiresIn: number) {
  const existing = await getAccount(id);
  const acct: StoredAccount = {
    igUserId: id, username, accessToken,
    tokenExpiresAt: Date.now() + expiresIn * 1000, connectedAt: Date.now(),
    settings: (existing?.settings ?? DEFAULT_SETTINGS) as unknown as Record<string, unknown>,
  };
  await upsertAccount(acct);
  await query(
    "UPDATE accounts SET user_id=COALESCE(user_id,$2), org_id=COALESCE(org_id,$3) WHERE ig_user_id=$1",
    [id, userId, orgId]
  );
}

// Explicit, logged ownership transfer (caller just proved IG control via OAuth).
// Data stays put — it's keyed by account_id, shared regardless of org.
async function transferAccount(id: string, orgId: string) {
  await query("UPDATE accounts SET org_id=$2, updated_at=$3 WHERE ig_user_id=$1", [id, orgId, Date.now()]);
}

// state carries {o: origin, u: userId, t: transfer?} so the callback knows intent.
function encodeState(origin: string, userId: string, transfer: boolean) {
  return Buffer.from(JSON.stringify({ o: origin, u: userId, t: transfer ? 1 : 0 })).toString("base64url");
}
function decodeState(state: string): { origin: string; userId: string | null; transfer: boolean } {
  try {
    const j = JSON.parse(Buffer.from(state, "base64url").toString("utf-8")) as { o?: string; u?: string; t?: number };
    const origin = j.o && /^https?:\/\//.test(j.o) ? j.o : ig.baseUrl;
    return { origin, userId: j.u ?? null, transfer: j.t === 1 };
  } catch { return { origin: ig.baseUrl, userId: null, transfer: false }; }
}

export const authRoute = new Elysia()
  // OAuth redirect start. It's a same-origin navigation, so the BetterAuth
  // session cookie rides along — we read the user from it (no token in the URL)
  // and bake only the user id into `state`.
  .get("/api/ig/connect", async ({ query: q, request, set }) => {
    if (!isConfigured()) { set.status = 400; return { error: "Meta app not configured" }; }
    const userId = await getSessionUserId(request.headers);
    if (!userId) { set.status = 401; return { error: "sign in first" }; }
    let origin = "";
    try { origin = new URL(request.headers.get("referer") || "").origin; } catch {}
    const url = new URL("https://www.instagram.com/oauth/authorize");
    url.searchParams.set("client_id", ig.appId);
    url.searchParams.set("redirect_uri", redirectUri());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", ig.scopes.join(","));
    const transfer = (q as { transfer?: string }).transfer === "1";
    url.searchParams.set("state", encodeState(origin || ig.baseUrl, userId, transfer));
    if ((q as { switch?: string }).switch === "1" || transfer) url.searchParams.set("auth_type", "reauthenticate");
    return new Response(null, { status: 302, headers: { Location: url.toString() } });
  })
  .post("/api/ig/token-connect", async ({ request, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    const transfer = ((body ?? {}) as { transfer?: boolean }).transfer === true;
    let t = (((body ?? {}) as { token?: string }).token || "").trim();
    if (!t && a.ctx.accountId) t = ((await getAccount(a.ctx.accountId))?.accessToken || "").trim(); // reconnect own account
    if (!t) { set.status = 400; return { error: "no token — paste an access token" }; }
    const me = await validateToken(t);
    if (!me) { set.status = 400; return { error: "invalid or blocked token" }; }
    const ext = await extendToken(t);
    const callerOrg = await resolveCallerOrg(a.ctx.userId, request.headers);
    const existingOrg = await accountOrg(me.id);
    const crossOrg = !!existingOrg && existingOrg !== callerOrg;
    if (crossOrg && !transfer) {
      await refreshTokenOnly(me.id, ext.token, ext.expiresIn); // owner keeps a fresh token
      set.status = 409;
      return { conflict: true, accountId: me.id, owningOrgId: existingOrg,
        error: "this Instagram is managed in another workspace — ask them to invite you, or transfer ownership" };
    }
    await persistAccount(a.ctx.userId, callerOrg, me.id, me.username, ext.token, ext.expiresIn);
    if (crossOrg && transfer) await transferAccount(me.id, callerOrg);
    return { ok: true, username: me.username, transferred: crossOrg && transfer };
  })
  .post("/api/ig/disconnect", async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!roleAtLeast(a.ctx.role, "admin")) { set.status = 403; return { error: "requires admin role" }; }
    if (a.ctx.accountId) {
      await query("UPDATE accounts SET access_token='', token_expires_at=0, updated_at=$2 WHERE ig_user_id=$1", [a.ctx.accountId, Date.now()]);
    }
    return { ok: true };
  })
  .get("/api/ig/callback", async ({ query: q, request }) => {
    const { origin, userId, transfer } = decodeState((q as { state?: string }).state || "");
    const to = (path: string) => new Response(null, { status: 302, headers: { Location: `${origin}${path}` } });
    const fail = (reason: string) => to(`/oauth/complete?ig=error&reason=${encodeURIComponent(reason)}`);
    const code = (q as { code?: string }).code;
    if ((q as { error?: string }).error) return fail((q as { error?: string }).error!);
    if (!code) return fail("missing_code");
    if (!userId) return fail("session_lost — sign in and reconnect");

    const form = new URLSearchParams({ client_id: ig.appId, client_secret: ig.appSecret, grant_type: "authorization_code", redirect_uri: redirectUri(), code });
    const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString(),
    });
    if (!shortRes.ok) return fail((await shortRes.text()).slice(0, 200));
    const short = (await shortRes.json()) as { access_token?: string };
    if (!short.access_token) return fail("short token missing — check Meta app permissions");

    const ext = await extendToken(short.access_token);
    const me = await validateToken(ext.token);
    if (!me) return fail("token validation failed");
    const callerOrg = await resolveCallerOrg(userId, request.headers);
    const existingOrg = await accountOrg(me.id);
    const crossOrg = !!existingOrg && existingOrg !== callerOrg;
    if (crossOrg && !transfer) {
      await refreshTokenOnly(me.id, ext.token, ext.expiresIn);
      return to(`/oauth/complete?ig=conflict&account=${encodeURIComponent(me.id)}&user=${encodeURIComponent(me.username)}`);
    }
    await persistAccount(userId, callerOrg, me.id, me.username, ext.token, ext.expiresIn);
    if (crossOrg && transfer) await transferAccount(me.id, callerOrg);
    return to(`/oauth/complete?ig=success&user=${encodeURIComponent(me.username)}${crossOrg && transfer ? "&transferred=1" : ""}`);
  });
