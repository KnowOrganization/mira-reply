// Business logic for LLM-facing routes.
// No HTTP (set/status). No requireUser. Returns data or throws.
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

export type { AgentMsg };

// ── Types ──────────────────────────────────────────────────────────────────────

export type ChatBody = {
  model: string;
  host: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
};

export type ChatUpstreamResult =
  | { ok: true; body: ReadableStream; status: number }
  | { ok: false; status: number; text: string };

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Same account-context summary the Next /api/chat route prepends as system prompt. */
export async function buildAccountContext(accountId: string): Promise<string> {
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

/** Merge the Mira persona + account snapshot into the chat's system prompt. */
export async function prepareChatMessages(
  accountId: string,
  messages: ChatBody["messages"]
): Promise<ChatBody["messages"]> {
  const acctCtx = await buildAccountContext(accountId);

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

  return [
    { role: "system" as const, content: newSys },
    ...messages.filter((m) => m.role !== "system"),
  ];
}

/**
 * Prepare the upstream fetch options for the /api/chat Ollama proxy.
 * Handler is responsible for constructing the streaming Response.
 */
export async function prepareChatUpstream(
  accountId: string,
  chatBody: ChatBody
): Promise<{ upstreamUrl: string; upstreamInit: RequestInit }> {
  const { model, host, messages } = chatBody;
  const finalMessages = await prepareChatMessages(accountId, messages);

  return {
    upstreamUrl: `${host.replace(/\/$/, "")}/api/chat`,
    upstreamInit: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: finalMessages,
        stream: true,
        options: { temperature: 0.7, top_p: 0.9 },
      }),
    },
  };
}

// ── Agent ──────────────────────────────────────────────────────────────────────

export async function runAgentService(
  messages: AgentMsg[]
): Promise<{ reply: string; actions: unknown[] }> {
  return runAgent(messages.slice(-12));
}

// ── Playground ────────────────────────────────────────────────────────────────

export async function runPlayground(opts: {
  comment: string;
  caption?: string;
  notes?: string;
  qa?: { q: string; a: string }[];
}): Promise<{ decision: unknown; ms: number }> {
  const { comment, caption, notes, qa: rawQa } = opts;

  const qa = (Array.isArray(rawQa) ? rawQa : [])
    .filter((x) => x && x.q?.trim() && x.a?.trim())
    .map((x) => ({ q: x.q.trim(), a: x.a.trim(), ts: Date.now() }));

  const post: Post = {
    id: "playground",
    caption: caption || "",
    mediaType: "IMAGE",
    timestamp: new Date().toISOString(),
    notes: notes || "",
    qa,
    links: [],
    updatedAt: Date.now(),
  };
  const input: DraftInput = {
    kind: "comment",
    threadOrMediaId: "playground_comment",
    fromUserId: "playground_user",
    fromUsername: "playground_tester",
    text: comment,
    postId: "playground",
  };

  const startedAt = Date.now();
  const decision = await decide(input, post);
  return { decision, ms: Date.now() - startedAt };
}

// ── Training CRUD ──────────────────────────────────────────────────────────────

export async function getTraining(): Promise<unknown[]> {
  return listTraining();
}

export type TrainingInput = {
  comment: string;
  caption: string;
  notes: string;
  miraAction: string;
  miraReply: string;
  intent: string;
  verdict: "good" | "bad";
  correctAction?: "reply" | "ask_owner" | "skip";
  idealReply?: string;
  askQuestion?: string;
  note?: string;
};

export async function createTraining(input: TrainingInput): Promise<unknown> {
  return addTraining(input);
}

export async function deleteTraining(id: string): Promise<void> {
  await removeTraining(id);
}

// ── Automation test ────────────────────────────────────────────────────────────

export async function testAutomation(opts: {
  accountId: string;
  automationId: string;
  text: string;
  triggerType?: AutomationTriggerType;
}): Promise<{ steps: unknown[]; nodeCount: number }> {
  const store = await readStore(opts.accountId);
  const automation = (store.automations ?? []).find((x) => x.id === opts.automationId);
  if (!automation) {
    const e = new Error("not found");
    (e as NodeJS.ErrnoException).code = "NOT_FOUND";
    throw e;
  }

  const triggerType: AutomationTriggerType = opts.triggerType ?? automation.trigger.type;

  const steps = await executeAutomation(
    automation,
    {
      type: triggerType,
      commentId: `test_${Date.now()}`,
      fromUserId: "test_user",
      fromUsername: "test_user",
      text: opts.text,
    },
    { dryRun: true, accountId: opts.accountId }
  );

  return { steps, nodeCount: automation.nodes.length - 1 };
}

// ── Inject ─────────────────────────────────────────────────────────────────────

export async function injectEvent(opts: {
  accountId: string;
  kind: "comment" | "dm";
  text: string;
  fromUsername: string;
  fromUserId: string;
  postId?: string;
}): Promise<{ ok: true; id: string }> {
  const { accountId, kind, text, fromUsername, fromUserId, postId } = opts;
  const fakeId = `fake_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  publish({
    type: kind === "comment" ? "comment" : "message",
    ...(kind === "comment"
      ? { commentId: fakeId, mediaId: postId ?? "fake_media", fromUserId, fromUsername, text, ts: Date.now() }
      : { messageId: fakeId, fromUserId, text, ts: Date.now() }),
  } as Parameters<typeof publish>[0]);

  // cache comment for UI
  if (kind === "comment") {
    updateStoreFor(accountId, (s) => ({
      ...s,
      commentsCache: [
        {
          id: fakeId,
          postId: postId || "",
          postCaption: "(injected test)",
          text,
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
    if (postId) {
      try {
        const config = await getPostConfigByPostId(postId);
        const store = await readStore(accountId);
        const ownId = store.account?.igUserId;
        if (config && fromUserId !== ownId && !await isCommentProcessed(fakeId)) {
          const kws: string[] = config.keywords;
          const matches = kws.length === 0 || kws.some((k) => text.toLowerCase().includes(k.toLowerCase()));
          if (matches) {
            handledByPostConfig = true;
            await markCommentProcessed(fakeId, fromUserId, config.id);
            await upsertUserState({ igsid: fromUserId, post_id: config.id, comment_id: fakeId, state: "awaiting_tap", payload: null });
            await insertLog({ direction: "in", event_type: "comment", igsid: fromUserId, post_id: config.id, payload: JSON.stringify({ commentId: fakeId, text }), status: "matched", error: null });
            publish({ type: "log", level: "info", msg: `inject: post_config matched — @${fromUsername} → awaiting_tap (config: ${config.id})`, ts: Date.now() });
            publish({ type: "log", level: "info", msg: `inject: would send button DM: "${config.welcome_msg}" | btn: "${config.button_label}"`, ts: Date.now() });
          } else {
            publish({ type: "log", level: "info", msg: `inject: post_config found but keywords not matched (kws=${JSON.stringify(kws)})`, ts: Date.now() });
          }
        } else if (config && await isCommentProcessed(fakeId)) {
          publish({ type: "log", level: "warn", msg: `inject: post_config — comment already processed (dedup)`, ts: Date.now() });
        } else if (!config) {
          publish({ type: "log", level: "info", msg: `inject: no post_config for postId=${postId}`, ts: Date.now() });
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
        text,
        postId,
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
          text,
          postId,
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
      text,
      postId,
    }).catch((e) =>
      publish({ type: "log", level: "error", msg: `inject pipeline: ${String(e)}`, ts: Date.now() })
    );
  }

  return { ok: true, id: fakeId };
}

// ── Reprocess ──────────────────────────────────────────────────────────────────

export async function reprocessComment(opts: {
  accountId: string;
  commentId: string;
}): Promise<void> {
  const s = await readStore(opts.accountId);
  const c = s.commentsCache.find((x) => x.id === opts.commentId);
  if (!c) {
    const e = new Error("comment not found");
    (e as NodeJS.ErrnoException).code = "NOT_FOUND";
    throw e;
  }

  processInbound({
    kind: "comment",
    threadOrMediaId: c.id,
    fromUserId: c.fromUserId,
    fromUsername: c.fromUsername,
    text: c.text,
    postId: c.postId,
  }).catch(() => {});
}
