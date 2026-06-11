import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { refreshMentions } from "../../../services/inbox-service";

export const postMentionsHandler = new Elysia().post(
  "/api/ig/mentions",
  async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const result = await refreshMentions(a.ctx.accountId);
    if ("fetchError" in result) {
      set.status = 500;
      return { error: result.fetchError };
    }
    return result;
  }
);
