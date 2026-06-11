import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { getFeed } from "../../../services/analytics-service";

export const getFeedHandler = new Elysia().get(
  "/api/ig/feed",
  async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    return getFeed(a.ctx.accountId);
  }
);
