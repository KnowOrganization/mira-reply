import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getMentions } from "../../../services/inbox-service";

export const getMentionsHandler = new Elysia().use(authPlugin).get(
  "/api/ig/mentions",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return await getMentions(auth.accountId);
  },
  { auth: true }
);
