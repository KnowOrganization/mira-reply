import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getBrainStats } from "../../../services/analytics-service";

export const getBrainStatsHandler = new Elysia().use(authPlugin).get(
  "/api/ig/brain-stats",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return getBrainStats();
  },
  { auth: true }
);
