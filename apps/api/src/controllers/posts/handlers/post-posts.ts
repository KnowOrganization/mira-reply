import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { syncPosts } from "../../../services/posts-service";

export const postPostsHandler = new Elysia().use(authPlugin).post(
  "/api/ig/posts",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return syncPosts(auth.accountId, set);
  },
  { requireRole: "agent" }
);
