import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { postCleanup } from "../../../services/analytics-service";

export const postCleanupHandler = new Elysia().post(
  "/api/ig/cleanup",
  async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    return postCleanup(a.ctx.accountId);
  }
);
