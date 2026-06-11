import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { replyAll } from "../../../services/posts-service";

export const postPostIdReplyAllHandler = new Elysia().post(
  "/api/ig/posts/:postId/reply-all",
  async ({ request, params, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    return replyAll(a.ctx.accountId, params.postId, set);
  }
);
