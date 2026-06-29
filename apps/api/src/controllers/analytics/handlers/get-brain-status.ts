import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getBrainStatus } from "../../../services/analytics-service";

export const getBrainStatusHandler = new Elysia().use(authPlugin).get(
  "/api/ig/brain/status",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return await getBrainStatus(auth.accountId);
  },
  { auth: true }
);
