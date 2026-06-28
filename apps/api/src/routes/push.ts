// Expo push token registration. The app registers its token after login and
// unregisters on logout / notifications-off. Dispatch is server-side (sendPush).
import { Elysia } from "elysia";
import { registerDeviceToken, unregisterDeviceToken } from "@shaiz/db";
import { authPlugin } from "../plugins/auth";

export const pushRoute = new Elysia()
  .use(authPlugin)
  .post("/api/ig/push/register", async ({ auth, body, set }) => {
    const b = (body ?? {}) as { expoPushToken?: string; platform?: string };
    if (!b.expoPushToken || !String(b.expoPushToken).trim()) {
      set.status = 400; return { error: "expoPushToken required" };
    }
    const platform = b.platform === "android" ? "android" : "ios";
    await registerDeviceToken(auth.userId, b.expoPushToken, platform, auth.accountId ?? null);
    set.status = 201;
    return { ok: true };
  }, { auth: true })
  .delete("/api/ig/push/register", async ({ body, set }) => {
    const b = (body ?? {}) as { expoPushToken?: string };
    if (!b.expoPushToken) { set.status = 400; return { error: "expoPushToken required" }; }
    const ok = await unregisterDeviceToken(b.expoPushToken);
    if (!ok) { set.status = 404; return { error: "not found" }; }
    return { ok: true };
  }, { auth: true });
