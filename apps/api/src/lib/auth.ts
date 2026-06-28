// Elysia-side auth: validate the BetterAuth session from the request headers
// (the Next rewrite forwards the session cookie / Authorization bearer), then
// resolve the user's own Instagram account. Single source of truth = the shared
// BetterAuth instance (@shaiz/auth) — no duplicated token logic.
import { getSessionUserId } from "@shaiz/auth";
import { query } from "@shaiz/db";

/** The IG account owned by this user (most-recent). Null if they have none yet. */
export async function accountIdForUser(userId: string): Promise<string | null> {
  const rows = await query<{ ig_user_id: string }>(
    "SELECT ig_user_id FROM accounts WHERE user_id=$1 ORDER BY connected_at DESC LIMIT 1",
    [userId]
  );
  return rows[0]?.ig_user_id ?? null;
}

/** Verify a user owns a given account id (per-resource ownership checks). */
export async function userOwnsAccount(userId: string, accountId: string): Promise<boolean> {
  const rows = await query<{ n: number }>(
    "SELECT 1 as n FROM accounts WHERE ig_user_id=$1 AND user_id=$2",
    [accountId, userId]
  );
  return rows.length > 0;
}

export type AuthCtx = { userId: string; accountId: string | null };

/** Guard: resolve {userId, accountId} from request headers, or a 401. */
export async function requireUser(headers: Headers): Promise<{ ctx?: AuthCtx; status?: number; error?: string }> {
  const userId = await getSessionUserId(headers);
  if (!userId) return { status: 401, error: "unauthorized" };
  const accountId = await accountIdForUser(userId);
  return { ctx: { userId, accountId } };
}

export { getSessionUserId };
