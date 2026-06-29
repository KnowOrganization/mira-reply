// POST /api/ig/agent — Mira agent tool-loop (auth-gated)
import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { runAgentService, type AgentMsg } from "../../../services/llm-service";

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
  { requireRole: "agent" }
);
