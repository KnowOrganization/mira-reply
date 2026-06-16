import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { listConversations } from "../../../services/crm-service";

export const getConversationsHandler = new Elysia().use(authPlugin).get(
  "/api/ig/crm/conversations",
  async ({ auth, query: q, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const conversations = await listConversations(
      auth.accountId,
      typeof q.folder === "string" && q.folder ? q.folder : undefined
    );
    return { conversations };
  },
  { auth: true }
);
