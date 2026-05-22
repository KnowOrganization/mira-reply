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

export async function getRecentMedia(token: string, limit = 10) {
  return call(
    `/me/media?fields=id,caption,media_type,timestamp,permalink&limit=${limit}`,
    token
  );
}

export async function getMediaComments(mediaId: string, token: string) {
  return call(
    `/${mediaId}/comments?fields=id,text,from,timestamp,replies{id,text,from,timestamp}`,
    token
  );
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

export async function sendDM(
  igUserId: string,
  recipientId: string,
  text: string,
  token: string
) {
  return postMessage(
    igUserId,
    { recipient: { id: recipientId }, message: { text } },
    token
  );
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
  return postMessage(
    igUserId,
    { recipient: { comment_id: commentId }, message: { text } },
    token
  );
}
