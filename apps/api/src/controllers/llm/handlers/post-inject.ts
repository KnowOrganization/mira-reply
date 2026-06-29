// POST /api/ig/inject — inject a fake comment/dm through the full pipeline (auth-gated)
import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { injectEvent } from "../../../services/llm-service";

export const postInjectHandler = new Elysia().use(authPlugin).post(
  "/api/ig/inject",
  async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }

    const b = (body ?? {}) as {
      kind?: "comment" | "dm";
      text: string;
      fromUsername?: string;
      fromUserId?: string;
      postId?: string;
    };

    return injectEvent({
      accountId: auth.accountId,
      kind: b.kind || "comment",
      text: b.text,
      fromUserId: b.fromUserId || `dev_${Date.now()}`,
      fromUsername: b.fromUsername || "test_user",
      postId: b.postId,
    });
  },
  { requireRole: "agent" }
);
