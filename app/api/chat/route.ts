import { NextRequest } from "next/server";
import { readStore } from "@/lib/ig/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatBody = {
  model: string;
  host: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
};

async function buildAccountContext(): Promise<string> {
  const s = await readStore();
  if (!s.account) return "";
  const posts = Object.values(s.posts).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  const recent = posts.slice(0, 8);
  const totalComments = s.commentsCache.length;
  const last24h = s.commentsCache.filter((c) => Date.now() - c.ts < 86400_000).length;
  const open = s.clarifications.filter((c) => c.status === "open").length;
  const pending = s.pendingDrafts.length;
  const replied = s.history.filter((h) => h.status === "sent").length;

  const themesMap: Record<string, number> = {};
  for (const c of s.commentsCache.slice(0, 200)) {
    if (c.isOwn) continue;
    const t = (c.text || "").toLowerCase();
    if (/where|location|kahan/.test(t)) themesMap.location = (themesMap.location || 0) + 1;
    else if (/song|music|gana/.test(t)) themesMap.song = (themesMap.song || 0) + 1;
    else if (/bike|gear|lens|camera/.test(t)) themesMap.gear = (themesMap.gear || 0) + 1;
    else if (/price|buy|shop/.test(t)) themesMap.shop = (themesMap.shop || 0) + 1;
  }

  const lines: string[] = [
    `Connected IG: @${s.account.username} (id ${s.account.igUserId}).`,
    `Total posts synced: ${posts.length}. Comments cached: ${totalComments}. Last 24h comments: ${last24h}.`,
    `Pending drafts: ${pending}. Open clarifications: ${open}. Replies sent: ${replied}.`,
    `Settings: mode=${s.settings.replyMode}, autoAcks=${s.settings.autoReplySimpleAcks}, autoDM=${s.settings.autoDMLinks}, cooldown=${s.settings.cooldownMinutes}m.`,
  ];
  if (Object.keys(themesMap).length) {
    lines.push(
      "Frequent comment themes: " +
        Object.entries(themesMap)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => `${k}(${v})`)
          .join(", ")
    );
  }
  if (recent.length) {
    lines.push("Recent posts:");
    for (const p of recent) {
      const cap = (p.caption || "").replace(/\s+/g, " ").slice(0, 70);
      const has = [
        p.notes ? "notes" : null,
        p.qa.length ? `${p.qa.length}qa` : null,
        p.links?.length ? `${p.links.length}link` : null,
      ]
        .filter(Boolean)
        .join("/");
      lines.push(`- ${p.timestamp.slice(0, 10)} "${cap}" [${has || "no context"}]`);
    }
  }
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const { model, host, messages } = (await req.json()) as ChatBody;
  const acctCtx = await buildAccountContext();

  const sysIdx = messages.findIndex((m) => m.role === "system");
  const baseSys = sysIdx >= 0 ? messages[sysIdx].content : "";
  const newSys = [
    baseSys,
    "",
    "You are Mira — the user's personal AI twin for their Instagram account.",
    "Always reason from THIS account's data shown below. If asked something not in data, say you need to fetch it.",
    "Default language: English. Casual, short, real. No corporate tone, no 'as an AI', no em-dashes, no filler.",
    "Switch to Hinglish/Roman Hindi only if the user writes in it.",
    "If user asks about specific post / comment / commenter, reference the data directly.",
    "",
    "=== ACCOUNT SNAPSHOT ===",
    acctCtx,
    "=== END SNAPSHOT ===",
  ].join("\n");

  const finalMessages = [{ role: "system" as const, content: newSys }, ...messages.filter((m) => m.role !== "system")];

  const upstream = await fetch(`${host.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: finalMessages,
      stream: true,
      options: { temperature: 0.7, top_p: 0.9 },
    }),
  }).catch((e: Error) => {
    return new Response(
      `Ollama unreachable at ${host}. (${e.message})`,
      { status: 502 }
    );
  });

  if (!(upstream instanceof Response)) return new Response("Bad upstream", { status: 502 });
  if (!upstream.ok || !upstream.body) {
    const txt = await upstream.text().catch(() => "");
    return new Response(txt || `Upstream error ${upstream.status}`, { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
