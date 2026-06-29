import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { patchKnowledge } from "../../../services/inbox-service";
import type { Fact } from "@/lib/ig/store";

export const patchKnowledgeIdHandler = new Elysia().use(authPlugin).patch(
  "/api/ig/knowledge/:id",
  async ({ params, body, auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const patch = (body ?? {}) as Partial<Fact>;
    const result = await patchKnowledge(params.id, patch);
    if (!result) { set.status = 404; return { error: "not found" }; }
    return result;
  },
  { requireRole: "agent" }
);
