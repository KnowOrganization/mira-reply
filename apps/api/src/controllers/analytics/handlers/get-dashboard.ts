import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getDashboard } from "../../../services/analytics-service";

export const getDashboardHandler = new Elysia().use(authPlugin).get(
  "/api/ig/dashboard",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return getDashboard(auth.accountId);
  },
  { auth: true }
);
