import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getFeed } from "../../../services/analytics-service";

export const getFeedHandler = new Elysia().use(authPlugin).get(
  "/api/ig/feed",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return getFeed(auth.accountId);
  },
  { auth: true }
);
