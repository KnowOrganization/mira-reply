import { readStore, updateStoreFor, patchStoreFor } from "./store";
import { fetchAllFollowers, refreshLongLivedToken } from "./graph";
import { publish } from "./bus";

// Periodic per-account maintenance — used to live inside the watcher's 7s tick
// (every 240 ticks); now run as BullMQ repeatable jobs from the worker.

const TOKEN_REFRESH_THRESHOLD_MS = 7 * 24 * 3600_000;

/** Rebuild the full follower cache so checkIsFollower works for old followers. */
export async function syncFollowers(accountId: string): Promise<void> {
  const store = await readStore(accountId);
  if (!store.account) return;
  try {
    const followers = await fetchAllFollowers(store.account.igUserId, store.account.accessToken);
    await updateStoreFor(accountId, (st) => ({
      ...st,
      followerCache: followers.map((f) => ({
        userId: f.id,
        username: f.username,
        followedAt: (st.followerCache ?? []).find((c) => c.userId === f.id)?.followedAt ?? Date.now(),
      })).slice(-10_000),
    }));
    publish({ type: "log", level: "info", msg: `maintenance: follower cache synced (${followers.length})`, ts: Date.now() });
  } catch (e) {
    publish({ type: "log", level: "warn", msg: `maintenance: follower sync failed: ${String(e)}`, ts: Date.now() });
  }
}

/** Keep the 60-day long-lived IG token alive — refresh when <7 days remain. */
export async function refreshTokenIfNeeded(accountId: string): Promise<void> {
  const store = await readStore(accountId);
  const acct = store.account;
  if (!acct?.accessToken || !acct.tokenExpiresAt) return;
  const msLeft = acct.tokenExpiresAt - Date.now();
  const ageMs = Date.now() - (acct.connectedAt ?? 0);
  // Instagram only refreshes tokens >24h old and not yet expired
  if (msLeft >= TOKEN_REFRESH_THRESHOLD_MS || msLeft <= 0 || ageMs <= 24 * 3600_000) return;
  try {
    const refreshed = await refreshLongLivedToken(acct.accessToken);
    await patchStoreFor(accountId, {
      account: { ...acct, accessToken: refreshed.access_token, tokenExpiresAt: Date.now() + refreshed.expires_in * 1000 },
      lastToken: refreshed.access_token,
    });
    publish({ type: "log", level: "info", msg: `maintenance: IG token refreshed (+${Math.round(refreshed.expires_in / 86400)}d)`, ts: Date.now() });
  } catch (e) {
    publish({ type: "log", level: "warn", msg: `maintenance: token refresh failed: ${String(e)}`, ts: Date.now() });
  }
}
