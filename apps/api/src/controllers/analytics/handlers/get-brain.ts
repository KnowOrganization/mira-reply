import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getBrain } from "../../../services/analytics-service";

export const getBrainHandler = new Elysia().use(authPlugin).get(
  "/api/ig/brain",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return getBrain(auth.accountId);
  },
  { auth: true }
);
