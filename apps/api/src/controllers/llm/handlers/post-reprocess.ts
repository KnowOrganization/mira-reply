// POST /api/ig/reprocess — re-run the pipeline on a cached comment (auth-gated)
import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { reprocessComment } from "../../../services/llm-service";

export const postReprocessHandler = new Elysia().post(
  "/api/ig/reprocess",
  async ({ request, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }

    const { commentId } = (body ?? {}) as { commentId?: string };
    if (!commentId) { set.status = 400; return { error: "commentId required" }; }

    try {
      await reprocessComment({ accountId: a.ctx.accountId, commentId });
      return { ok: true };
    } catch (e) {
      if (e instanceof Error && (e as NodeJS.ErrnoException).code === "NOT_FOUND") {
        set.status = 404;
        return { error: "comment not found" };
      }
      set.status = 500;
      return { error: e instanceof Error ? e.message : "reprocess failed" };
    }
  }
);
