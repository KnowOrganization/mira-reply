import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getPostsList } from "../../../services/posts-service";

export const getPostsHandler = new Elysia().use(authPlugin).get(
  "/api/ig/posts",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return getPostsList(auth.accountId);
  },
  { auth: true }
);
