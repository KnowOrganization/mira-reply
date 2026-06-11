import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { getComments } from "../../../services/inbox-service";

export const getCommentsHandler = new Elysia().get(
  "/api/ig/comments",
  async ({ request, query, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const refresh = (query as Record<string, string | undefined>).refresh === "1";
    const result = await getComments(a.ctx.accountId, refresh);
    if (result.notConnected) { set.status = 400; return { error: "not connected" }; }
    return { rows: result.rows, count: result.count, live: result.live };
  }
);
