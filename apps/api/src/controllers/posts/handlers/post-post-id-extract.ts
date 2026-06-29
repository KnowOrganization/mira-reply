import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { extractPost } from "../../../services/posts-service";

export const postPostIdExtractHandler = new Elysia().use(authPlugin).post(
  "/api/ig/posts/:postId/extract",
  async ({ auth, params, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }

    const { paragraph } = (body ?? {}) as { paragraph: string };
    return extractPost(auth.accountId, params.postId, paragraph, set);
  },
  { requireRole: "agent" }
);
