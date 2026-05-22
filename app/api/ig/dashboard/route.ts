import { NextResponse } from "next/server";
import { readStore } from "@/lib/ig/store";
import { isConfigured } from "@/lib/ig/config";

export const runtime = "nodejs";

const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

export async function GET() {
  const s = await readStore();
  const now = Date.now();
  const todayKey = dayKey(now);

  // 14-day timeline — comments seen vs replies sent
  const days: { date: string; comments: number; replies: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const key = dayKey(now - i * 86400_000);
    days.push({
      date: key,
      comments: s.commentsCache.filter((c) => !c.isOwn && dayKey(c.ts) === key).length,
      replies: s.history.filter(
        (h) => h.status === "sent" && dayKey(h.sentAt) === key
      ).length,
    });
  }

  // intent breakdown from reply history
  const intents: Record<string, number> = {};
  for (const h of s.history) intents[h.intent] = (intents[h.intent] || 0) + 1;

  // busiest hours
  const hourly = new Array(24).fill(0) as number[];
  for (const c of s.commentsCache) if (!c.isOwn) hourly[new Date(c.ts).getHours()]++;

  // recurring comment themes
  const themes: Record<string, number> = {};
  for (const c of s.commentsCache) {
    if (c.isOwn) continue;
    const t = (c.text || "").toLowerCase();
    if (/where|location|kahan/.test(t)) themes.location = (themes.location || 0) + 1;
    else if (/song|music|gana/.test(t)) themes.song = (themes.song || 0) + 1;
    else if (/jacket|bike|gear|lens|camera|bag|shoes/.test(t))
      themes.gear = (themes.gear || 0) + 1;
    else if (/link|price|buy|shop|cost/.test(t)) themes.shop = (themes.shop || 0) + 1;
  }

  // knowledge
  const facts = s.knowledge;
  const reused = facts.reduce((n, f) => n + f.hitCount, 0);
  const topFact = [...facts].sort((a, b) => b.hitCount - a.hitCount)[0];
  const clarsResolved = s.clarifications.filter((c) => c.status === "answered").length;
  const clarsOpen = s.clarifications.filter((c) => c.status === "open").length;

  // reply coverage
  const inbound = s.commentsCache.filter((c) => !c.isOwn).length;
  const replied = s.history.filter(
    (h) => h.status === "sent" && h.kind === "comment"
  ).length;
  const coverage = inbound ? Math.min(100, Math.round((replied / inbound) * 100)) : 0;

  // people
  const superfans = Object.values(s.commenters)
    .sort((a, b) => b.commentCount - a.commentCount)
    .slice(0, 6)
    .map((c) => ({
      username: c.username,
      igUserId: c.igUserId,
      commentCount: c.commentCount,
      repliedCount: c.repliedCount,
    }));
  const topPosts = Object.values(s.posts)
    .map((p) => ({
      id: p.id,
      caption: p.caption,
      thumb: p.thumbnailUrl,
      permalink: p.permalink,
      comments: s.commentsCache.filter((c) => c.postId === p.id && !c.isOwn).length,
      interactions:
        p.insights?.totalInteractions ?? p.insights?.likes ?? 0,
    }))
    .sort((a, b) => b.interactions - a.interactions || b.comments - a.comments)
    .slice(0, 5);

  return NextResponse.json({
    configured: isConfigured(),
    connected: !!s.account,
    account: s.account
      ? { username: s.account.username, connectedAt: s.account.connectedAt }
      : null,
    replyMode: s.settings.replyMode,
    today: s.dailyStats[todayKey] ?? null,
    pending: s.pendingDrafts.length,
    clarsOpen,
    clarsResolved,
    coverage,
    totalComments: inbound,
    totalReplies: replied,
    days,
    intents,
    hourly,
    themes,
    knowledge: {
      total: facts.length,
      reused,
      top: topFact ? { q: topFact.question, hits: topFact.hitCount } : null,
    },
    antiBan: {
      sentToday: s.dailyStats[todayKey]?.sent ?? 0,
      cap: s.settings.dailySendCap,
      uniquenessThreshold: s.settings.uniquenessThreshold,
    },
    superfans,
    topPosts,
  });
}
