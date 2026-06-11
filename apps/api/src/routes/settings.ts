// GET/PATCH /api/ig/settings, POST /api/ig/mode — scoped to the logged-in user's account.
import { Elysia } from "elysia";
import { getSettings, patchSettings } from "@shaiz/db";
import { authPlugin } from "../plugins/auth";

const MODES = ["shadow", "assisted", "balanced", "auto"];

export const settingsRoute = new Elysia()
  .use(authPlugin)
  .get("/api/ig/settings", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return (await getSettings(auth.accountId)) ?? {};
  }, { auth: true })
  .patch("/api/ig/settings", async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return (await patchSettings(auth.accountId, (body ?? {}) as Record<string, unknown>)) ?? {};
  }, { auth: true })
  .post("/api/ig/mode", async ({ auth, body, set }) => {
    const { mode } = (body ?? {}) as { mode?: string };
    if (!mode || !MODES.includes(mode)) { set.status = 400; return { error: "bad mode" }; }
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const next = await patchSettings(auth.accountId, { replyMode: mode } as Record<string, unknown>);
    return { ok: true, mode: next?.replyMode };
  }, { auth: true });
