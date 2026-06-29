import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getKb } from "../../../services/inbox-service";

export const getKbHandler = new Elysia().use(authPlugin).get(
  "/api/ig/kb",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return await getKb();
  },
  { auth: true }
);
