import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { getMentions } from "../../../services/inbox-service";

export const getMentionsHandler = new Elysia().get(
  "/api/ig/mentions",
  async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    return await getMentions(a.ctx.accountId);
  }
);
