import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { getPostInsights } from "../../../services/posts-service";

export const getPostIdInsightsHandler = new Elysia().get(
  "/api/ig/posts/:postId/insights",
  async ({ request, params, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    return getPostInsights(a.ctx.accountId, params.postId, set);
  }
);
