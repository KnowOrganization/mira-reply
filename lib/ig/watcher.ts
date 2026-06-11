import { readStore, patchStore, updateStore, type CachedComment } from "./store";
import { getAllMedia, getMediaComments, getRecentDMMessages, sendCommentPrivateReply, sendDM, fetchAllFollowers, refreshLongLivedToken, isRateLimitError } from "./graph";
import { processInbound } from "./pipeline";
import { publish } from "./bus";
import { hasSeen, markSeen, primeSeen, seenSize } from "./seen";
import { matchAutomations, executeAutomation, resumeAutomationAfterButtonClick, resumeAutomationAfterFollow, drainAutomationRetries, type AutomationEvent } from "./automation";

const MAX_CACHE = 5000;

type Raw = {
  id: string;
  text: string;
  from?: { id: string; username?: string };
  timestamp: string;
  replies?: { data?: Raw[] };
};

type State = {
  timer: ReturnType<typeof setInterval> | null;
  inFlight: boolean;
  intervalMs: number;
  startedAt: number;
  ticks: number;
};

// poll fast — the hottest recent posts every tick, the FULL account
// catalogue every 6th tick. Most new comments land on recent posts, so this
// keeps detection near real-time without hammering the Instagram API on
// every tick, while still never missing a comment on an older post.
const FAST_INTERVAL = 7_000;
const HOT_MEDIA = 12;
const FULL_SWEEP_EVERY = 6;
// sync full follower list every ~30 min (60 ticks × 7s = 420s ≈ 7min, 240 ticks ≈ 28min)
const FOLLOWER_SYNC_EVERY = 240;

// keep the 60-day long-lived IG token alive — check ~every 28 min, refresh
// when under 7 days remain. Without this the token expires and every Graph
// API call silently fails until manual reconnect.
const TOKEN_REFRESH_CHECK_EVERY = 240;
const TOKEN_REFRESH_THRESHOLD_MS = 7 * 24 * 3600_000;
// a never-seen comment newer than this still gets a conclusion even if the
// watermark has moved past it. Older than this = pre-existing backlog, left
// alone (auto-replying a months-old backlog would be spam + a ban risk).
const CATCHUP_WINDOW_MS = 48 * 60 * 60 * 1000;

const gDM = globalThis as unknown as { __mira_seen_dms?: Set<string>; __mira_dm_watermark?: number };
if (!gDM.__mira_seen_dms) gDM.__mira_seen_dms = new Set();
if (!gDM.__mira_dm_watermark) gDM.__mira_dm_watermark = Date.now() - 5 * 60_000; // check last 5 min on first tick
const seenDMs = gDM.__mira_seen_dms;

const g = globalThis as unknown as { __mira_watcher?: State };
if (!g.__mira_watcher) {
  g.__mira_watcher = {
    timer: null,
    inFlight: false,
    intervalMs: FAST_INTERVAL,
    startedAt: 0,
    ticks: 0,
  };
}
const s = g.__mira_watcher;

export function ensureWatcher() {
  // Honour the safe-mode kill-switch everywhere, not just at module load — so a
  // /poll or /watcher call can't spin up the live IG loops when disabled.
  if (process.env.MIRA_WATCHER_DISABLED === "1") {
    return { running: false, disabled: true, intervalMs: s.intervalMs, startedAt: 0 };
  }
  // per-second real-time automation loop (independent of the 7s general tick)
  if (!rtG.__mira_rt_timer) {
    rtG.__mira_rt_timer = setInterval(() => { void realtimeTick(); }, REALTIME_INTERVAL);
    void realtimeTick();
  }
  if (s.timer) return { running: true, intervalMs: s.intervalMs, startedAt: s.startedAt };
  s.startedAt = Date.now();
  s.timer = setInterval(() => {
    void tick();
  }, s.intervalMs);
  // first run immediate
  void tick();
  return { running: true, intervalMs: s.intervalMs, startedAt: s.startedAt };
}

export function stopWatcher() {
  if (s.timer) {
    clearInterval(s.timer);
    s.timer = null;
  }
  if (rtG.__mira_rt_timer) {
    clearInterval(rtG.__mira_rt_timer);
    rtG.__mira_rt_timer = null;
  }
  return { running: false };
}

export function watcherStatus() {
  return {
    running: !!s.timer,
    intervalMs: s.intervalMs,
    startedAt: s.startedAt,
    seenCount: seenSize(),
  };
}

async function drainSendQueue() {
  const store = await readStore();
  if (!store.account) return;
  const now = Date.now();
  const due = (store.sendQueue ?? []).filter((s) => s.releaseAt <= now);
  if (!due.length) return;

  for (const item of due) {
    const retryCount = item.retryCount ?? 0;
    let sent = false;
    try {
      if (item.kind === "private_reply") {
        await sendCommentPrivateReply(
          store.account.igUserId, item.targetId, item.text, store.account.accessToken
        );
      } else {
        await sendDM(
          store.account.igUserId, item.recipientId!, item.text, store.account.accessToken
        );
      }
      sent = true;
      publish({ type: "log", level: "info", msg: `sendQueue: sent scheduled message (${item.id})`, ts: Date.now() });
    } catch (e) {
      publish({ type: "log", level: "error", msg: `sendQueue: failed ${item.id} (attempt ${retryCount + 1}): ${String(e)}`, ts: Date.now() });
    }
    if (sent || retryCount >= 2) {
      // remove on success or after 3 attempts
      await updateStore((s) => ({ ...s, sendQueue: s.sendQueue.filter((q) => q.id !== item.id) }));
    } else {
      // increment retry count and reschedule +5 minutes
      await updateStore((s) => ({
        ...s,
        sendQueue: s.sendQueue.map((q) =>
          q.id === item.id ? { ...q, retryCount: retryCount + 1, releaseAt: Date.now() + 5 * 60_000 } : q
        ),
      }));
    }
  }
}

// Poll DMs (button clicks + follow confirms) — runs in the 1s loop so a tap
// resumes almost instantly instead of waiting for the 7s tick.
let dmPollInFlight = false;
async function pollDMs(ownId: string, token: string) {
  if (dmPollInFlight) return;
  dmPollInFlight = true;
  try {
    const dmSince = gDM.__mira_dm_watermark!;
    const newDMs = await getRecentDMMessages(ownId, token, dmSince);
    let latestDMts = dmSince;
    if (newDMs.length > 0) {
      publish({ type: "log", level: "info", msg: `watcher: ${newDMs.length} new DM(s) to process`, ts: Date.now() });
    }
    for (const dm of newDMs) {
      if (seenDMs.has(dm.id)) continue;
      seenDMs.add(dm.id);
      if (dm.ts > latestDMts) latestDMts = dm.ts;

      // Resume state lives in Postgres now — the atomic claimPending inside each
      // resume fn is the gate (returns false when nothing parked). Try button
      // first; if it didn't claim and the DM looks like a follow-confirm, try follow.
      const FOLLOW_CONFIRM = /\b(send|yes|yep|done|following|followed|ok|okay|sure|ready)\b/i;
      const resumedBtn = await resumeAutomationAfterButtonClick(dm.fromUserId, dm.fromUsername).catch((e) => {
        publish({ type: "log", level: "error", msg: `watcher button resume: ${String(e)}`, ts: Date.now() });
        return false;
      });
      if (!resumedBtn && FOLLOW_CONFIRM.test(dm.text)) {
        await resumeAutomationAfterFollow(dm.fromUserId, dm.fromUsername).catch((e) =>
          publish({ type: "log", level: "error", msg: `watcher follow resume: ${String(e)}`, ts: Date.now() })
        );
      }
    }
    gDM.__mira_dm_watermark = latestDMts;
    if (seenDMs.size > 5000) seenDMs.clear();
  } catch (e) {
    publish({ type: "log", level: "warn", msg: `watcher: DM poll failed: ${String(e)}`, ts: Date.now() });
  } finally {
    dmPollInFlight = false;
  }
}

/* ---------- real-time automation loop (per-second) ---------- */
// Polls ONLY posts that have an active comment-automation, every ~1s, so a
// matching comment fires its DM almost instantly — without hammering the whole
// media catalogue. The 7s tick still handles the pipeline + caching + DM resumes.
const REALTIME_INTERVAL = 1000;
const RT_BACKOFF_MS = 60_000;
const rtG = globalThis as unknown as {
  __mira_rt_timer?: ReturnType<typeof setInterval> | null;
  __mira_rt_inflight?: boolean;
  __mira_rt_backoff?: number;
  __mira_rt_seen?: Set<string>;
  __mira_rt_start?: number;
};
if (!rtG.__mira_rt_seen) rtG.__mira_rt_seen = new Set();
const rtSeen = rtG.__mira_rt_seen; // comments already evaluated by the fast loop (separate from global `seen`)

async function realtimeTick() {
  if (rtG.__mira_rt_inflight) return;
  if (Date.now() < (rtG.__mira_rt_backoff ?? 0)) return;
  // Backlog guard: only act on comments posted AFTER the loop started. Without
  // this, a fresh start (empty `seen`) would fire the automation for every
  // pre-existing comment on the post — a mass-DM flood.
  if (!rtG.__mira_rt_start) rtG.__mira_rt_start = Date.now();
  const startAt = rtG.__mira_rt_start;
  rtG.__mira_rt_inflight = true;
  try {
    const store = await readStore();
    if (!store.account) return;
    const token = store.account.accessToken;
    const ownId = store.account.igUserId;
    const ownName = (store.account.username ?? "").toLowerCase();

    // poll DMs every ~1s → button taps / follow confirms resume almost instantly
    await pollDMs(ownId, token);

    const autos = (store.automations ?? []).filter(
      (a) => a.enabled && (a.trigger.type === "comment_post" || a.trigger.type === "live_comment")
    );
    if (!autos.length) return;

    // posts to watch = explicit trigger postIds; if any automation targets all
    // posts, add the few most-recent media so "all posts" still polls fast.
    const targeted = new Set<string>();
    let allPosts = false;
    for (const a of autos) {
      const tNode = a.nodes.find((n) => n.type === "trigger");
      const ids = a.trigger.postIds?.length ? a.trigger.postIds : (tNode?.data.postIds ?? []);
      if (ids.length) ids.forEach((id) => targeted.add(id));
      else allPosts = true;
    }
    if (allPosts) {
      Object.values(store.posts)
        .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
        .slice(0, 6)
        .forEach((p) => targeted.add(p.id));
    }
    if (!targeted.size) return;

    for (const mid of targeted) {
      let res: { data?: Raw[] };
      try {
        res = (await getMediaComments(mid, token)) as { data?: Raw[] };
      } catch (e) {
        if (isRateLimitError(e)) { rtG.__mira_rt_backoff = Date.now() + RT_BACKOFF_MS; return; }
        continue;
      }
      const flat: Raw[] = [];
      for (const c of res.data ?? []) { flat.push(c); for (const r of c.replies?.data ?? []) flat.push(r); }

      for (const c of flat) {
        if (!c.from || rtSeen.has(c.id) || hasSeen(c.id)) continue;
        // skip backlog — only comments posted after the loop started
        const cts = new Date(c.timestamp).getTime();
        if (Number.isNaN(cts) || cts < startAt) { rtSeen.add(c.id); continue; }
        const isOwn = c.from.id === ownId || (!!ownName && c.from.username?.toLowerCase() === ownName);
        if (isOwn) { rtSeen.add(c.id); markSeen(c.id); continue; }

        const evt: AutomationEvent = {
          type: "comment_post",
          commentId: c.id,
          fromUserId: c.from.id,
          fromUsername: c.from.username,
          text: c.text,
          postId: mid,
        };
        const matched = matchAutomations(store, evt);
        // Only claim (markSeen) comments we actually act on. Non-matching comments
        // stay unseen so the 7s tick can still route them to the Mira pipeline;
        // rtSeen stops us re-evaluating them every second in the meantime.
        rtSeen.add(c.id);
        if (rtSeen.size > 10_000) rtSeen.clear();
        if (!matched.length) continue;
        markSeen(c.id);
        publish({ type: "log", level: "info", msg: `realtime: ${matched.length} automation(s) matched for comment ${c.id} on ${mid}`, ts: Date.now() });
        for (const auto of matched) {
          await executeAutomation(auto, evt).catch((e) =>
            publish({ type: "log", level: "error", msg: `realtime automation [${auto.id}]: ${String(e)}`, ts: Date.now() })
          );
        }
      }
    }
  } catch (e) {
    publish({ type: "log", level: "warn", msg: `realtime tick: ${String(e)}`, ts: Date.now() });
  } finally {
    rtG.__mira_rt_inflight = false;
  }
}

export async function tick() {
  // wait for any in-flight tick to finish, then re-check
  while (s.inFlight) await new Promise((r) => setTimeout(r, 250));
  s.inFlight = true;
  try {
    const store = await readStore();
    if (!store.account) return { newCount: 0, skipped: true };
    const token = store.account.accessToken;
    const ownId = store.account.igUserId;
    const ownName = store.account.username.toLowerCase();
    // Instagram omits username on reply `from` objects and returns an
    // inconsistent id — so also treat any comment whose text exactly matches
    // a reply Mira has sent as own. Prevents Mira replying to its own replies.
    const sentReplies = new Set(
      store.history
        .filter((h) => h.status === "sent" && h.outbound)
        .map((h) => h.outbound)
    );
    const isOwnComment = (
      from: { id: string; username?: string },
      text: string
    ) =>
      from.id === ownId ||
      (!!from.username && from.username.toLowerCase() === ownName) ||
      sentReplies.has(text);
    const watermark = store.pollWatermark || 0;
    let newest = watermark;

    // restore the shared seen set on first run — but ONLY from comments that
    // were actually concluded (replied / skipped / drafted / clarified) or
    // are Mira's own. A comment merely *cached* (e.g. by the post-detail
    // fetch) must stay processable — otherwise a restart buries it as "seen"
    // forever and it never gets a conclusion.
    if (seenSize() === 0 && store.commentsCache.length > 0) {
      const concluded = new Set<string>();
      for (const h of store.history)
        if (h.commentId && (h.status === "sent" || h.status === "skipped"))
          concluded.add(h.commentId);
      for (const d of store.pendingDrafts) concluded.add(d.threadOrMediaId);
      for (const cl of store.clarifications)
        if (cl.commentId) concluded.add(cl.commentId);
      const prime = store.commentsCache
        .filter((c) => c.isOwn || concluded.has(c.id))
        .map((c) => c.id);
      if (prime.length) primeSeen(prime);
    }
    const cachedById = new Map(store.commentsCache.map((c) => [c.id, c]));

    const newCached: CachedComment[] = [];
    let newCount = 0;

    // the ENTIRE account catalogue — paginated, every post, not just the
    // newest page. Without this, comments on older posts are never seen.
    const media = (await getAllMedia(token)) as {
      data?: Array<{
        id: string;
        caption?: string;
        permalink?: string;
        thumbnail_url?: string;
        media_url?: string;
      }>;
    };
    // every tick scans the hottest recent media; a full sweep over EVERY
    // post runs periodically so comments on older posts are never missed.
    const full = s.ticks % FULL_SWEEP_EVERY === 0;
    s.ticks++;
    const allMedia = media.data ?? [];
    const baseScan = full ? allMedia : allMedia.slice(0, HOT_MEDIA);
    // Always include posts watched by active automations — even if they're old/outside hot window
    const automationPostIds = new Set(
      (store.automations ?? [])
        .filter((a) => a.enabled && a.trigger.type === "comment_post")
        .flatMap((a) => {
          const triggerNode = a.nodes.find((n) => n.type === "trigger");
          return a.trigger.postIds?.length
            ? a.trigger.postIds
            : (triggerNode?.data.postIds ?? []);
        })
    );
    const baseScanIds = new Set(baseScan.map((m) => m.id));
    const scan = [...baseScan, ...allMedia.filter((m) => automationPostIds.has(m.id) && !baseScanIds.has(m.id))];
    for (const m of scan) {
      let res: { data?: Raw[] };
      try {
        res = (await getMediaComments(m.id, token)) as { data?: Raw[] };
      } catch {
        continue;
      }
      const flat: Raw[] = [];
      for (const c of res.data ?? []) {
        flat.push(c);
        for (const r of c.replies?.data ?? []) flat.push(r);
      }

      for (const c of flat) {
        if (!c.from) continue;
        const ts = new Date(c.timestamp).getTime();
        if (ts > newest) newest = ts;

        // backfill cache regardless of seen state — also re-cache webhook
        // stubs (cached with no post caption) so they get enriched
        const cachedC = cachedById.get(c.id);
        if (!cachedC || !cachedC.postCaption) {
          const cb: CachedComment = {
            id: c.id,
            postId: m.id,
            postCaption: m.caption || "",
            postThumb: m.thumbnail_url || m.media_url,
            postPermalink: m.permalink,
            text: c.text,
            fromUserId: c.from.id,
            fromUsername: c.from.username || "",
            timestamp: c.timestamp,
            ts,
            isOwn: isOwnComment(c.from, c.text),
          };
          newCached.push(cb);
        }

        // read-only check — do NOT mark seen yet. Marking only happens once
        // a comment is actually committed to (processed) or deliberately
        // abandoned (own / old backlog). Marking before the skip gates would
        // bury a recent un-processed comment as "seen" forever.
        if (hasSeen(c.id)) continue;

        if (isOwnComment(c.from, c.text)) {
          markSeen(c.id);
          publish({
            type: "comment",
            commentId: c.id,
            mediaId: m.id,
            fromUserId: c.from.id,
            fromUsername: c.from.username,
            text: c.text,
            ts,
          });
          continue;
        }
        // the watermark blocks the pre-existing backlog. But a comment we
        // have genuinely never seen and that is recent still deserves a
        // conclusion, even if newer comments pushed the watermark past it.
        if (ts <= watermark && Date.now() - ts > CATCHUP_WINDOW_MS) {
          markSeen(c.id); // old backlog — mark so it is not re-scanned forever
          continue;
        }
        // committing to process it now — safe to mark seen
        markSeen(c.id);
        newCount++;
        publish({
          type: "comment",
          commentId: c.id,
          mediaId: m.id,
          fromUserId: c.from.id,
          fromUsername: c.from.username,
          text: c.text,
          ts,
        });

        const evt: AutomationEvent = {
          type: "comment_post",
          commentId: c.id,
          fromUserId: c.from.id,
          fromUsername: c.from.username,
          text: c.text,
          postId: m.id,
        };
        const matched = matchAutomations(store, evt);
        if (matched.length > 0) {
          publish({ type: "log", level: "info", msg: `watcher: ${matched.length} automation(s) matched for comment ${c.id} on post ${m.id}`, ts: Date.now() });
          for (const auto of matched) {
            await executeAutomation(auto, evt).catch((e) =>
              publish({ type: "log", level: "error", msg: `watcher automation [${auto.id}]: ${String(e)}`, ts: Date.now() })
            );
          }
        } else {
          processInbound({
            kind: "comment",
            threadOrMediaId: c.id,
            fromUserId: c.from.id,
            fromUsername: c.from.username,
            text: c.text,
            postId: m.id,
          }).catch((e) =>
            publish({ type: "log", level: "error", msg: `pipeline: ${String(e)}`, ts: Date.now() })
          );
        }
      }
    }

    const patch: Partial<typeof store> = {};
    if (newest > watermark) patch.pollWatermark = newest;
    if (newCached.length > 0) {
      const existingMap = new Map(store.commentsCache.map((c) => [c.id, c]));
      for (const c of newCached) existingMap.set(c.id, c);
      const merged = Array.from(existingMap.values()).sort((a, b) => b.ts - a.ts).slice(0, MAX_CACHE);
      patch.commentsCache = merged;
    }
    if (Object.keys(patch).length > 0) await patchStore(patch);

    if (newCount > 0) {
      publish({ type: "log", level: "info", msg: `watcher: ${newCount} new`, ts: Date.now() });
    }

    // DM polling now runs in the 1s real-time loop (pollDMs) for instant resume.

    // periodically rebuild full follower cache so checkIsFollower works for old followers
    if (s.ticks % FOLLOWER_SYNC_EVERY === 1) {
      try {
        const freshStore = await readStore();
        if (freshStore.account) {
          const followers = await fetchAllFollowers(freshStore.account.igUserId, freshStore.account.accessToken);
          await updateStore((st) => ({
            ...st,
            followerCache: followers.map((f) => ({
              userId: f.id,
              username: f.username,
              followedAt: (st.followerCache ?? []).find((c) => c.userId === f.id)?.followedAt ?? Date.now(),
            })).slice(-10_000),
          }));
          publish({ type: "log", level: "info", msg: `watcher: follower cache synced (${followers.length})`, ts: Date.now() });
        }
      } catch (e) {
        publish({ type: "log", level: "warn", msg: `watcher: follower sync failed: ${String(e)}`, ts: Date.now() });
      }
    }

    // keep the long-lived IG token alive — refresh well before its 60-day expiry
    if (s.ticks % TOKEN_REFRESH_CHECK_EVERY === 1) {
      try {
        const fresh = await readStore();
        const acct = fresh.account;
        if (acct?.accessToken && acct.tokenExpiresAt) {
          const msLeft = acct.tokenExpiresAt - Date.now();
          const ageMs = Date.now() - (acct.connectedAt ?? 0);
          // Instagram only refreshes tokens >24h old and not yet expired
          if (msLeft < TOKEN_REFRESH_THRESHOLD_MS && msLeft > 0 && ageMs > 24 * 3600_000) {
            const refreshed = await refreshLongLivedToken(acct.accessToken);
            await patchStore({
              account: {
                ...acct,
                accessToken: refreshed.access_token,
                tokenExpiresAt: Date.now() + refreshed.expires_in * 1000,
              },
              lastToken: refreshed.access_token,
            });
            publish({ type: "log", level: "info", msg: `watcher: IG token refreshed (+${Math.round(refreshed.expires_in / 86400)}d)`, ts: Date.now() });
          }
        }
      } catch (e) {
        publish({ type: "log", level: "warn", msg: `watcher: token refresh failed: ${String(e)}`, ts: Date.now() });
      }
    }

    // drain scheduled sendQueue (follow-up messages)
    await drainSendQueue();

    // retry automations parked by a rate-limit (613) once their backoff clears
    await drainAutomationRetries();

    return { newCount, skipped: false };
  } catch (e) {
    publish({ type: "log", level: "error", msg: `watcher tick: ${String(e)}`, ts: Date.now() });
    return { newCount: 0, skipped: false, error: String(e) };
  } finally {
    s.inFlight = false;
  }
}

// auto-start on module load if token exists (lazy).
// MIRA_WATCHER_DISABLED=1 hard-stops this — used to boot the UI safely without
// the live IG loops (which send real DMs via automations, ungated by replyMode).
void (async () => {
  if (process.env.MIRA_WATCHER_DISABLED === "1") {
    console.log("[watcher] disabled via MIRA_WATCHER_DISABLED — no live IG loops");
    return;
  }
  try {
    const st = await readStore();
    if (st.account) ensureWatcher();
  } catch {}
})();
