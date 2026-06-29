// CRUD /api/ig/automations[/:id] — scoped to the logged-in user's account.
import { Elysia } from "elysia";
import {
  listAutomations, getAutomation, insertAutomation, patchAutomation, removeAutomation,
} from "@shaiz/db";
import { authPlugin } from "../plugins/auth";

export const automationsRoute = new Elysia()
  .use(authPlugin)
  .get("/api/ig/automations", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return { automations: await listAutomations(auth.accountId) };
  }, { auth: true })
  .post("/api/ig/automations", async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const now = Date.now();
    const id = `auto_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const name = ((body ?? {}) as { name?: string }).name?.trim() || "New Automation";
    const automation = {
      id, name, enabled: false,
      trigger: { type: "comment_post", keywords: [], postIds: [] },
      nodes: [{
        id: `node_trigger_${now.toString(36)}`, type: "trigger",
        position: { x: 0, y: 0 }, data: { text: "comment_post", subtitle: "keywords", enabled: true },
      }],
      edges: [], stats: { triggered: 0, completed: 0, failed: 0 }, createdAt: now, updatedAt: now,
    };
    await insertAutomation(auth.accountId, { ...automation, accountId: auth.accountId } as any);
    set.status = 201;
    return { automation };
  }, { requireRole: "agent" })
  .get("/api/ig/automations/:id", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const automation = await getAutomation(auth.accountId, params.id);
    if (!automation) { set.status = 404; return { error: "not found" }; }
    return { automation };
  }, { auth: true })
  .patch("/api/ig/automations/:id", async ({ auth, params, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const allowed = ["name", "enabled", "trigger", "nodes", "edges", "stats"];
    const patch: Record<string, unknown> = {};
    for (const k of allowed) if ((body as any)?.[k] !== undefined) patch[k] = (body as any)[k];
    const automation = await patchAutomation(auth.accountId, params.id, patch as any);
    if (!automation) { set.status = 404; return { error: "not found" }; }
    return { automation };
  }, { requireRole: "agent" })
  .delete("/api/ig/automations/:id", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const ok = await removeAutomation(auth.accountId, params.id);
    if (!ok) { set.status = 404; return { error: "not found" }; }
    return { ok: true };
  }, { requireRole: "agent" });
