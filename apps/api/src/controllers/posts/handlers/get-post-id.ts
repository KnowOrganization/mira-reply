import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getPost } from "../../../services/posts-service";

export const getPostIdHandler = new Elysia().use(authPlugin).get(
  "/api/ig/posts/:postId",
  async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return getPost(auth.accountId, params.postId, set);
  },
  { auth: true }
);
