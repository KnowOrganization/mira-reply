import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { dismissDraft } from "../../../services/crm-service";

export const postDraftDismissHandler = new Elysia().use(authPlugin).post(
  "/api/ig/crm/conversations/:id/draft/dismiss",
  async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const conversation = await dismissDraft(auth.accountId, params.id);
    if (!conversation) { set.status = 404; return { error: "conversation not found" }; }
    return { conversation };
  },
  { requireRole: "agent" }
);
