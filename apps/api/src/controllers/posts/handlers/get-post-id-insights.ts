import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getPostInsights } from "../../../services/posts-service";

export const getPostIdInsightsHandler = new Elysia().use(authPlugin).get(
  "/api/ig/posts/:postId/insights",
  async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return getPostInsights(auth.accountId, params.postId, set);
  },
  { auth: true }
);
