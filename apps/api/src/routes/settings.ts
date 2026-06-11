// GET/PATCH /api/ig/settings, POST /api/ig/mode — scoped to the logged-in user's account.
import { Elysia } from "elysia";
import { getSettings, patchSettings } from "@shaiz/db";
import { requireUser } from "../lib/auth";

const MODES = ["shadow", "assisted", "balanced", "auto"];

export const settingsRoute = new Elysia()
  .get("/api/ig/settings", async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    return (await getSettings(a.ctx.accountId)) ?? {};
  })
  .patch("/api/ig/settings", async ({ request, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    return (await patchSettings(a.ctx.accountId, (body ?? {}) as Record<string, unknown>)) ?? {};
  })
  .post("/api/ig/mode", async ({ request, body, set }) => {
    const { mode } = (body ?? {}) as { mode?: string };
    if (!mode || !MODES.includes(mode)) { set.status = 400; return { error: "bad mode" }; }
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const next = await patchSettings(a.ctx.accountId, { replyMode: mode } as Record<string, unknown>);
    return { ok: true, mode: next?.replyMode };
  });
