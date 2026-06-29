import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { stopReplyAll } from "../../../services/posts-service";

export const postPostIdReplyAllStopHandler = new Elysia().use(authPlugin).post(
  "/api/ig/posts/:postId/reply-all/stop",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return stopReplyAll();
  },
  { requireRole: "agent" }
);
