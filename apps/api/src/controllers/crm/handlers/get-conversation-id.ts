import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getConversation } from "../../../services/crm-service";

export const getConversationIdHandler = new Elysia().use(authPlugin).get(
  "/api/ig/crm/conversations/:id",
  async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const found = await getConversation(auth.accountId, params.id);
    if (!found) { set.status = 404; return { error: "conversation not found" }; }
    return found;
  },
  { auth: true }
);
