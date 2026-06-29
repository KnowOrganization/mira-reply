// GET/PATCH /api/ig/settings, POST /api/ig/mode, POST /api/ig/modes,
// GET/POST /api/ig/onboarding — scoped to the logged-in user's account.
import { Elysia } from "elysia";
import { getSettings, patchSettings, getOnboarding, setOnboarding, getAiSettings, patchAiSettings } from "@shaiz/db";
import { authPlugin } from "../plugins/auth";

const MODES = ["shadow", "assisted", "balanced", "auto"];
const CHANNEL_MODES = ["shadow", "assisted", "auto"];

export const settingsRoute = new Elysia()
  .use(authPlugin)
  .get("/api/ig/settings", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return (await getSettings(auth.accountId)) ?? {};
  }, { auth: true })
  .patch("/api/ig/settings", async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return (await patchSettings(auth.accountId, (body ?? {}) as Record<string, unknown>)) ?? {};
  }, { requireRole: "admin" })
  .post("/api/ig/mode", async ({ auth, body, set }) => {
    const { mode } = (body ?? {}) as { mode?: string };
    if (!mode || !MODES.includes(mode)) { set.status = 400; return { error: "bad mode" }; }
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    // Legacy single-mode setter — keep both channels in sync for back-compat.
    const channel = mode === "balanced" ? "auto" : mode;
    const next = await patchSettings(auth.accountId, { replyMode: mode, commentMode: channel, dmMode: channel } as Record<string, unknown>);
    return { ok: true, mode: next?.replyMode };
  }, { requireRole: "admin" })
  // Per-channel modes — comments vs DMs set independently.
  .post("/api/ig/modes", async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const { commentMode, dmMode } = (body ?? {}) as { commentMode?: string; dmMode?: string };
    const patch: Record<string, unknown> = {};
    if (commentMode !== undefined) {
      if (!CHANNEL_MODES.includes(commentMode)) { set.status = 400; return { error: "bad commentMode" }; }
      patch.commentMode = commentMode;
    }
    if (dmMode !== undefined) {
      if (!CHANNEL_MODES.includes(dmMode)) { set.status = 400; return { error: "bad dmMode" }; }
      patch.dmMode = dmMode;
    }
    if (!Object.keys(patch).length) { set.status = 400; return { error: "no modes given" }; }
    const next = await patchSettings(auth.accountId, patch);
    return { ok: true, commentMode: next?.commentMode, dmMode: next?.dmMode };
  }, { requireRole: "admin" })
  .get("/api/ig/ai-settings", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return (await getAiSettings(auth.accountId)) ?? { error: "no account" };
  }, { auth: true })
  .patch("/api/ig/ai-settings", async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const { provider, byokKey } = (body ?? {}) as { provider?: "claude" | "ollama"; byokKey?: string | null };
    if (provider !== undefined && provider !== "claude" && provider !== "ollama") {
      set.status = 400; return { error: "bad provider" };
    }
    return (await patchAiSettings(auth.accountId, { provider, byokKey })) ?? { error: "no account" };
  }, { requireRole: "admin" })
  .get("/api/ig/onboarding", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return await getOnboarding(auth.accountId);
  }, { auth: true })
  .post("/api/ig/onboarding", async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const { action } = (body ?? {}) as { action?: "complete" | "skip" | "brain" };
    if (action === "skip") await setOnboarding(auth.accountId, { step: "done", skipped: true });
    else if (action === "complete") await setOnboarding(auth.accountId, { step: "done" });
    else if (action === "brain") await setOnboarding(auth.accountId, { step: "brain" });
    else { set.status = 400; return { error: "bad action" }; }
    return { ok: true, ...(await getOnboarding(auth.accountId)) };
  }, { requireRole: "agent" });
