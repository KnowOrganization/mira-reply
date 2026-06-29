import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { postCleanup } from "../../../services/analytics-service";

export const postCleanupHandler = new Elysia().use(authPlugin).post(
  "/api/ig/cleanup",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return postCleanup(auth.accountId);
  },
  { requireRole: "agent" }
);
