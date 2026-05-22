import { readStore, updateStore } from "./store";
import { sendDM, sendCommentPrivateReply } from "./graph";

const ONE_DAY = 24 * 60 * 60 * 1000;

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
  text: string
): Promise<{ ok: boolean; reason?: string }> {
  const s = await readStore();
  if (!s.account) return { ok: false, reason: "not connected" };
  const gate = await canDM(recipientId);
  if (!gate.ok) return gate;
  try {
    await sendDM(s.account.igUserId, recipientId, text, s.account.accessToken);
    await logDM(recipientId);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "dm failed" };
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
): Promise<{ ok: boolean; reason?: string }> {
  const s = await readStore();
  if (!s.account) return { ok: false, reason: "not connected" };
  try {
    await sendCommentPrivateReply(
      s.account.igUserId,
      commentId,
      text,
      s.account.accessToken
    );
    await logDM(recipientId);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "private reply failed",
    };
  }
}
