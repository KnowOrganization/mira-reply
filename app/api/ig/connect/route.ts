import { NextRequest, NextResponse } from "next/server";
import { ig, redirectUri, isConfigured } from "@/lib/ig/config";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Meta app not configured. Set META_APP_ID and META_APP_SECRET in .env.local" },
      { status: 400 }
    );
  }
  const referer = req.headers.get("referer") || "";
  const origin = (() => {
    try {
      return new URL(referer).origin;
    } catch {
      return "";
    }
  })();
  const state = origin ? Buffer.from(origin).toString("base64url") : "";

  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", ig.appId);
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", ig.scopes.join(","));
  if (state) url.searchParams.set("state", state);
  return NextResponse.redirect(url.toString());
}
