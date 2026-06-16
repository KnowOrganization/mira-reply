import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { syncRecentDMs } from "../../../services/crm-service";
import { publish } from "@/lib/ig/bus";

// Import the account's latest DM threads from Instagram into the inbox.
// Called on login (and via a manual "Sync" button) so the inbox shows real
// history. Importing 50 threads + messages can outlast the HTTP client's
// patience, so it runs FIRE-AND-FORGET: the request returns immediately and the
// inbox's polling picks up the threads as they land. Idempotent; messages dedupe
// on mid, so it merges cleanly with webhook-delivered rows.
export const postSyncDmsHandler = new Elysia().use(authPlugin).post(
  "/api/ig/crm/sync-dms",
  async ({ auth, query: q, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const accountId = auth.accountId;
    const limit = Math.min(100, Math.max(1, Number((q as Record<string, string>).limit) || 50));
    void syncRecentDMs(accountId, limit)
      .then((r) =>
        publish({
          type: "log",
          level: "error" in r ? "warn" : "info",
          msg: "error" in r ? `dm sync failed: ${r.error}` : `dm sync: imported ${r.threads} thread(s), ${r.messages} message(s)`,
          ts: Date.now(),
        })
      )
      .catch((e) => publish({ type: "log", level: "warn", msg: `dm sync crashed: ${String(e)}`, ts: Date.now() }));
    return { ok: true, started: true, limit };
  },
  { auth: true }
);
