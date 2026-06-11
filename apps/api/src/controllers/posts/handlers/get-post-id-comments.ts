import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getPostComments } from "../../../services/posts-service";

export const getPostIdCommentsHandler = new Elysia().use(authPlugin).get(
  "/api/ig/posts/:postId/comments",
  async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return getPostComments(auth.accountId, params.postId, set);
  },
  { auth: true }
);
