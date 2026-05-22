import { NextResponse } from "next/server";
import { readStore } from "@/lib/ig/store";
import { isConfigured } from "@/lib/ig/config";

export const runtime = "nodejs";

export async function GET() {
  const s = await readStore();
  return NextResponse.json({
    configured: isConfigured(),
    connected: !!s.account,
    account: s.account
      ? {
          username: s.account.username,
          igUserId: s.account.igUserId,
          tokenExpiresAt: s.account.tokenExpiresAt,
          connectedAt: s.account.connectedAt,
        }
      : null,
    replyMode: s.settings.replyMode,
    settings: s.settings,
    pendingCount: s.pendingDrafts.length,
    historyCount: s.history.length,
    canReconnect: !!s.lastToken,
  });
}
