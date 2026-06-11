import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { removeKnowledge } from "../../../services/inbox-service";

export const deleteKnowledgeIdHandler = new Elysia().delete(
  "/api/ig/knowledge/:id",
  async ({ request, params, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    await removeKnowledge(params.id);
    return { ok: true };
  }
);
