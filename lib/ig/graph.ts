const BASE = "https://graph.instagram.com/v23.0";

type Json = Record<string, unknown>;

async function call(path: string, token: string, init?: RequestInit) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const u = new URL(url);
  if (!u.searchParams.has("access_token")) u.searchParams.set("access_token", token);
  const res = await fetch(u.toString(), {
    ...init,
    // hard timeout — a hung Instagram request must never freeze a tick
    signal: init?.signal ?? AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const text = await res.text();
  let body: Json | string = text;
  try {
    body = JSON.parse(text);
  } catch {}
  if (!res.ok) {
    throw new Error(
      typeof body === "string" ? body : `${res.status} ${JSON.stringify(body)}`
    );
  }
  return body as Json;
}

/**
 * True if an error thrown by `call()` (or any send) is an Instagram rate-limit /
 * throttle, vs. a normal validation/permission error. `call()` throws an Error
 * whose message embeds the HTTP status + the JSON body, so we match on both.
 * 613 = "calls to this api have exceeded the rate limit"; 4/17/32 = app/user
 * request-count limits; HTTP 429 = generic too-many-requests.
 */
export function isRateLimitError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  if (/\b429\b/.test(msg)) return true;
  // match "code":613 / "code": 613 and the related throttle codes
  return /"code"\s*:\s*(613|4|17|32)\b/.test(msg);
}

/**
 * Refresh a long-lived Instagram token, extending it another 60 days.
 * Instagram requires the token be >24h old and not yet expired — refresh
 * well before the 60-day expiry or the account silently stops working.
 * Endpoint is unversioned: https://graph.instagram.com/refresh_access_token
 */
export async function refreshLongLivedToken(
  token: string
): Promise<{ access_token: string; expires_in: number }> {
  const root = BASE.replace(/\/v[\d.]+$/, ""); // strip /v23.0 — refresh is unversioned
  const body = (await call(
    `${root}/refresh_access_token?grant_type=ig_refresh_token`,
    token
  )) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error(`token refresh failed: ${JSON.stringify(body)}`);
  return { access_token: body.access_token, expires_in: body.expires_in ?? 60 * 24 * 3600 };
}

export async function getRecentMedia(token: string, limit = 10) {
  return call(
    `/me/media?fields=id,caption,media_type,timestamp,permalink&limit=${limit}`,
    token
  );
}

const MEDIA_FIELDS =
  "id,caption,media_type,timestamp,permalink,thumbnail_url,media_url";

/**
 * Fetch the account's ENTIRE media catalogue, following Instagram's
 * pagination cursor. `/me/media` returns one page at a time — without
 * walking `paging.next` only the newest posts are ever seen.
 *
 * `maxPages` caps the walk so a huge account can't stall a watcher tick.
 */
export async function getAllMedia(
  token: string,
  maxPages = 20
): Promise<{ data: Json[] }> {
  const out: Json[] = [];
  let next: string | undefined =
    `${BASE}/me/media?fields=${MEDIA_FIELDS}&limit=50`;
  let pages = 0;
  while (next && pages < maxPages) {
    const page = (await call(next, token)) as {
      data?: Json[];
      paging?: { next?: string };
    };
    if (page.data?.length) out.push(...page.data);
    next = page.paging?.next;
    pages++;
  }
  return { data: out };
}

const COMMENT_FIELDS =
  "id,text,from,timestamp,replies{id,text,from,timestamp}";

/**
 * Fetch EVERY comment on a post, following the pagination cursor. Without
 * walking `paging.next` only the newest ~50 comments are returned — older
 * comments on a busy post would never be seen.
 *
 * `maxPages` caps the walk (10 × 50 = 500 comments) so one viral post can't
 * stall a watcher tick.
 */
export async function getMediaComments(
  mediaId: string,
  token: string,
  maxPages = 10
): Promise<{ data: Json[] }> {
  const out: Json[] = [];
  let next: string | undefined =
    `${BASE}/${mediaId}/comments?fields=${COMMENT_FIELDS}&limit=50`;
  let pages = 0;
  while (next && pages < maxPages) {
    const page = (await call(next, token)) as {
      data?: Json[];
      paging?: { next?: string };
    };
    if (page.data?.length) out.push(...page.data);
    next = page.paging?.next;
    pages++;
  }
  return { data: out };
}

export async function replyToComment(commentId: string, message: string, token: string) {
  return call(`/${commentId}/replies`, token, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function getCommentInfo(commentId: string, token: string) {
  return call(`/${commentId}?fields=id,text,username,timestamp,from`, token);
}

/**
 * Photo tags — every media on which this IG account has been tagged by
 * another user. Available without webhook subscription.
 */
export async function getTaggedMedia(
  token: string,
  igUserId: string,
  maxPages = 5
): Promise<{ data: Json[] }> {
  const fields =
    "id,caption,media_type,permalink,thumbnail_url,media_url,timestamp,username,like_count,comments_count";
  const out: Json[] = [];
  let next: string | undefined =
    `${BASE}/${igUserId}/tags?fields=${fields}&limit=50`;
  let pages = 0;
  while (next && pages < maxPages) {
    const page = (await call(next, token)) as {
      data?: Json[];
      paging?: { next?: string };
    };
    if (page.data?.length) out.push(...page.data);
    next = page.paging?.next;
    pages++;
  }
  return { data: out };
}

/**
 * Caption-mention payload — IG only exposes the mentioned media through this
 * scoped endpoint, valid for a short window after the `mentions` webhook fires.
 */
export async function getMentionedMedia(
  igUserId: string,
  mediaId: string,
  token: string
) {
  const fields =
    "id,caption,media_type,permalink,thumbnail_url,media_url,timestamp,username";
  return call(
    `/${igUserId}?fields=mentioned_media.media_id(${mediaId}){${fields}}`,
    token
  );
}

/**
 * Comment-mention payload — same scoped endpoint, but resolves a single
 * comment by id (caller already knows the comment id from the webhook).
 */
export async function getMentionedComment(
  igUserId: string,
  commentId: string,
  token: string
) {
  const fields = "id,text,timestamp,username,media{id,permalink,caption}";
  return call(
    `/${igUserId}?fields=mentioned_comment.comment_id(${commentId}){${fields}}`,
    token
  );
}

/** Hide a comment from public view (spam / troll shield). */
export async function hideComment(commentId: string, token: string) {
  return call(`/${commentId}`, token, {
    method: "POST",
    body: JSON.stringify({ hide: true }),
  });
}

/**
 * POST to the /messages endpoint. Instagram requires the access_token in the
 * BODY here — passing it as a query param fails with OAuthException. (All
 * other endpoints accept the query token; /messages is the exception.)
 */
async function postMessage(
  igUserId: string,
  payload: Record<string, unknown>,
  token: string
) {
  const res = await fetch(`${BASE}/${igUserId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({ ...payload, access_token: token }),
  });
  const text = await res.text();
  let body: Json | string = text;
  try {
    body = JSON.parse(text);
  } catch {}
  if (!res.ok) {
    throw new Error(
      typeof body === "string" ? body : `${res.status} ${JSON.stringify(body)}`
    );
  }
  return body as Json;
}

/** Validate text before any send — throws if empty or too long. */
function validateMessageText(text: string): string {
  const t = text?.trim();
  if (!t) throw new Error("message text is empty");
  if (t.length > 1000) throw new Error(`message too long: ${t.length} chars (max 1000)`);
  return t;
}

export async function sendDM(
  igUserId: string,
  recipientId: string,
  text: string,
  token: string
) {
  const clean = validateMessageText(text);
  return postMessage(
    igUserId,
    { recipient: { id: recipientId }, message: { text: clean } },
    token
  );
}

/**
 * Send a private reply to a comment with quick_reply buttons.
 * Uses comment_id recipient so Instagram shows the "about your comment" context footer.
 */
export async function sendCommentPrivateReplyWithButtons(
  igUserId: string,
  commentId: string,
  text: string,
  buttons: { label: string; payload?: string }[],
  token: string
) {
  const clean = validateMessageText(text);
  const quickReplies = buttons.slice(0, 13).map((b) => ({
    content_type: "text",
    title: b.label.slice(0, 20),
    payload: b.payload || b.label, // Instagram requires non-empty payload
  }));
  return postMessage(
    igUserId,
    { recipient: { comment_id: commentId }, message: { text: clean, quick_replies: quickReplies } },
    token
  );
}

/**
 * Send DM with quick_reply buttons (Instagram Messaging API).
 * Max 13 buttons, each title max 20 chars.
 */
export async function sendDMWithButtons(
  igUserId: string,
  recipientId: string,
  text: string,
  buttons: { label: string; payload?: string }[],
  token: string
) {
  const clean = validateMessageText(text);
  const quickReplies = buttons.slice(0, 13).map((b) => ({
    content_type: "text",
    title: b.label.slice(0, 20),
    payload: b.payload || b.label, // Instagram requires non-empty payload
  }));
  return postMessage(
    igUserId,
    { recipient: { id: recipientId }, message: { text: clean, quick_replies: quickReplies } },
    token
  );
}

/**
 * Send DM with an image attachment.
 * Uses the media attachment payload — not supported in private replies.
 */
export async function sendDMImage(
  igUserId: string,
  recipientId: string,
  imageUrl: string,
  token: string
) {
  const url = imageUrl?.trim();
  if (!url) throw new Error("image URL is empty");
  return postMessage(
    igUserId,
    {
      recipient: { id: recipientId },
      message: { attachment: { type: "image", payload: { url, is_reusable: true } } },
    },
    token
  );
}

export type DMMessage = {
  id: string;
  text: string;
  fromUserId: string;
  fromUsername?: string;
  ts: number;
};

/**
 * Fetch the most recent DM messages across all conversations.
 * Used by the watcher to detect button clicks and follow confirms without
 * requiring a registered webhook.
 * Returns messages newer than sinceMs, max ~50 across recent conversations.
 */
export async function getRecentDMMessages(
  igUserId: string,
  token: string,
  sinceMs: number
): Promise<DMMessage[]> {
  const res = await call(
    `/${igUserId}/conversations?fields=messages{message,from,created_time}&limit=10`,
    token
  ) as { data?: Array<{ messages?: { data?: Array<{ id: string; message?: string; from?: { id: string; username?: string }; created_time: string }> } }> };

  const results: DMMessage[] = [];
  for (const conv of res.data ?? []) {
    for (const m of conv.messages?.data ?? []) {
      if (!m.message || !m.from) continue;
      if (m.from.id === igUserId) continue; // skip own messages
      const ts = new Date(m.created_time).getTime();
      if (ts <= sinceMs) continue;
      results.push({
        id: m.id,
        text: m.message,
        fromUserId: m.from.id,
        fromUsername: m.from.username,
        ts,
      });
    }
  }
  return results;
}

export type ButtonTemplateButton =
  | { type: "web_url"; title: string; url: string }
  | { type: "postback"; title: string; payload: string };

/**
 * Send a DM using Meta's button template — supports web_url + postback buttons.
 * Postback clicks fire a messaging_postbacks webhook event (instant, no DM created).
 * Max 3 buttons, title max 20 chars.
 */
export async function sendDMWithButtonTemplate(
  igUserId: string,
  recipientId: string,
  text: string,
  buttons: ButtonTemplateButton[],
  token: string
) {
  const clean = validateMessageText(text);
  return postMessage(
    igUserId,
    {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: clean,
            buttons: buttons.slice(0, 3).map((b) =>
              b.type === "web_url"
                ? { type: "web_url", url: b.url, title: b.title.slice(0, 20) }
                : { type: "postback", title: b.title.slice(0, 20), payload: b.payload }
            ),
          },
        },
      },
    },
    token
  );
}

/**
 * Send a private reply using Meta's button template — text + buttons in the same
 * bubble. Uses comment_id recipient so IG shows "about your comment" context.
 */
export async function sendCommentPrivateReplyWithButtonTemplate(
  igUserId: string,
  commentId: string,
  text: string,
  buttons: ButtonTemplateButton[],
  token: string
) {
  const clean = validateMessageText(text);
  return postMessage(
    igUserId,
    {
      recipient: { comment_id: commentId },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: clean,
            buttons: buttons.slice(0, 3).map((b) =>
              b.type === "web_url"
                ? { type: "web_url", url: b.url, title: b.title.slice(0, 20) }
                : { type: "postback", title: b.title.slice(0, 20), payload: b.payload }
            ),
          },
        },
      },
    },
    token
  );
}

/**
 * Fetch ALL followers for igUserId, paginating until exhausted or maxPages reached.
 * Used for the background full-sync in the watcher. Returns {id, username} pairs.
 */
export async function fetchAllFollowers(
  igUserId: string,
  token: string,
  maxPages = 200
): Promise<{ id: string; username?: string }[]> {
  const results: { id: string; username?: string }[] = [];
  let url: string | null = `${BASE}/${igUserId}/followers?fields=id,username&limit=100&access_token=${token}`;
  for (let page = 0; page < maxPages && url; page++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    const json = await res.json() as { data?: { id: string; username?: string }[]; paging?: { next?: string } };
    for (const f of json.data ?? []) results.push(f);
    url = json.paging?.next ?? null;
  }
  return results;
}

/**
 * Check whether `userId` is in the first page of recent followers.
 * Call this only after checking the local followerCache — this covers
 * people who followed in the last sync window but aren't cached yet.
 * Returns false on any API error.
 */
export async function checkIsRecentFollower(
  userId: string,
  igUserId: string,
  token: string
): Promise<boolean> {
  try {
    const url = `${BASE}/${igUserId}/followers?fields=id&limit=100&access_token=${token}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const json = await res.json() as { data?: { id: string }[] };
    return json.data?.some((f) => f.id === userId) ?? false;
  } catch {
    return false;
  }
}

/**
 * Send a private reply in direct response to a comment — works straight off a
 * comment without a prior conversation, valid for 7 days after the comment.
 * The correct mechanism for delivering links.
 */
export async function sendCommentPrivateReply(
  igUserId: string,
  commentId: string,
  text: string,
  token: string
) {
  const clean = validateMessageText(text);
  return postMessage(
    igUserId,
    { recipient: { comment_id: commentId }, message: { text: clean } },
    token
  );
}

// ── recovered for CRM (from 764af50): DM threads + user profile ──
export type DMThread = {
  threadId: string;
  updatedTime: number;
  contact: { igsid: string; username?: string };
  messages: { id: string; fromOwn: boolean; text: string; ts: number }[];
};

/**
 * Fetch the most-recent DM threads (conversation list) with their latest
 * messages + the other participant's handle. Used for the "import my last N
 * DMs" inbox sync on login. `ownIds` = every id that identifies THIS account in
 * the API (app-scoped id AND real IG id) — the conversations API tags the owner
 * by its real IG id, so own-message detection must check both.
 */

export async function getUserProfile(
  igsid: string,
  token: string
): Promise<{ name?: string; username?: string } | null> {
  try {
    const r = (await call(`/${igsid}?fields=name,username`, token)) as {
      name?: string; username?: string; error?: unknown;
    };
    if (r.error || (!r.name && !r.username)) return null;
    return { name: r.name, username: r.username };
  } catch {
    return null;
  }
}

export async function getDMThreads(
  igUserId: string,
  token: string,
  ownIds: string[],
  limit = 50
): Promise<DMThread[]> {
  const fields = "id,updated_time,participants,messages.limit(25){id,from,message,created_time}";
  const res = (await call(
    `/${igUserId}/conversations?platform=instagram&fields=${encodeURIComponent(fields)}&limit=${limit}`,
    token
  )) as {
    data?: Array<{
      id: string;
      updated_time?: string;
      participants?: { data?: Array<{ id: string; username?: string }> };
      messages?: { data?: Array<{ id: string; from?: { id: string; username?: string }; message?: string; created_time: string }> };
    }>;
  };
  const own = new Set(ownIds.filter(Boolean));
  const threads: DMThread[] = [];
  for (const conv of res.data ?? []) {
    const other = (conv.participants?.data ?? []).find((p) => !own.has(p.id));
    if (!other) continue;
    const messages = (conv.messages?.data ?? [])
      .filter((m) => (m.message ?? "").trim().length > 0) // text only (skip media/stickers)
      .map((m) => ({
        id: m.id,
        fromOwn: own.has(m.from?.id ?? "") || (m.from?.id !== other.id),
        text: m.message ?? "",
        ts: new Date(m.created_time).getTime(),
      }));
    threads.push({
      threadId: conv.id,
      updatedTime: conv.updated_time ? new Date(conv.updated_time).getTime() : Date.now(),
      contact: { igsid: other.id, username: other.username },
      messages,
    });
  }
  return threads;
}
