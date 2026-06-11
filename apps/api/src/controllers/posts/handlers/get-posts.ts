import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { getPostsList } from "../../../services/posts-service";

export const getPostsHandler = new Elysia().get(
  "/api/ig/posts",
  async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    return getPostsList(a.ctx.accountId);
  }
);
