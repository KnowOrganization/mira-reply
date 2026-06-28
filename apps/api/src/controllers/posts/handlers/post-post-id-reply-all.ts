import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { replyAll } from "../../../services/posts-service";

export const postPostIdReplyAllHandler = new Elysia().use(authPlugin).post(
  "/api/ig/posts/:postId/reply-all",
  async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return replyAll(auth.accountId, params.postId, set);
  },
  { requireRole: "agent" }
);
