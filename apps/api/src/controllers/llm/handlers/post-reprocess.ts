// POST /api/ig/reprocess — re-run the pipeline on a cached comment (auth-gated)
import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { reprocessComment } from "../../../services/llm-service";

export const postReprocessHandler = new Elysia().use(authPlugin).post(
  "/api/ig/reprocess",
  async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }

    const { commentId } = (body ?? {}) as { commentId?: string };
    if (!commentId) { set.status = 400; return { error: "commentId required" }; }

    try {
      await reprocessComment({ accountId: auth.accountId, commentId });
      return { ok: true };
    } catch (e) {
      if (e instanceof Error && (e as NodeJS.ErrnoException).code === "NOT_FOUND") {
        set.status = 404;
        return { error: "comment not found" };
      }
      set.status = 500;
      return { error: e instanceof Error ? e.message : "reprocess failed" };
    }
  },
  { auth: true }
);
