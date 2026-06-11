import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { stopReplyAll } from "../../../services/posts-service";

export const postPostIdReplyAllStopHandler = new Elysia().post(
  "/api/ig/posts/:postId/reply-all/stop",
  async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    return stopReplyAll();
  }
);
