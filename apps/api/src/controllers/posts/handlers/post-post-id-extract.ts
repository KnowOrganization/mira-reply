import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { extractPost } from "../../../services/posts-service";

export const postPostIdExtractHandler = new Elysia().post(
  "/api/ig/posts/:postId/extract",
  async ({ request, params, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }

    const { paragraph } = (body ?? {}) as { paragraph: string };
    return extractPost(a.ctx.accountId, params.postId, paragraph, set);
  }
);
