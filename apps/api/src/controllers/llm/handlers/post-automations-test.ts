// POST /api/ig/automations/:id/test — dry-run a visual automation (auth-gated)
import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { testAutomation } from "../../../services/llm-service";
import type { AutomationTriggerType } from "@/lib/ig/store";

export const postAutomationsTestHandler = new Elysia().post(
  "/api/ig/automations/:id/test",
  async ({ request, params, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }

    const b = (body ?? {}) as { text?: string; triggerType?: AutomationTriggerType };

    try {
      return await testAutomation({
        accountId: a.ctx.accountId,
        automationId: params.id,
        text: b.text ?? "test comment",
        triggerType: b.triggerType,
      });
    } catch (e) {
      if (e instanceof Error && (e as NodeJS.ErrnoException).code === "NOT_FOUND") {
        set.status = 404;
        return { error: "not found" };
      }
      set.status = 500;
      return { error: e instanceof Error ? e.message : "test failed" };
    }
  }
);
