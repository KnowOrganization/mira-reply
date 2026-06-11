// Declarative auth guard (Elysia macro). A handler opts in with `{ auth: true }`
// in its route options; the macro then validates the BetterAuth session (cookie
// OR Authorization: Bearer, via @shaiz/auth) BEFORE the handler runs. On success
// the resolved { userId, accountId } is injected into the handler context as
// `auth`; on failure the request short-circuits with 401 and the handler never
// runs. Replaces the per-handler inline `requireUser(request.headers)` calls.
import { Elysia } from "elysia";
import { requireUser, type AuthCtx } from "../lib/auth";

export const authPlugin = new Elysia({ name: "auth" }).macro({
  auth: {
    async resolve({ request, status }) {
      const a = await requireUser(request.headers);
      if (!a.ctx) return status(a.status ?? 401, { error: a.error ?? "unauthorized" });
      return { auth: a.ctx as AuthCtx };
    },
  },
});
