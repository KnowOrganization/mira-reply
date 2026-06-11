import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getClarifications } from "../../../services/inbox-service";

export const getClarificationsHandler = new Elysia().use(authPlugin).get(
  "/api/ig/clarifications",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return await getClarifications(auth.accountId);
  },
  { auth: true }
);
