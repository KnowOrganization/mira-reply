// LLM-facing routes ported from the Next app:
//   POST /api/ig/agent              — Mira agent tool-loop (returns { reply, actions })
//   POST /api/chat                  — streaming Ollama chat proxy (passthrough body)
//   POST /api/playground            — dry-run the reply pipeline on fake data
//   GET/POST/DELETE /api/playground/train — training-example CRUD
//   POST /api/ig/automations/:id/test — dry-run a visual automation
//   POST /api/ig/inject             — inject a fake comment/dm through the full pipeline
//   POST /api/ig/reprocess          — re-run the pipeline on a cached comment
//
// All store access is per-account: readStore(accountId) / updateStoreFor(accountId, fn).
import { Elysia } from "elysia";
import { requireUser } from "../lib/auth";
import { runAgent, type AgentMsg } from "@/lib/ig/agent";
import { readStore, updateStoreFor } from "@/lib/ig/store";
import type { Post, AutomationTriggerType } from "@/lib/ig/store";
import { decide, processInbound, type DraftInput } from "@/lib/ig/pipeline";
import {
  executeAutomation, matchAutomations, type AutomationEvent,
} from "@/lib/ig/automation";
import { addTraining, listTraining, removeTraining } from "@/lib/ig/training";
import { publish } from "@/lib/ig/bus";
import {
  getPostConfigByPostId, isCommentProcessed, markCommentProcessed,
  upsertUserState, insertLog,
} from "@/lib/ig/db";

type ChatBody = {
  model: string;
  host: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
};

/** Same account-context summary the Next /api/chat route prepends as system prompt. */
async function buildAccountContext(accountId: string): Promise<string> {
  const s = await readStore(accountId);
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

export const llmRoute = new Elysia()
  // ── POST /api/ig/agent — Mira agent tool-loop ─────────────────────────────
  .post("/api/ig/agent", async ({ request, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }

    const { messages } = (body ?? {}) as { messages?: AgentMsg[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      set.status = 400;
      return { error: "messages required" };
    }
    try {
      const { reply, actions } = await runAgent(messages.slice(-12));
      return { reply, actions };
    } catch (e) {
      set.status = 500;
      return { error: e instanceof Error ? e.message : "agent failed" };
    }
  })

  // ── POST /api/chat — streaming Ollama proxy (passthrough body) ────────────
  .post("/api/chat", async ({ request, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }

    const { model, host, messages } = (body ?? {}) as ChatBody;
    const acctCtx = await buildAccountContext(a.ctx.accountId);

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

    const finalMessages = [
      { role: "system" as const, content: newSys },
      ...messages.filter((m) => m.role !== "system"),
    ];

    const upstream = await fetch(`${host.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: finalMessages,
        stream: true,
        options: { temperature: 0.7, top_p: 0.9 },
      }),
    }).catch((e: Error) => new Response(`Ollama unreachable at ${host}. (${e.message})`, { status: 502 }));

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
  })

  // ── POST /api/playground — dry-run the pipeline on fake data ──────────────
  .post("/api/playground", async ({ request, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }

    const b = (body ?? {}) as {
      comment?: string;
      caption?: string;
      notes?: string;
      qa?: { q: string; a: string }[];
    };
    const text = (b.comment || "").trim();
    if (!text) { set.status = 400; return { error: "comment is required" }; }

    const qa = (Array.isArray(b.qa) ? b.qa : [])
      .filter((x) => x && x.q?.trim() && x.a?.trim())
      .map((x) => ({ q: x.q.trim(), a: x.a.trim(), ts: Date.now() }));

    const post: Post = {
      id: "playground",
      caption: b.caption || "",
      mediaType: "IMAGE",
      timestamp: new Date().toISOString(),
      notes: b.notes || "",
      qa,
      links: [],
      updatedAt: Date.now(),
    };
    const input: DraftInput = {
      kind: "comment",
      threadOrMediaId: "playground_comment",
      fromUserId: "playground_user",
      fromUsername: "playground_tester",
      text,
      postId: "playground",
    };

    const startedAt = Date.now();
    try {
      const decision = await decide(input, post);
      return { decision, ms: Date.now() - startedAt };
    } catch (e) {
      set.status = 500;
      return { error: e instanceof Error ? e.message : "decide failed" };
    }
  })

  // ── /api/playground/train — training-example CRUD ─────────────────────────
  .get("/api/playground/train", async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    return { training: await listTraining() };
  })
  .post("/api/playground/train", async ({ request, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }

    const b = (body ?? {}) as Record<string, unknown>;
    const comment = typeof b.comment === "string" ? b.comment.trim() : "";
    const verdict = b.verdict === "good" ? "good" : "bad";
    if (!comment) { set.status = 400; return { error: "comment is required" }; }

    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
    const correctAction =
      b.correctAction === "reply" || b.correctAction === "ask_owner" || b.correctAction === "skip"
        ? b.correctAction
        : undefined;

    const entry = await addTraining({
      comment,
      caption: typeof b.caption === "string" ? b.caption : "",
      notes: typeof b.notes === "string" ? b.notes : "",
      miraAction: typeof b.miraAction === "string" ? b.miraAction : "",
      miraReply: typeof b.miraReply === "string" ? b.miraReply : "",
      intent: typeof b.intent === "string" ? b.intent : "",
      verdict,
      correctAction: verdict === "bad" ? correctAction : undefined,
      idealReply: verdict === "bad" ? str(b.idealReply) : undefined,
      askQuestion: verdict === "bad" ? str(b.askQuestion) : undefined,
      note: str(b.note),
    });
    return { entry };
  })
  .delete("/api/playground/train", async ({ request, query, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }

    const id = (query as { id?: string }).id;
    if (!id) { set.status = 400; return { error: "id is required" }; }
    await removeTraining(id);
    return { ok: true };
  })

  // ── POST /api/ig/automations/:id/test — dry-run a visual automation ───────
  .post("/api/ig/automations/:id/test", async ({ request, params, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }

    const store = await readStore(a.ctx.accountId);
    const automation = (store.automations ?? []).find((x) => x.id === params.id);
    if (!automation) { set.status = 404; return { error: "not found" }; }

    const b = (body ?? {}) as { text?: string; triggerType?: AutomationTriggerType };
    const text: string = b.text ?? "test comment";
    const triggerType: AutomationTriggerType = b.triggerType ?? automation.trigger.type;

    const steps = await executeAutomation(
      automation,
      {
        type: triggerType,
        commentId: `test_${Date.now()}`,
        fromUserId: "test_user",
        fromUsername: "test_user",
        text,
      },
      { dryRun: true, accountId: a.ctx.accountId }
    );

    return { steps, nodeCount: automation.nodes.length - 1 };
  })

  // ── POST /api/ig/inject — inject a fake comment/dm through the pipeline ────
  .post("/api/ig/inject", async ({ request, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
    const accountId = a.ctx.accountId;

    const b = (body ?? {}) as {
      kind?: "comment" | "dm";
      text: string;
      fromUsername?: string;
      fromUserId?: string;
      postId?: string;
    };
    const kind = b.kind || "comment";
    const fromUserId = b.fromUserId || `dev_${Date.now()}`;
    const fromUsername = b.fromUsername || "test_user";
    const fakeId = `fake_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    publish({
      type: kind === "comment" ? "comment" : "message",
      ...(kind === "comment"
        ? { commentId: fakeId, mediaId: b.postId ?? "fake_media", fromUserId, fromUsername, text: b.text, ts: Date.now() }
        : { messageId: fakeId, fromUserId, text: b.text, ts: Date.now() }),
    } as Parameters<typeof publish>[0]);

    // cache comment for UI
    if (kind === "comment") {
      updateStoreFor(accountId, (s) => ({
        ...s,
        commentsCache: [
          {
            id: fakeId,
            postId: b.postId || "",
            postCaption: "(injected test)",
            text: b.text,
            fromUserId,
            fromUsername,
            timestamp: new Date().toISOString(),
            ts: Date.now(),
            isOwn: false,
          },
          ...s.commentsCache,
        ].slice(0, 5000),
      })).catch(() => {});
    }

    if (kind === "comment") {
      // ── 1. SQLite post_configs automation (ManyChat-style) — mirrors webhook ──
      let handledByPostConfig = false;
      if (b.postId) {
        try {
          const config = await getPostConfigByPostId(b.postId);
          const store = await readStore(accountId);
          const ownId = store.account?.igUserId;
          if (config && fromUserId !== ownId && !await isCommentProcessed(fakeId)) {
            const kws: string[] = config.keywords;
            const matches = kws.length === 0 || kws.some((k) => b.text.toLowerCase().includes(k.toLowerCase()));
            if (matches) {
              handledByPostConfig = true;
              await markCommentProcessed(fakeId, fromUserId, config.id);
              await upsertUserState({ igsid: fromUserId, post_id: config.id, comment_id: fakeId, state: "awaiting_tap", payload: null });
              await insertLog({ direction: "in", event_type: "comment", igsid: fromUserId, post_id: config.id, payload: JSON.stringify({ commentId: fakeId, text: b.text }), status: "matched", error: null });
              publish({ type: "log", level: "info", msg: `inject: post_config matched — @${fromUsername} → awaiting_tap (config: ${config.id})`, ts: Date.now() });
              publish({ type: "log", level: "info", msg: `inject: would send button DM: "${config.welcome_msg}" | btn: "${config.button_label}"`, ts: Date.now() });
            } else {
              publish({ type: "log", level: "info", msg: `inject: post_config found but keywords not matched (kws=${JSON.stringify(kws)})`, ts: Date.now() });
            }
          } else if (config && await isCommentProcessed(fakeId)) {
            publish({ type: "log", level: "warn", msg: `inject: post_config — comment already processed (dedup)`, ts: Date.now() });
          } else if (!config) {
            publish({ type: "log", level: "info", msg: `inject: no post_config for postId=${b.postId}`, ts: Date.now() });
          }
        } catch (e) {
          publish({ type: "log", level: "error", msg: `inject post_config: ${String(e)}`, ts: Date.now() });
        }
      }

      if (!handledByPostConfig) {
        // ── 2. Visual node automation (legacy) ──────────────────────────────
        const freshStore = await readStore(accountId);
        const evt: AutomationEvent = {
          type: "comment_post",
          commentId: fakeId,
          fromUserId,
          fromUsername: fromUsername ?? "",
          text: b.text,
          postId: b.postId,
        };
        const matched = matchAutomations(freshStore, evt);
        if (matched.length > 0) {
          publish({ type: "log", level: "info", msg: `inject: ${matched.length} visual automation(s) matched`, ts: Date.now() });
          for (const auto of matched) {
            await executeAutomation(auto, evt, { accountId }).catch((e) =>
              publish({ type: "log", level: "error", msg: `inject automation [${auto.id}]: ${String(e)}`, ts: Date.now() })
            );
          }
        } else {
          // ── 3. Mira AI pipeline ────────────────────────────────────────────
          publish({ type: "log", level: "info", msg: `inject: no automation matched — sending to pipeline`, ts: Date.now() });
          processInbound({
            kind,
            threadOrMediaId: fakeId,
            fromUserId,
            fromUsername,
            text: b.text,
            postId: b.postId,
          }).catch((e) =>
            publish({ type: "log", level: "error", msg: `inject pipeline: ${String(e)}`, ts: Date.now() })
          );
        }
      }
    } else {
      processInbound({
        kind,
        threadOrMediaId: fakeId,
        fromUserId,
        fromUsername,
        text: b.text,
        postId: b.postId,
      }).catch((e) =>
        publish({ type: "log", level: "error", msg: `inject pipeline: ${String(e)}`, ts: Date.now() })
      );
    }

    return { ok: true, id: fakeId };
  })

  // ── POST /api/ig/reprocess — re-run the pipeline on a cached comment ───────
  .post("/api/ig/reprocess", async ({ request, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }

    const { commentId } = (body ?? {}) as { commentId?: string };
    if (!commentId) { set.status = 400; return { error: "commentId required" }; }

    const s = await readStore(a.ctx.accountId);
    const c = s.commentsCache.find((x) => x.id === commentId);
    if (!c) { set.status = 404; return { error: "comment not found" }; }

    processInbound({
      kind: "comment",
      threadOrMediaId: c.id,
      fromUserId: c.fromUserId,
      fromUsername: c.fromUsername,
      text: c.text,
      postId: c.postId,
    }).catch(() => {});

    return { ok: true };
  });
