import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { getPost } from "../../../services/posts-service";

export const getPostIdHandler = new Elysia().get(
  "/api/ig/posts/:postId",
  async ({ request, params, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    return getPost(a.ctx.accountId, params.postId, set);
  }
);
