import { readStore, updateStore } from "./store";
import { sendDM, sendDMWithButtons, sendDMImage, sendCommentPrivateReply, sendCommentPrivateReplyWithButtons, sendDMWithButtonTemplate, sendCommentPrivateReplyWithButtonTemplate, isRateLimitError } from "./graph";
import type { ButtonTemplateButton } from "./graph";

const ONE_DAY = 24 * 60 * 60 * 1000;

/** Result of a send attempt. `rateLimited` distinguishes an Instagram throttle
 *  (613/429) from a normal failure, so callers can park-and-retry instead of dropping. */
export type SendResult = { ok: boolean; reason?: string; rateLimited?: boolean };

/** Automation funnel sends pass { skipRateGate: true } — the user is already
 *  engaged (commented / tapped a button), so the cold-DM 1-per-24h gate must
 *  not block follow-up steps. Cold pipeline DMs omit it and keep the gate. */
export type SendOpts = { skipRateGate?: boolean };

export async function canDM(
  recipientId: string
): Promise<{ ok: boolean; reason?: string }> {
  const s = await readStore();
  if (!s.account) return { ok: false, reason: "not connected" };
  // generic DMs: 1 per recipient per 24h (anti-spam)
  const recent = s.dmLog.find(
    (d) => d.recipientId === recipientId && Date.now() - d.ts < ONE_DAY
  );
  if (recent) return { ok: false, reason: "rate limited" };
  return { ok: true };
}

/** Record a delivered DM — atomic, never clobbers a concurrent write. */
async function logDM(recipientId: string) {
  await updateStore((s) => ({
    ...s,
    dmLog: [...s.dmLog, { recipientId, ts: Date.now() }].slice(-2000),
  }));
}

export async function tryDM(
  recipientId: string,
  text: string,
  opts?: SendOpts
): Promise<SendResult> {
  if (!text?.trim()) return { ok: false, reason: "empty message" };
  const s = await readStore();
  if (!s.account) return { ok: false, reason: "not connected" };
  if (!opts?.skipRateGate) {
    const gate = await canDM(recipientId);
    if (!gate.ok) return gate;
  }
  try {
    await sendDM(s.account.igUserId, recipientId, text, s.account.accessToken);
    await logDM(recipientId);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "dm failed", rateLimited: isRateLimitError(e) };
  }
}

export async function tryDMWithButtons(
  recipientId: string,
  text: string,
  buttons: { label: string; payload?: string }[],
  opts?: SendOpts
): Promise<SendResult> {
  if (!text?.trim()) return { ok: false, reason: "empty message" };
  if (!buttons.length) return tryDM(recipientId, text, opts);
  const s = await readStore();
  if (!s.account) return { ok: false, reason: "not connected" };
  if (!opts?.skipRateGate) {
    const gate = await canDM(recipientId);
    if (!gate.ok) return gate;
  }
  try {
    await sendDMWithButtons(s.account.igUserId, recipientId, text, buttons, s.account.accessToken);
    await logDM(recipientId);
    return { ok: true };
  } catch (e) {
    // fallback: plain DM without buttons if quick_replies not supported
    try {
      await sendDM(s.account.igUserId, recipientId, text, s.account.accessToken);
      await logDM(recipientId);
      return { ok: true };
    } catch (e2) {
      return { ok: false, reason: e2 instanceof Error ? e2.message : "dm with buttons failed", rateLimited: isRateLimitError(e2) || isRateLimitError(e) };
    }
  }
}

export async function tryDMImage(
  recipientId: string,
  imageUrl: string,
  opts?: SendOpts
): Promise<SendResult> {
  if (!imageUrl?.trim()) return { ok: false, reason: "empty image URL" };
  const s = await readStore();
  if (!s.account) return { ok: false, reason: "not connected" };
  if (!opts?.skipRateGate) {
    const gate = await canDM(recipientId);
    if (!gate.ok) return gate;
  }
  try {
    await sendDMImage(s.account.igUserId, recipientId, imageUrl, s.account.accessToken);
    await logDM(recipientId);
    return { ok: true };
  } catch (e) {
    // fallback: send URL as plain text
    try {
      await sendDM(s.account.igUserId, recipientId, imageUrl, s.account.accessToken);
      await logDM(recipientId);
      return { ok: true };
    } catch (e2) {
      return { ok: false, reason: e2 instanceof Error ? e2.message : "image dm failed", rateLimited: isRateLimitError(e2) || isRateLimitError(e) };
    }
  }
}

/**
 * Send a private reply straight off a comment — the correct mechanism for
 * delivering links. Instagram allows exactly one private reply per comment
 * and enforces its own 7-day window, so no extra rate-gate is applied here.
 */
export async function tryPrivateReply(
  commentId: string,
  recipientId: string,
  text: string
): Promise<SendResult> {
  if (!text?.trim()) return { ok: false, reason: "empty message" };
  const s = await readStore();
  if (!s.account) return { ok: false, reason: "not connected" };
  try {
    await sendCommentPrivateReply(
      s.account.igUserId,
      commentId,
      text,
      s.account.accessToken
    );
    // Private reply is comment-triggered — must NOT consume the 1-per-24h DM quota.
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "private reply failed",
      rateLimited: isRateLimitError(e),
    };
  }
}

/**
 * Send a DM using Meta's button template (web_url + postback buttons).
 * Falls back to quick_reply tryDMWithButtons if template API rejects.
 */
export async function tryDMWithButtonTemplate(
  recipientId: string,
  text: string,
  buttons: ButtonTemplateButton[],
  opts?: SendOpts
): Promise<SendResult> {
  if (!text?.trim()) return { ok: false, reason: "empty message" };
  const s = await readStore();
  if (!s.account) return { ok: false, reason: "not connected" };
  if (!opts?.skipRateGate) {
    const gate = await canDM(recipientId);
    if (!gate.ok) return gate;
  }
  try {
    await sendDMWithButtonTemplate(s.account.igUserId, recipientId, text, buttons, s.account.accessToken);
    await logDM(recipientId);
    return { ok: true };
  } catch (e) {
    // a real rate-limit must not silently degrade — surface it so callers can park/retry
    if (isRateLimitError(e)) {
      return { ok: false, reason: e instanceof Error ? e.message : "rate limited", rateLimited: true };
    }
    // fallback: quick_replies (postback detection degrades to DM poll)
    const quickButtons = buttons
      .filter((b) => b.type === "postback")
      .map((b) => ({ label: b.title, payload: b.type === "postback" ? b.payload : b.title }));
    return tryDMWithButtons(recipientId, text, quickButtons.length ? quickButtons : [{ label: "Done", payload: "done" }], opts);
  }
}

/**
 * Send a private reply with quick_reply buttons. Uses comment_id recipient
 * so Instagram shows the "about your comment" context footer + renders buttons.
 * No canDM/logDM — private replies are comment-triggered, not generic DMs.
 * Falls back to tryDMWithButtons (userId recipient) if the API rejects it.
 */
export async function tryPrivateReplyWithButtons(
  commentId: string,
  recipientId: string,
  text: string,
  buttons: { label: string; payload?: string }[],
  opts?: SendOpts
): Promise<SendResult> {
  if (!text?.trim()) return { ok: false, reason: "empty message" };
  if (!buttons.length) return tryPrivateReply(commentId, recipientId, text);
  const s = await readStore();
  if (!s.account) return { ok: false, reason: "not connected" };
  // Try button template first — renders text + button inside the same bubble
  try {
    const templateBtns: ButtonTemplateButton[] = buttons.map((b) => ({
      type: "postback" as const,
      title: b.label,
      payload: b.payload || b.label,
    }));
    await sendCommentPrivateReplyWithButtonTemplate(
      s.account.igUserId,
      commentId,
      text,
      templateBtns,
      s.account.accessToken
    );
    return { ok: true };
  } catch {
    // fallback: quick_replies (floating chips — still functional)
    try {
      await sendCommentPrivateReplyWithButtons(
        s.account.igUserId,
        commentId,
        text,
        buttons,
        s.account.accessToken
      );
      return { ok: true };
    } catch {
      return tryDMWithButtons(recipientId, text, buttons, opts);
    }
  }
}
