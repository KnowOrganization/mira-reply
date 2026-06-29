import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { rebuildBrain } from "../../../services/analytics-service";

export const postBrainRebuildHandler = new Elysia().use(authPlugin).post(
  "/api/ig/brain/rebuild",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return await rebuildBrain(auth.accountId);
  },
  { requireRole: "agent" }
);
