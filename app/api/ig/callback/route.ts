import { NextRequest, NextResponse } from "next/server";
import { ig, redirectUri } from "@/lib/ig/config";
import { patchStore } from "@/lib/ig/store";
import { ensureWatcher } from "@/lib/ig/watcher";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const state = req.nextUrl.searchParams.get("state") || "";
  const returnOrigin = (() => {
    try {
      const o = state ? Buffer.from(state, "base64url").toString("utf-8") : "";
      if (o && /^https?:\/\//.test(o)) return o;
    } catch {}
    return ig.baseUrl;
  })();
  if (error) return NextResponse.redirect(`${returnOrigin}/oauth/complete?ig=error&reason=${error}`);
  if (!code) return NextResponse.redirect(`${returnOrigin}/oauth/complete?ig=error&reason=missing_code`);

  // 1. Exchange code → short-lived token
  const form = new URLSearchParams({
    client_id: ig.appId,
    client_secret: ig.appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(),
    code,
  });

  const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!shortRes.ok) {
    const t = await shortRes.text();
    return NextResponse.redirect(
      `${returnOrigin}/oauth/complete?ig=error&reason=${encodeURIComponent(t.slice(0, 200))}`
    );
  }
  const short = (await shortRes.json()) as {
    access_token: string;
    user_id: number | string;
    permissions?: string;
  };

  // 2. Exchange short → long-lived (60 days)
  const longUrl = new URL("https://graph.instagram.com/access_token");
  longUrl.searchParams.set("grant_type", "ig_exchange_token");
  longUrl.searchParams.set("client_secret", ig.appSecret);
  longUrl.searchParams.set("access_token", short.access_token);
  const longRes = await fetch(longUrl);
  const longJson = (await longRes.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
  };

  // 3. Fetch profile
  const meRes = await fetch(
    `https://graph.instagram.com/v23.0/me?fields=id,username&access_token=${longJson.access_token}`
  );
  const me = (await meRes.json()) as { id: string; username: string };

  await patchStore({
    account: {
      igUserId: String(me.id),
      username: me.username,
      accessToken: longJson.access_token,
      tokenExpiresAt: Date.now() + (longJson.expires_in ?? 60 * 24 * 3600) * 1000,
      connectedAt: Date.now(),
    },
  });

  ensureWatcher();
  return NextResponse.redirect(`${returnOrigin}/oauth/complete?ig=connected`);
}
