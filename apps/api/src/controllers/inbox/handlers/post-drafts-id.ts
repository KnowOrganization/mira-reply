import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { actOnDraft } from "../../../services/inbox-service";

export const postDraftsIdHandler = new Elysia().post(
  "/api/ig/drafts/:id",
  async ({ request, params, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as { action?: "approve" | "reject" | "edit"; text?: string };
    const result = await actOnDraft(a.ctx.accountId, params.id, b);
    if ("notFound" in result) { set.status = 404; return { error: "not found" }; }
    if ("notConnected" in result) { set.status = 400; return { error: "not connected" }; }
    if ("badAction" in result) { set.status = 400; return { error: "bad action" }; }
    return { ok: true };
  }
);
