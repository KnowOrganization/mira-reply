import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { getCommenters } from "../../../services/inbox-service";

export const getCommentersHandler = new Elysia().get(
  "/api/ig/commenters",
  async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    return await getCommenters(a.ctx.accountId);
  }
);
