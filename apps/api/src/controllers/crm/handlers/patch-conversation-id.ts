import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { patchConversation } from "../../../services/crm-service";
import { roleFor, canEnableAutonomous } from "../../../lib/roles";

export const patchConversationIdHandler = new Elysia().use(authPlugin).patch(
  "/api/ig/crm/conversations/:id",
  async ({ auth, params, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const patch = (body ?? {}) as Record<string, unknown>;
    // spec Phase 4: switching a thread to autonomous is owner/admin only
    if (patch.ai_mode === "autonomous") {
      const role = await roleFor(auth.accountId, auth.userId);
      if (!canEnableAutonomous(role)) { set.status = 403; return { error: "autonomous mode requires owner/admin role" }; }
    }
    const conversation = await patchConversation(auth.accountId, params.id, patch);
    if (!conversation) { set.status = 404; return { error: "conversation not found or no valid fields" }; }
    return { conversation };
  },
  { requireRole: "agent" }
);
