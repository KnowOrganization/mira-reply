import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { ig } from "@/lib/ig/config";
import { readStore, updateStore } from "@/lib/ig/store";
import { getCommentInfo } from "@/lib/ig/graph";
import { processInbound } from "@/lib/ig/pipeline";
import { publish } from "@/lib/ig/bus";
import { seenComment } from "@/lib/ig/seen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === ig.verifyToken && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("forbidden", { status: 403 });
}

function verifySignature(raw: string, sigHeader: string | null) {
  if (!sigHeader || !ig.appSecret) return false;
  const sig = sigHeader.replace(/^sha256=/, "");
  const expected = crypto.createHmac("sha256", ig.appSecret).update(raw).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

type WebhookPayload = {
  object?: string;
  entry?: Array<{
    id: string;
    time: number;
    changes?: Array<{
      field: string;
      value: {
        from?: { id: string; username?: string };
        media?: { id: string; media_product_type?: string };
        id?: string;
        text?: string;
      };
    }>;
    messaging?: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: { mid: string; text?: string };
    }>;
  }>;
};

export async function POST(req: NextRequest) {
  const raw = await req.text();
  // dump every incoming webhook for debug
  try {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    const path = await import("node:path");
    const dir = path.join(os.homedir(), ".mira", "webhook-logs");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, `${Date.now()}.json`),
      JSON.stringify(
        {
          ts: Date.now(),
          headers: Object.fromEntries(req.headers.entries()),
          raw,
        },
        null,
        2
      )
    );
  } catch {}

  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) {
    publish({ type: "log", level: "warn", msg: `Webhook signature invalid: ${raw.slice(0, 150)}`, ts: Date.now() });
    return new Response("invalid signature", { status: 403 });
  }
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(raw) as WebhookPayload;
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const store = await readStore();
  const token = store.account?.accessToken;

  publish({ type: "log", level: "info", msg: `webhook received: ${raw.slice(0, 200)}`, ts: Date.now() });

  // Normalize payload — Meta test button sends raw {field, value}, prod sends {entry:[{changes:[...]}]}
  type Change = { field: string; value: { from?: { id: string; username?: string }; media?: { id: string }; id?: string; text?: string } };
  const normalized: { changes: Change[]; messaging: NonNullable<WebhookPayload["entry"]>[number]["messaging"] }[] = [];
  if (Array.isArray(payload.entry)) {
    for (const e of payload.entry) {
      normalized.push({ changes: e.changes ?? [], messaging: e.messaging ?? [] });
    }
  } else if ((payload as unknown as Change).field) {
    normalized.push({ changes: [payload as unknown as Change], messaging: [] });
  }

  for (const entry of normalized) {
    for (const ch of entry.changes) {
      if (ch.field === "comments" && token) {
        const v = ch.value;
        let text = v.text;
        let fromId = v.from?.id;
        let fromUsername = v.from?.username;
        if (!text && v.id) {
          try {
            const info = (await getCommentInfo(v.id, token)) as {
              text?: string;
              username?: string;
              from?: { id: string };
            };
            text = info.text;
            fromId = fromId || info.from?.id;
            fromUsername = fromUsername || info.username;
          } catch {}
        }
        if (text && fromId && v.id) {
          const cid = v.id;
          const ctext = text;
          const cfrom = fromId;
          const cmedia = v.media?.id;
          // shared dedup — skip if the poll (or an earlier webhook) got it first
          if (seenComment(cid)) continue;
          publish({
            type: "comment",
            commentId: cid,
            mediaId: cmedia || "",
            fromUserId: cfrom,
            fromUsername,
            text: ctext,
            ts: Date.now(),
          });
          // cache a stub so the poll's cold-start dedup also skips it
          updateStore((s) => ({
            ...s,
            commentsCache: s.commentsCache.some((c) => c.id === cid)
              ? s.commentsCache
              : [
                  {
                    id: cid,
                    postId: cmedia || "",
                    postCaption: "",
                    text: ctext,
                    fromUserId: cfrom,
                    fromUsername: fromUsername || "",
                    timestamp: new Date().toISOString(),
                    ts: Date.now(),
                    isOwn: false,
                  },
                  ...s.commentsCache,
                ].slice(0, 5000),
          })).catch(() => {});
          processInbound({
            kind: "comment",
            threadOrMediaId: cid,
            fromUserId: cfrom,
            fromUsername,
            text: ctext,
            postId: cmedia,
          }).catch((e) =>
            publish({ type: "log", level: "error", msg: `pipeline: ${String(e)}`, ts: Date.now() })
          );
        }
      }
    }
    for (const m of entry.messaging ?? [] as NonNullable<typeof entry.messaging>) {
      const text = m.message?.text;
      if (text) {
        publish({
          type: "message",
          messageId: m.message!.mid,
          fromUserId: m.sender.id,
          text,
          ts: m.timestamp,
        });
        processInbound({
          kind: "dm",
          threadOrMediaId: m.message!.mid,
          fromUserId: m.sender.id,
          text,
        }).catch((e) =>
          publish({ type: "log", level: "error", msg: `pipeline: ${String(e)}`, ts: Date.now() })
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
