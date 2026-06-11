import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getComments } from "../../../services/inbox-service";

export const getCommentsHandler = new Elysia().use(authPlugin).get(
  "/api/ig/comments",
  async ({ query, auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "not connected" }; }
    const refresh = (query as Record<string, string | undefined>).refresh === "1";
    const result = await getComments(auth.accountId, refresh);
    if (result.notConnected) { set.status = 400; return { error: "not connected" }; }
    return { rows: result.rows, count: result.count, live: result.live };
  },
  { auth: true }
);
