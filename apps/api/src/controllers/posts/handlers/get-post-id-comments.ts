import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { getPostComments } from "../../../services/posts-service";

export const getPostIdCommentsHandler = new Elysia().get(
  "/api/ig/posts/:postId/comments",
  async ({ request, params, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    return getPostComments(a.ctx.accountId, params.postId, set);
  }
);
