// POST /api/playground — dry-run the pipeline on fake data (auth-gated)
import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { runPlayground } from "../../../services/llm-service";

export const postPlaygroundHandler = new Elysia().use(authPlugin).post(
  "/api/playground",
  async ({ auth, body, set }) => {
    const b = (body ?? {}) as {
      comment?: string;
      caption?: string;
      notes?: string;
      qa?: { q: string; a: string }[];
    };
    const text = (b.comment || "").trim();
    if (!text) { set.status = 400; return { error: "comment is required" }; }

    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }

    try {
      return await runPlayground({
        accountId: auth.accountId,
        comment: text,
        caption: b.caption,
        notes: b.notes,
        qa: b.qa,
      });
    } catch (e) {
      set.status = 500;
      return { error: e instanceof Error ? e.message : "decide failed" };
    }
  },
  { requireRole: "agent" }
);
