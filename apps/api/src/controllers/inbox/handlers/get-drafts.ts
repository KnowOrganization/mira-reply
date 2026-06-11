import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { getDrafts } from "../../../services/inbox-service";

export const getDraftsHandler = new Elysia().get(
  "/api/ig/drafts",
  async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    return await getDrafts(a.ctx.accountId);
  }
);
