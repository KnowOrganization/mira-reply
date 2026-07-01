// Guard Center — moderation rules (auto-flag categories + keyword blocklist),
// crisis kill-switch, flagged-item review queue, and the resolved-action log.
import { Elysia } from "elysia";
import {
  listModerationRules, createModerationRule, updateModerationRule, deleteModerationRule,
  getCrisisMode, setCrisisMode, listModerationLog, listFlaggedModeration,
  resolveModerationItem, markModerationLogReverted, listBlockedUsers,
} from "@shaiz/db";
import { authPlugin } from "../plugins/auth";

export const moderationRulesRoute = new Elysia()
  .use(authPlugin)
  .get("/api/ig/moderation/rules", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return { rules: await listModerationRules(auth.accountId) };
  }, { auth: true })
  .post("/api/ig/moderation/rules", async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as { type?: string; pattern?: string; action?: string };
    if (!b.type) { set.status = 400; return { error: "type required" }; }
    const rule = await createModerationRule(auth.accountId, { type: b.type, pattern: b.pattern, action: b.action });
    set.status = 201;
    return { rule };
  }, { requireRole: "agent" })
  .patch("/api/ig/moderation/rules/:id", async ({ auth, params, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const rule = await updateModerationRule(auth.accountId, params.id, (body ?? {}) as Record<string, unknown>);
    if (!rule) { set.status = 404; return { error: "not found" }; }
    return { rule };
  }, { requireRole: "agent" })
  .delete("/api/ig/moderation/rules/:id", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const ok = await deleteModerationRule(auth.accountId, params.id);
    if (!ok) { set.status = 404; return { error: "not found" }; }
    return { ok: true };
  }, { requireRole: "agent" })
  .get("/api/ig/moderation/crisis", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return { armed: await getCrisisMode(auth.accountId) };
  }, { auth: true })
  .post("/api/ig/moderation/crisis", async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const armed = !!(body as { armed?: boolean } | null)?.armed;
    await setCrisisMode(auth.accountId, armed);
    return { armed };
  }, { requireRole: "agent" })
  .get("/api/ig/moderation/log", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return { log: await listModerationLog(auth.accountId) };
  }, { auth: true })
  .post("/api/ig/moderation/log/:id/revert", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    await markModerationLogReverted(auth.accountId, Number(params.id));
    return { ok: true };
  }, { requireRole: "agent" })
  // Flagged-item review queue (Guard's "Flagged" segment) — pending items +
  // the owner's Allow/Hide/Block resolution.
  .get("/api/ig/moderation/flagged", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return { flagged: await listFlaggedModeration(auth.accountId) };
  }, { auth: true })
  .post("/api/ig/moderation/flagged/:id/resolve", async ({ auth, params, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const action = (body as { action?: string } | null)?.action ?? "allow";
    const item = await resolveModerationItem(auth.accountId, Number(params.id), action);
    if (!item) { set.status = 404; return { error: "not found" }; }
    return { item };
  }, { requireRole: "agent" })
  // Blocklist segment read side — add/remove already live at
  // POST/DELETE /api/ig/users/:igUserId/block (routes/moderation.ts).
  .get("/api/ig/moderation/blocklist", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return { blocked: await listBlockedUsers(auth.accountId) };
  }, { auth: true });
