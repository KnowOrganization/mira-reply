// Comment/user moderation — hide/unhide/delete a comment, block/unblock a user.
// Hide/unhide/delete hit the IG Graph API; block is local-only (the Graph API
// exposes no block endpoint for business accounts) — it adds the user to the
// account blocklist so the watcher never engages them again.
import { Elysia } from "elysia";
import { readStore, updateStoreFor } from "@/lib/ig/store";
import { hideComment, unhideComment, deleteComment } from "@/lib/ig/graph";
import { authPlugin } from "../plugins/auth";

async function token(accountId: string): Promise<string | null> {
  const s = await readStore(accountId);
  return s.account?.accessToken ?? null;
}

export const moderationRoute = new Elysia()
  .use(authPlugin)
  .post("/api/ig/comments/:id/hide", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const t = await token(auth.accountId);
    if (!t) { set.status = 400; return { error: "not connected" }; }
    try { await hideComment(params.id, t); return { ok: true }; }
    catch (e) { set.status = 502; return { error: e instanceof Error ? e.message : "hide failed" }; }
  }, { requireRole: "agent" })
  .post("/api/ig/comments/:id/unhide", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const t = await token(auth.accountId);
    if (!t) { set.status = 400; return { error: "not connected" }; }
    try { await unhideComment(params.id, t); return { ok: true }; }
    catch (e) { set.status = 502; return { error: e instanceof Error ? e.message : "unhide failed" }; }
  }, { requireRole: "agent" })
  .delete("/api/ig/comments/:id", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const t = await token(auth.accountId);
    if (!t) { set.status = 400; return { error: "not connected" }; }
    try { await deleteComment(params.id, t); return { ok: true }; }
    catch (e) { set.status = 502; return { error: e instanceof Error ? e.message : "delete failed" }; }
  }, { requireRole: "agent" })
  .post("/api/ig/users/:igUserId/block", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    // ponytail: local blocklist only — IG Graph has no business block endpoint.
    await updateStoreFor(auth.accountId, (s) => ({
      ...s,
      blocklist: s.blocklist.includes(params.igUserId) ? s.blocklist : [...s.blocklist, params.igUserId],
    }));
    return { ok: true };
  }, { requireRole: "agent" })
  .delete("/api/ig/users/:igUserId/block", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    await updateStoreFor(auth.accountId, (s) => ({
      ...s,
      blocklist: s.blocklist.filter((id) => id !== params.igUserId),
    }));
    return { ok: true };
  }, { requireRole: "agent" });
