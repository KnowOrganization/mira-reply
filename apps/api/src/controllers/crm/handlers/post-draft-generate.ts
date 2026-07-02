import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { generateDraft } from "../../../services/crm-service";

export const postDraftGenerateHandler = new Elysia().use(authPlugin).post(
  "/api/ig/crm/conversations/:id/draft/generate",
  async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const result = await generateDraft(auth.accountId, params.id);
    if (!result.ok) { set.status = result.status; return { error: result.reason }; }
    return { draft: result.draft };
  },
  { requireRole: "agent" }
);
