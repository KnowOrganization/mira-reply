import { NextRequest, NextResponse } from "next/server";
import { readStore, patchStore } from "@/lib/ig/store";
import { ensureWatcher } from "@/lib/ig/watcher";

export const runtime = "nodejs";

/**
 * Connect by access token directly — no OAuth redirect, no Meta dashboard.
 * Validates the token against the Graph API, then stores the account.
 * Called with no token → reuses the remembered token (one-click reconnect).
 */
export async function POST(req: NextRequest) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  let t = (token || "").trim();
  if (!t) {
    // no token supplied → fall back to the remembered one
    t = ((await readStore()).lastToken || "").trim();
  }
  if (!t) {
    return NextResponse.json(
      { error: "no token — paste an access token" },
      { status: 400 }
    );
  }

  // validate + fetch profile
  const meRes = await fetch(
    `https://graph.instagram.com/v23.0/me?fields=id,username&access_token=${encodeURIComponent(t)}`
  );
  const me = (await meRes.json()) as {
    id?: string;
    username?: string;
    error?: { message?: string };
  };
  if (me.error || !me.id) {
    return NextResponse.json(
      { error: me.error?.message || "invalid or blocked token" },
      { status: 400 }
    );
  }

  // best-effort: extend a short-lived token to 60 days (no-op if already long-lived)
  let accessToken = t;
  let expiresIn = 60 * 24 * 3600;
  try {
    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", process.env.META_APP_SECRET || "");
    longUrl.searchParams.set("access_token", t);
    const lj = (await (await fetch(longUrl)).json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (lj.access_token) {
      accessToken = lj.access_token;
      expiresIn = lj.expires_in ?? expiresIn;
    }
  } catch {
    /* token already long-lived — keep it */
  }

  await patchStore({
    account: {
      igUserId: String(me.id),
      username: me.username || "",
      accessToken,
      tokenExpiresAt: Date.now() + expiresIn * 1000,
      connectedAt: Date.now(),
    },
    lastToken: accessToken, // remember it — survives logout for reconnect
  });
  ensureWatcher();
  return NextResponse.json({ ok: true, username: me.username });
}
