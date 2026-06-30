// POST /api/ig/agent — Mira agent tool-loop (auth-gated)
import { Elysia, t } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { runAgentService, type AgentMsg } from "../../../services/llm-service";

// Bound the message array — the cost/memory abuse vector. Field shapes stay open
// (additionalProperties) so the frontend contract isn't constrained.
const agentBody = t.Object(
  { messages: t.Array(t.Unknown(), { minItems: 1, maxItems: 200 }) },
  { additionalProperties: true }
);

export const postAgentHandler = new Elysia().use(authPlugin).post(
  "/api/ig/agent",
  async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }

    const { messages } = (body ?? {}) as { messages?: AgentMsg[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      set.status = 400;
      return { error: "messages required" };
    }
    try {
      const { reply, actions } = await runAgentService(messages);
      return { reply, actions };
    } catch (e) {
      set.status = 500;
      return { error: e instanceof Error ? e.message : "agent failed" };
    }
  },
  { requireRole: "agent", body: agentBody }
);
