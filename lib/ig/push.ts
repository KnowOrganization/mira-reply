// Expo push dispatch. Looks up a user's device tokens and posts to Expo's push
// service. Fire-and-forget from event sites (new comment, draft ready, etc.).
import { getUserDeviceTokens } from "@shaiz/db";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendPush(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, unknown> }
): Promise<void> {
  const tokens = await getUserDeviceTokens(userId);
  if (!tokens.length) return;
  const messages = tokens.map((to) => ({ to, sound: "default", ...payload }));
  try {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify(messages),
    });
  } catch {
    // ponytail: best-effort — a dropped push must never break the event path.
  }
}
