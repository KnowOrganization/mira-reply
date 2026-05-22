import { NextResponse } from "next/server";
import { readStore } from "@/lib/ig/store";

export const runtime = "nodejs";

export async function GET() {
  const s = await readStore();
  const cutoff = Date.now() - 86400_000;
  const today = s.commentsCache.filter((c) => c.ts >= cutoff && !c.isOwn);
  const replied = s.history.filter((h) => h.sentAt >= cutoff && h.status === "sent");
  const pending = s.pendingDrafts.length;
  const open = s.clarifications.filter((c) => c.status === "open").length;

  const themes: Record<string, number> = {};
  for (const c of today) {
    const t = (c.text || "").toLowerCase();
    if (/where|location|kahan/.test(t)) themes.location = (themes.location || 0) + 1;
    else if (/song|music|gana/.test(t)) themes.song = (themes.song || 0) + 1;
    else if (/bike|gear|lens|camera/.test(t)) themes.gear = (themes.gear || 0) + 1;
    else if (/price|buy|shop/.test(t)) themes.shop = (themes.shop || 0) + 1;
  }
  const topTheme = Object.entries(themes).sort((a, b) => b[1] - a[1])[0];

  return NextResponse.json({
    inbox: today.length,
    repliedAuto: replied.length,
    pending,
    needsInput: open,
    topTheme: topTheme ? { name: topTheme[0], count: topTheme[1] } : null,
  });
}
