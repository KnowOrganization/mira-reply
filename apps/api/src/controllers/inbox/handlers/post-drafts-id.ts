import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { actOnDraft } from "../../../services/inbox-service";

export const postDraftsIdHandler = new Elysia().use(authPlugin).post(
  "/api/ig/drafts/:id",
  async ({ params, body, auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as { action?: "approve" | "reject" | "edit"; text?: string };
    const result = await actOnDraft(auth.accountId, params.id, b);
    if ("notFound" in result) { set.status = 404; return { error: "not found" }; }
    if ("notConnected" in result) { set.status = 400; return { error: "not connected" }; }
    if ("badAction" in result) { set.status = 400; return { error: "bad action" }; }
    return { ok: true };
  },
  { auth: true }
);
