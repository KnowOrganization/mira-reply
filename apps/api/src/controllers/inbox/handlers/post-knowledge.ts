import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { createKnowledge } from "../../../services/inbox-service";
import type { FactTopic } from "@/lib/ig/store";

export const postKnowledgeHandler = new Elysia().use(authPlugin).post(
  "/api/ig/knowledge",
  async ({ body, auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as {
      question?: string;
      answer?: string;
      topic?: FactTopic;
      scope?: "account" | "post";
      postId?: string;
      durable?: boolean;
    };
    const result = await createKnowledge(auth.accountId, b);
    if ("validationError" in result) {
      set.status = 400;
      return { error: result.validationError };
    }
    return result;
  },
  { requireRole: "agent" }
);
