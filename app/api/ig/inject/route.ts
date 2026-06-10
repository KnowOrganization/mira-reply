import { NextRequest, NextResponse } from "next/server";
import { processInbound } from "@/lib/ig/pipeline";
import { readStore, updateStore } from "@/lib/ig/store";
import { publish } from "@/lib/ig/bus";
import { matchAutomations, executeAutomation, type AutomationEvent } from "@/lib/ig/automation";
import {
  getPostConfigByPostId,
  isCommentProcessed,
  markCommentProcessed,
  upsertUserState,
  insertLog,
} from "@/lib/ig/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    kind?: "comment" | "dm";
    text: string;
    fromUsername?: string;
    fromUserId?: string;
    postId?: string;
  };
  const kind = body.kind || "comment";
  const fromUserId = body.fromUserId || `dev_${Date.now()}`;
  const fromUsername = body.fromUsername || "test_user";
  const fakeId = `fake_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  publish({
    type: kind === "comment" ? "comment" : "message",
    ...(kind === "comment"
      ? { commentId: fakeId, mediaId: body.postId ?? "fake_media", fromUserId, fromUsername, text: body.text, ts: Date.now() }
      : { messageId: fakeId, fromUserId, text: body.text, ts: Date.now() }),
  } as Parameters<typeof publish>[0]);

  // cache comment for UI
  if (kind === "comment") {
    updateStore((s) => ({
      ...s,
      commentsCache: [
        {
          id: fakeId,
          postId: body.postId || "",
          postCaption: "(injected test)",
          text: body.text,
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
    if (body.postId) {
      try {
        const config = getPostConfigByPostId(body.postId);
        const store = await readStore();
        const ownId = store.account?.igUserId;
        if (config && fromUserId !== ownId && !isCommentProcessed(fakeId)) {
          const kws: string[] = config.keywords;
          const matches = kws.length === 0 || kws.some((k) => body.text.toLowerCase().includes(k.toLowerCase()));
          if (matches) {
            handledByPostConfig = true;
            markCommentProcessed(fakeId, fromUserId, config.id);
            upsertUserState({ igsid: fromUserId, post_id: config.id, comment_id: fakeId, state: "awaiting_tap", payload: null });
            insertLog({ direction: "in", event_type: "comment", igsid: fromUserId, post_id: config.id, payload: JSON.stringify({ commentId: fakeId, text: body.text }), status: "matched", error: null });
            publish({ type: "log", level: "info", msg: `inject: post_config matched — @${fromUsername} → awaiting_tap (config: ${config.id})`, ts: Date.now() });
            publish({ type: "log", level: "info", msg: `inject: would send button DM: "${config.welcome_msg}" | btn: "${config.button_label}"`, ts: Date.now() });
          } else {
            publish({ type: "log", level: "info", msg: `inject: post_config found but keywords not matched (kws=${JSON.stringify(kws)})`, ts: Date.now() });
          }
        } else if (config && isCommentProcessed(fakeId)) {
          publish({ type: "log", level: "warn", msg: `inject: post_config — comment already processed (dedup)`, ts: Date.now() });
        } else if (!config) {
          publish({ type: "log", level: "info", msg: `inject: no post_config for postId=${body.postId}`, ts: Date.now() });
        }
      } catch (e) {
        publish({ type: "log", level: "error", msg: `inject post_config: ${String(e)}`, ts: Date.now() });
      }
    }

    if (!handledByPostConfig) {
      // ── 2. Visual node automation (legacy) ──────────────────────────────
      const freshStore = await readStore();
      const evt: AutomationEvent = {
        type: "comment_post",
        commentId: fakeId,
        fromUserId,
        fromUsername: fromUsername ?? "",
        text: body.text,
        postId: body.postId,
      };
      const matched = matchAutomations(freshStore, evt);
      if (matched.length > 0) {
        publish({ type: "log", level: "info", msg: `inject: ${matched.length} visual automation(s) matched`, ts: Date.now() });
        for (const auto of matched) {
          await executeAutomation(auto, evt).catch((e) =>
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
          text: body.text,
          postId: body.postId,
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
      text: body.text,
      postId: body.postId,
    }).catch((e) =>
      publish({ type: "log", level: "error", msg: `inject pipeline: ${String(e)}`, ts: Date.now() })
    );
  }

  return NextResponse.json({ ok: true, id: fakeId });
}
