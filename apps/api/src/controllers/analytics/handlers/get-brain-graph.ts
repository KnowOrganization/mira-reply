import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getBrainGraph } from "../../../services/analytics-service";

export const getBrainGraphHandler = new Elysia().use(authPlugin).get(
  "/api/ig/brain/graph",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return await getBrainGraph(auth.accountId);
  },
  { auth: true }
);
