import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { patchMentions } from "../../../services/inbox-service";

export const patchMentionsHandler = new Elysia().patch(
  "/api/ig/mentions",
  async ({ request, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as { id?: string; read?: boolean; all?: boolean };
    await patchMentions(a.ctx.accountId, b);
    return { ok: true };
  }
);
