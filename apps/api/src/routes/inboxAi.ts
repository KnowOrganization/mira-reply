// Conversational Inbox AI setup — ice-breakers (up to 4 shown on first open),
// persistent menu (up to 3 quick actions), read-receipt/typing toggles, and
// the VIP-follower threshold that gates priority handling.
import { Elysia } from "elysia";
import {
  getIceBreakers, setIceBreakers, getPersistentMenu, setPersistentMenu,
  getSettings, patchSettings, type IceBreakerRow, type MenuItemRow,
} from "@shaiz/db";
import { authPlugin } from "../plugins/auth";

export const inboxAiRoute = new Elysia()
  .use(authPlugin)
  .get("/api/ig/inbox-ai", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const [iceBreakers, persistentMenu, settings] = await Promise.all([
      getIceBreakers(auth.accountId), getPersistentMenu(auth.accountId), getSettings(auth.accountId),
    ]);
    return {
      iceBreakers, persistentMenu,
      autoSeen: settings?.inboxAiAutoSeen ?? true,
      autoTyping: settings?.inboxAiAutoTyping ?? true,
      vipFollowerThreshold: settings?.inboxAiVipFollowerThreshold ?? 1000,
    };
  }, { auth: true })
  .patch("/api/ig/inbox-ai", async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as { autoSeen?: boolean; autoTyping?: boolean; vipFollowerThreshold?: number };
    const patch: Record<string, unknown> = {};
    if (b.autoSeen !== undefined) patch.inboxAiAutoSeen = b.autoSeen;
    if (b.autoTyping !== undefined) patch.inboxAiAutoTyping = b.autoTyping;
    if (b.vipFollowerThreshold !== undefined) patch.inboxAiVipFollowerThreshold = b.vipFollowerThreshold;
    await patchSettings(auth.accountId, patch);
    return b;
  }, { requireRole: "agent" })
  .post("/api/ig/inbox-ai/ice-breakers", async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const iceBreakers = ((body as { iceBreakers?: IceBreakerRow[] } | null)?.iceBreakers ?? []).slice(0, 4);
    await setIceBreakers(auth.accountId, iceBreakers);
    // ponytail: stored, not yet pushed to Meta's messenger-profile ice-breaker
    // config (a separate Graph API surface) — `pushed:false` until that's wired.
    return { ok: true, pushed: false };
  }, { requireRole: "agent" })
  .post("/api/ig/inbox-ai/menu", async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const items = ((body as { items?: MenuItemRow[] } | null)?.items ?? []).slice(0, 3);
    await setPersistentMenu(auth.accountId, items);
    return { ok: true, pushed: false };
  }, { requireRole: "agent" });
