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
  const short = (await shortRes.json()) as { access_token: string; user_id: number | string; permissions?: string };
  if (!short.access_token) {
    return NextResponse.redirect(
      `${returnOrigin}/oauth/complete?ig=error&reason=${encodeURIComponent("short token missing — check Meta app permissions")}`
    );
  }

  // 2. Exchange short → long-lived (60 days)
  const longUrl = new URL("https://graph.instagram.com/access_token");
  longUrl.searchParams.set("grant_type", "ig_exchange_token");
  longUrl.searchParams.set("client_secret", ig.appSecret);
  longUrl.searchParams.set("access_token", short.access_token);
  const longRes = await fetch(longUrl);
  const longJson = (await longRes.json()) as {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    error?: { message?: string };
  };
  // long-lived exchange can fail for dev-mode apps — fall back to short-lived token
  const finalToken = longJson.access_token || short.access_token;
  const expiresIn = longJson.expires_in ?? 60 * 24 * 3600;

  // 3. Fetch profile — try multiple approaches
  const meAttempts: { url: string; init?: RequestInit }[] = [
    // Bearer header, versioned
    { url: "https://graph.instagram.com/v23.0/me?fields=id,username", init: { headers: { Authorization: `Bearer ${finalToken}` } } },
    // Bearer header, no version
    { url: "https://graph.instagram.com/me?fields=id,username", init: { headers: { Authorization: `Bearer ${finalToken}` } } },
    // query param, versioned
    { url: `https://graph.instagram.com/v23.0/me?fields=id,username&access_token=${encodeURIComponent(finalToken)}` },
    // query param, no version
    { url: `https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(finalToken)}` },
  ];
  let me: { id?: string; username?: string; error?: { message?: string } } = {};
  const meErrors: string[] = [];
  for (const a of meAttempts) {
    const meRes = await fetch(a.url, a.init);
    me = (await meRes.json()) as typeof me;
    if (me.id) break;
    meErrors.push(me.error?.message || `http ${meRes.status}`);
  }
  if (!me.id) {
    // log full diagnostics
    const diag = `longErr=${longJson.error?.message || "none"} meErrors=${meErrors.join("|")}`;
    console.error("[callback] profile fetch failed:", diag);
    return NextResponse.redirect(
      `${returnOrigin}/oauth/complete?ig=error&reason=${encodeURIComponent(meErrors[0] || "profile fetch failed")}+[${encodeURIComponent(diag)}]`
    );
  }

  const { readStore } = await import("@/lib/ig/store");
  const existing = await readStore();
  const accountChanged = existing.account && existing.account.igUserId !== me.id;

  await patchStore({
    account: {
      igUserId: me.id,
      username: me.username || "",
      accessToken: finalToken,
      tokenExpiresAt: Date.now() + expiresIn * 1000,
      connectedAt: Date.now(),
    },
    lastToken: finalToken,
    // clear old account data when switching accounts
    ...(accountChanged ? {
      posts: {},
      commentsCache: [],
      history: [],
      pendingDrafts: [],
      clarifications: [],
      fingerprints: [],
      knowledge: [],
      commenters: {},
      dmLog: [],
      sendQueue: [],
      dailyStats: {},
      linkPending: [],
      feedEvents: [],
    } : {}),
  });

  ensureWatcher();
  return NextResponse.redirect(`${returnOrigin}/oauth/complete?ig=connected`);
}
