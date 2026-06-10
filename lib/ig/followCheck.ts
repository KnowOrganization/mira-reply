const BASE = "https://graph.instagram.com/v23.0";

/**
 * Check if `igsid` follows the business account using Meta's server-side
 * `is_user_follow_business` field. O(1) — no pagination, scales to any
 * follower count. Returns false on any network/API error.
 */
export async function checkFollowStatus(
  igsid: string,
  token: string
): Promise<boolean> {
  try {
    const url = `${BASE}/${igsid}?fields=is_user_follow_business&access_token=${token}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    const json = await res.json() as { is_user_follow_business?: boolean; error?: unknown };
    if (!res.ok || json.error) return false;
    return json.is_user_follow_business === true;
  } catch {
    return false;
  }
}
