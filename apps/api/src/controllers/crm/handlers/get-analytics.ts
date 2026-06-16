import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getCrmAnalytics } from "../../../services/crm-service";

export const getAnalyticsHandler = new Elysia().use(authPlugin).get(
  "/api/ig/crm/analytics",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return getCrmAnalytics(auth.accountId);
  },
  { auth: true }
);
