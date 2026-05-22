import { readStore, patchStore, type CachedComment } from "./store";
import { getRecentMedia, getMediaComments } from "./graph";
import { processInbound } from "./pipeline";
import { publish } from "./bus";
import { seenComment, primeSeen, seenSize } from "./seen";

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

// poll fast — recent media every tick, the full catalogue every 6th tick.
// Most new comments land on recent posts, so this keeps detection near
// real-time without hammering the Instagram API.
const FAST_INTERVAL = 7_000;
const HOT_MEDIA = 10;
const FULL_SWEEP_EVERY = 6;

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

    // restore the shared seen set from persisted cache on first run
    if (seenSize() === 0 && store.commentsCache.length > 0) {
      primeSeen(store.commentsCache.map((c) => c.id));
    }
    const cachedById = new Map(store.commentsCache.map((c) => [c.id, c]));

    const newCached: CachedComment[] = [];
    let newCount = 0;

    const media = (await getRecentMedia(token, 25)) as {
      data?: Array<{
        id: string;
        caption?: string;
        permalink?: string;
        thumbnail_url?: string;
        media_url?: string;
      }>;
    };
    // every tick scans the hottest recent media; a full sweep runs
    // periodically so comments on older posts are never missed.
    const full = s.ticks % FULL_SWEEP_EVERY === 0;
    s.ticks++;
    const allMedia = media.data ?? [];
    const scan = full ? allMedia : allMedia.slice(0, HOT_MEDIA);
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

        if (seenComment(c.id)) continue;

        if (isOwnComment(c.from, c.text)) {
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
        if (ts <= watermark) continue;
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
    return { newCount, skipped: false };
  } catch (e) {
    publish({ type: "log", level: "error", msg: `watcher tick: ${String(e)}`, ts: Date.now() });
    return { newCount: 0, skipped: false, error: String(e) };
  } finally {
    s.inFlight = false;
  }
}

// auto-start on module load if token exists (lazy)
void (async () => {
  try {
    const st = await readStore();
    if (st.account) ensureWatcher();
  } catch {}
})();
