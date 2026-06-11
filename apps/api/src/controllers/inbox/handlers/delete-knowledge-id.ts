import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { removeKnowledge } from "../../../services/inbox-service";

export const deleteKnowledgeIdHandler = new Elysia().use(authPlugin).delete(
  "/api/ig/knowledge/:id",
  async ({ params, auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    await removeKnowledge(params.id);
    return { ok: true };
  },
  { auth: true }
);
