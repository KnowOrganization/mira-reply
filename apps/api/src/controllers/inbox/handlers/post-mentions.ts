import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { refreshMentions } from "../../../services/inbox-service";

export const postMentionsHandler = new Elysia().use(authPlugin).post(
  "/api/ig/mentions",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const result = await refreshMentions(auth.accountId);
    if ("fetchError" in result) {
      set.status = 500;
      return { error: result.fetchError };
    }
    return result;
  },
  { requireRole: "agent" }
);
