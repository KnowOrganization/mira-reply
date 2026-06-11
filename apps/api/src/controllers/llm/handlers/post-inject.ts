// POST /api/ig/inject — inject a fake comment/dm through the full pipeline (auth-gated)
import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { injectEvent } from "../../../services/llm-service";

export const postInjectHandler = new Elysia().post(
  "/api/ig/inject",
  async ({ request, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }

    const b = (body ?? {}) as {
      kind?: "comment" | "dm";
      text: string;
      fromUsername?: string;
      fromUserId?: string;
      postId?: string;
    };

    return injectEvent({
      accountId: a.ctx.accountId,
      kind: b.kind || "comment",
      text: b.text,
      fromUserId: b.fromUserId || `dev_${Date.now()}`,
      fromUsername: b.fromUsername || "test_user",
      postId: b.postId,
    });
  }
);
