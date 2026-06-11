// POST /api/playground — dry-run the pipeline on fake data (auth-gated)
import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { runPlayground } from "../../../services/llm-service";

export const postPlaygroundHandler = new Elysia().post(
  "/api/playground",
  async ({ request, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }

    const b = (body ?? {}) as {
      comment?: string;
      caption?: string;
      notes?: string;
      qa?: { q: string; a: string }[];
    };
    const text = (b.comment || "").trim();
    if (!text) { set.status = 400; return { error: "comment is required" }; }

    try {
      return await runPlayground({
        comment: text,
        caption: b.caption,
        notes: b.notes,
        qa: b.qa,
      });
    } catch (e) {
      set.status = 500;
      return { error: e instanceof Error ? e.message : "decide failed" };
    }
  }
);
