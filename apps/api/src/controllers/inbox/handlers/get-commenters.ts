import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getCommenters } from "../../../services/inbox-service";

export const getCommentersHandler = new Elysia().use(authPlugin).get(
  "/api/ig/commenters",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return await getCommenters(auth.accountId);
  },
  { auth: true }
);
