import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { patchKnowledge } from "../../../services/inbox-service";
import type { Fact } from "@/lib/ig/store";

export const patchKnowledgeIdHandler = new Elysia().patch(
  "/api/ig/knowledge/:id",
  async ({ request, params, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const patch = (body ?? {}) as Partial<Fact>;
    const result = await patchKnowledge(params.id, patch);
    if (!result) { set.status = 404; return { error: "not found" }; }
    return result;
  }
);
