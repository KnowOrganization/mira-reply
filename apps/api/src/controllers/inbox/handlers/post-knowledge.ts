import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { createKnowledge } from "../../../services/inbox-service";
import type { FactTopic } from "@/lib/ig/store";

export const postKnowledgeHandler = new Elysia().post(
  "/api/ig/knowledge",
  async ({ request, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as {
      question?: string;
      answer?: string;
      topic?: FactTopic;
      scope?: "account" | "post";
      postId?: string;
      durable?: boolean;
    };
    const result = await createKnowledge(b);
    if ("validationError" in result) {
      set.status = 400;
      return { error: result.validationError };
    }
    return result;
  }
);
