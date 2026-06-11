import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getDrafts } from "../../../services/inbox-service";

export const getDraftsHandler = new Elysia().use(authPlugin).get(
  "/api/ig/drafts",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return await getDrafts(auth.accountId);
  },
  { auth: true }
);
