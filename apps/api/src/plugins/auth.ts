// Declarative auth guards (Elysia macros).
//   { auth: true }            -> any signed-in user with an active account (reads; viewer ok)
//   { requireRole: "agent" }  -> caller must hold >= that role on the active account
// Both validate the BetterAuth session (cookie OR Authorization: Bearer) BEFORE
// the handler runs and inject the resolved { userId, orgId, accountId, role } as
// `auth`. On failure the request short-circuits and the handler never runs.
import { Elysia } from "elysia";
import { requireUser, type AuthCtx } from "../lib/auth";
import { roleAtLeast, type Role } from "../lib/roles";

export const authPlugin = new Elysia({ name: "auth" }).macro({
  auth: {
    async resolve({ request, status }) {
      const a = await requireUser(request.headers);
      if (!a.ctx) return status(a.status ?? 401, { error: a.error ?? "unauthorized" });
      return { auth: a.ctx as AuthCtx };
    },
  },
  requireRole(need: Role) {
    return {
      async resolve({ request, status }) {
        const a = await requireUser(request.headers);
        if (!a.ctx) return status(a.status ?? 401, { error: a.error ?? "unauthorized" });
        if (!a.ctx.accountId) return status(404, { error: "no account" });
        if (!roleAtLeast(a.ctx.role, need)) return status(403, { error: `requires ${need} role or higher` });
        return { auth: a.ctx as AuthCtx };
      },
    };
  },
});
