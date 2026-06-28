import type { Automation, IgStore } from "./store";
import { readStore } from "./store";
import { createHash } from "crypto";
// followup_message schedules via the durable BullMQ outbound queue (delayed
// job) — survives restarts, drained by the worker.
import { enqueueOutbound } from "./ingestQueue";
import {
  tryDM as _tryDM,
  tryPrivateReply,
  tryPrivateReplyWithButtons as _tryPrivateReplyWithButtons,
  tryDMWithButtons as _tryDMWithButtons,
  tryDMWithButtonTemplate as _tryDMWithButtonTemplate,
  tryDMImage as _tryDMImage,
  tryReplyToComment as _tryReplyToComment,
} from "./dm";
import type { SendResult, SendOpts } from "./dm";
import type { ButtonTemplateButton } from "./graph";
import { publish } from "./bus";
import { checkFollowStatus } from "./followCheck";
// Automation resume/dedup state now lives in Postgres + Redis (process-safe),
// not the file store — so the worker and Next never race on ~/.mira/ig.json.
import { parkPending, claimPending, claimDueRetries, bumpAutomationStats } from "./pending";
import { getAutomation, currentAccountId } from "./accountsRepo";
import { claimOnce, isClaimed, k } from "./redis";
import { query } from "@shaiz/db";

// Resolve the account once per call. Engine paths pass it explicitly (worker);
// webhook/test default to the single connected account.
async function resolveAccountId(passed?: string): Promise<string | null> {
  return passed ?? (await currentAccountId());
}

// Minimal account view the engine needs (token + username + follower cache for
// dryRun follow checks). Reads the Postgres accounts row directly.
type EngineAccount = { igUserId: string; username: string; accessToken: string; followerCache: { userId: string }[] };
async function loadAccount(accountId: string): Promise<EngineAccount | null> {
  const rows = await query<{ username: string; access_token: string; follower_cache: { userId: string }[] | null }>(
    "SELECT username, access_token, follower_cache FROM accounts WHERE ig_user_id=$1", [accountId]
  );
  const r = rows[0];
  return r ? { igUserId: accountId, username: r.username, accessToken: r.access_token, followerCache: r.follower_cache ?? [] } : null;
}

// Auto-send scope. Reuses the DM auto-allowlist (dstrails today). Empty list =
// legacy allow-all (back-compat); non-empty = scoped (igsid OR username match).
async function automationSendAllowed(accountId: string, userId: string, username?: string): Promise<boolean> {
  const s = await readStore(accountId);
  const allow = s.settings.dmAutoAllowlist ?? [];
  if (!allow.length) return true;
  return allow.includes(userId) || (!!username && allow.includes(username));
}

// Content-hash dedup backstop — CLAIM-AFTER-SUCCESS. textAlreadySent is a
// read-only peek (never burns a claim); markTextSent commits only after a send
// is confirmed ok. This keeps the rate-limit park-and-retry working: a failed
// send leaves nothing claimed, so the parked retry can re-deliver.
function contentHash(s: string): string {
  return createHash("sha1").update(s).digest("hex").slice(0, 12);
}
async function textAlreadySent(accountId: string, recipient: string, text: string): Promise<boolean> {
  return isClaimed(k.sentHash(accountId, recipient, contentHash(text)));
}
async function markTextSent(accountId: string, recipient: string, text: string): Promise<void> {
  await claimOnce(k.sentHash(accountId, recipient, contentHash(text)), 6 * 60 * 60);
}

// Every send from an automation is an in-funnel message to an already-engaged
// user, so it bypasses the cold-DM 1-per-24h gate. Shadowing the imported names
// with same-named wrappers means all existing call sites route through here
// unchanged — generic to any graph, no per-call edits.
const FUNNEL: SendOpts = { skipRateGate: true };
const tryDM = (id: string, text: string) => _tryDM(id, text, FUNNEL);
const tryDMImage = (id: string, url: string) => _tryDMImage(id, url, FUNNEL);
const tryDMWithButtons = (id: string, text: string, b: { label: string; payload?: string }[]) => _tryDMWithButtons(id, text, b, FUNNEL);
const tryDMWithButtonTemplate = (id: string, text: string, b: ButtonTemplateButton[]) => _tryDMWithButtonTemplate(id, text, b, FUNNEL);
const tryPrivateReplyWithButtons = (commentId: string, id: string, text: string, b: { label: string; payload?: string }[]) => _tryPrivateReplyWithButtons(commentId, id, text, b, FUNNEL);
// Public comment reply — no FUNNEL (it's not a cold DM, no rate gate to skip).
const tryReplyToComment = (commentId: string, text: string) => _tryReplyToComment(commentId, text);

export type AutomationEvent = {
  type: "comment_post" | "dm" | "live_comment" | "story_reply";
  commentId: string;
  fromUserId: string;
  fromUsername?: string;
  text: string;
  postId?: string;
};

export type DryRunStep = {
  nodeType: string;
  action: string;
  text: string;
};

// Fix 10 — word boundary keyword matching
function keywordMatches(text: string, keyword: string): boolean {
  try {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  } catch {
    return text.toLowerCase().includes(keyword.toLowerCase());
  }
}

// Cross-path dedup for resumes (same tap arriving via webhook postback AND the
// 1s DM poll) is now handled by claimPending's atomic FOR-UPDATE claim: the
// first caller locks+deletes the rows, the second sees none. No separate lock.

/** All nodes reachable from `startIds` via edges, in BFS order. Used when a gate
 *  pauses the flow — we must park the ENTIRE downstream chain, not just the gate's
 *  immediate children, or later nodes (e.g. the final message) never run on resume. */
function downstreamFrom(startIds: string[], nextNodes: Map<string, string[]>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const q = [...startIds];
  while (q.length) {
    const id = q.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    q.push(...(nextNodes.get(id) ?? []));
  }
  return out;
}

/** Returns enabled automations whose trigger matches this event. */
export function matchAutomations(store: IgStore, event: AutomationEvent): Automation[] {
  const all = store.automations ?? [];
  publish({ type: "log", level: "info", msg: `matchAutomations: checking ${all.length} automation(s) for ${event.type} postId=${event.postId ?? "none"} text="${event.text.slice(0, 60)}"`, ts: Date.now() });

  return all.filter((a) => {
    if (!a.enabled) {
      publish({ type: "log", level: "info", msg: `matchAutomations: [${a.id}] "${a.name}" — skip (disabled)`, ts: Date.now() });
      return false;
    }
    if (a.trigger.type !== event.type) {
      publish({ type: "log", level: "info", msg: `matchAutomations: [${a.id}] "${a.name}" — skip (trigger=${a.trigger.type} ≠ event=${event.type})`, ts: Date.now() });
      return false;
    }

    // postIds from trigger node data (UI sets it here) or trigger.postIds
    const triggerNode = a.nodes.find((n) => n.type === "trigger");
    const postIds = a.trigger.postIds?.length
      ? a.trigger.postIds
      : (triggerNode?.data.postIds?.length ? triggerNode.data.postIds : []);

    if (postIds.length && event.postId) {
      if (!postIds.includes(event.postId)) {
        publish({ type: "log", level: "info", msg: `matchAutomations: [${a.id}] "${a.name}" — skip (postId ${event.postId} not in [${postIds.join(",")}])`, ts: Date.now() });
        return false;
      }
    } else if (postIds.length && !event.postId) {
      publish({ type: "log", level: "warn", msg: `matchAutomations: [${a.id}] "${a.name}" — postIds configured but event.postId missing; skipping`, ts: Date.now() });
      return false;
    }

    // keywords from trigger.keywords or from trigger node buttons[] (legacy storage)
    const keywords = a.trigger.keywords?.length
      ? a.trigger.keywords
      : (triggerNode?.data.buttons?.map((b) => b.label).filter(Boolean) ?? []);

    if (keywords.length) {
      const hit = keywords.some((kw) => keywordMatches(event.text, kw));
      if (!hit) {
        publish({ type: "log", level: "info", msg: `matchAutomations: [${a.id}] "${a.name}" — skip (no keyword match in: [${keywords.join(", ")}])`, ts: Date.now() });
        return false;
      }
    }

    publish({ type: "log", level: "info", msg: `matchAutomations: [${a.id}] "${a.name}" — MATCHED`, ts: Date.now() });
    return true;
  });
}

/** Walk a matched automation's node graph and send each response step.
 *  Pass dryRun=true to collect steps without sending anything. */
export async function executeAutomation(
  automation: Automation,
  event: AutomationEvent,
  options: { dryRun?: boolean; resumeFrom?: string[]; accountId?: string } = {}
): Promise<DryRunStep[]> {
  const { dryRun = false, resumeFrom } = options;
  const steps: DryRunStep[] = [];

  const accountId = await resolveAccountId(options.accountId);
  if (!accountId) return steps;

  // Fix 12 — dedup: skip if this automation already fired for this comment within 1h.
  // Resume runs (rate-limit retry) skip dedup/trigger-count — they continue an
  // already-counted flow from its remaining nodes.
  if (!dryRun && !resumeFrom) {
    // ATOMIC cross-process check-and-set in Redis (replaces the file-store
    // automationFired ledger). The realtime loop, 7s tick AND the worker can all
    // reach here for the same comment; claimOnce guarantees exactly one proceeds.
    // 24h TTL (was 1h) so dedup outlives any plausible Meta re-delivery / poll
    // resurfacing of the same comment — matches the k.seen horizon in ingest.ts.
    const claimed = await claimOnce(k.fired(accountId, automation.id, event.commentId), 24 * 60 * 60);
    if (!claimed) return steps;
    await bumpAutomationStats(automation.id, { triggered: 1, lastTriggered: Date.now() });
  }

  // Auto-send scope (dstrails-only today). Placed AFTER the dedup claim so a
  // skipped event keeps its token and won't re-fire on Meta re-delivery. dryRun
  // (UI preview) is never gated. Retry path (resumeFrom) still hits this — it's
  // outside the !resumeFrom block above.
  if (!dryRun && !(await automationSendAllowed(accountId, event.fromUserId, event.fromUsername))) {
    publish({ type: "log", level: "info", msg: `automation "${automation.name}" → @${event.fromUsername ?? event.fromUserId}: skip (not on auto-send allowlist)`, ts: Date.now() });
    return steps;
  }

  const nextNodes = new Map<string, string[]>();
  for (const edge of automation.edges) {
    const arr = nextNodes.get(edge.source) ?? [];
    arr.push(edge.target);
    nextNodes.set(edge.source, arr);
  }

  const nodeMap = new Map(automation.nodes.map((n) => [n.id, n]));
  const triggerNode = automation.nodes.find((n) => n.type === "trigger");
  if (!triggerNode) return steps;

  const bfsQueue = resumeFrom?.length ? [...resumeFrom] : [triggerNode.id];
  const visited = new Set<string>();
  let sentCount = 0;
  let failCount = 0;
  let gated = false; // set true by follow_gate when user not following
  let rateLimited = false; // set true when a send hits an Instagram 613/429
  // Records whether any send in a node hit a rate-limit so we can park-and-retry.
  const track = (r: SendResult): SendResult => { if (r.rateLimited) rateLimited = true; return r; };

  while (bfsQueue.length) {
    const nodeId = bfsQueue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node || node.type === "trigger" || node.type === "post_filter") {
      bfsQueue.push(...(nextNodes.get(nodeId) ?? []));
      continue;
    }

    // gate active — remaining nodes queued for when user follows
    if (gated) continue;

    const d = node.data;

    // Fix 11 — check enabled on every node type
    if (d.enabled === false) {
      bfsQueue.push(...(nextNodes.get(nodeId) ?? []));
      continue;
    }

    // Per-(automation, comment, node) idempotency — a node that ALREADY delivered
    // for this comment is skipped. Read-only peek (never burns a claim); the claim
    // is committed AFTER a confirmed send below, so a rate-limited node stays
    // unclaimed and the parked retry can re-deliver it. Guarded on commentId so
    // DM-triggered runs (no stable commentId) rely on the content-hash backstop.
    if (!dryRun && event.commentId && (await isClaimed(k.sentNode(accountId, automation.id, event.commentId, nodeId)))) {
      bfsQueue.push(...(nextNodes.get(nodeId) ?? []));
      continue;
    }
    const sentBefore = sentCount;

    switch (node.type) {
      case "opening_message":
      case "text_message": {
        const msg = d.text?.trim();
        if (!msg) break;
        const hasButtons = (d.buttons?.length ?? 0) > 0;
        steps.push({ nodeType: node.type, action: hasButtons ? "private_reply_with_buttons + button_gate" : "private_reply", text: msg });
        if (!dryRun) {
          if (hasButtons) {
            const pr = track(await tryPrivateReplyWithButtons(event.commentId, event.fromUserId, msg, d.buttons!));
            if (pr.ok) sentCount++; else failCount++;
          } else {
            if (await textAlreadySent(accountId, event.fromUserId, `pr:${msg}`)) { sentCount++; break; }
            const pr = track(await tryPrivateReply(event.commentId, event.fromUserId, msg));
            if (pr.ok) { sentCount++; await markTextSent(accountId, event.fromUserId, `pr:${msg}`); } else {
              const dm = track(await tryDM(event.fromUserId, msg));
              if (dm.ok) { sentCount++; await markTextSent(accountId, event.fromUserId, `pr:${msg}`); } else failCount++;
            }
          }
          // Button present — stop BFS, wait for user to click (DM arrives)
          if (hasButtons) {
            const remainingIds = downstreamFrom([...(nextNodes.get(nodeId) ?? []), ...bfsQueue], nextNodes);
            await parkPending(accountId, "button", {
              automationId: automation.id,
              commentId: event.commentId,
              fromUserId: event.fromUserId,
              fromUsername: event.fromUsername,
              remainingNodeIds: remainingIds,
              ts: Date.now(),
            });
            publish({ type: "log", level: "info", msg: `automation "${automation.name}": button gate — waiting for @${event.fromUsername ?? event.fromUserId} to click`, ts: Date.now() });
            gated = true;
          }
        }
        break;
      }

      case "card_message": {
        const textParts = [d.title?.trim(), d.subtitle?.trim()].filter(Boolean).join("\n\n");
        const imgUrl = d.imageUrl?.trim();
        if (!textParts && !imgUrl) break;
        if (imgUrl) {
          steps.push({ nodeType: "card_message", action: "dm_image", text: imgUrl });
          if (!dryRun) {
            const img = track(await tryDMImage(event.fromUserId, imgUrl));
            if (img.ok) sentCount++;
          }
        }
        if (textParts) {
          const hasButtons = (d.buttons?.length ?? 0) > 0;
          steps.push({ nodeType: "card_message", action: "private_reply", text: textParts });
          if (!dryRun && (await textAlreadySent(accountId, event.fromUserId, `pr:${textParts}`))) {
            sentCount++;
          } else if (!dryRun) {
            const pr = track(await tryPrivateReply(event.commentId, event.fromUserId, textParts));
            if (pr.ok) { sentCount++; await markTextSent(accountId, event.fromUserId, `pr:${textParts}`); } else {
              const dm = track(hasButtons
                ? await tryDMWithButtons(event.fromUserId, textParts, d.buttons!)
                : await tryDM(event.fromUserId, textParts));
              if (dm.ok) { sentCount++; await markTextSent(accountId, event.fromUserId, `pr:${textParts}`); } else failCount++;
            }
          }
        }
        break;
      }

      case "image_message": {
        const url = d.imageUrl?.trim();
        if (!url) break;
        steps.push({ nodeType: "image_message", action: "private_reply → dm_image_fallback", text: url });
        if (!dryRun) {
          const pr = track(await tryPrivateReply(event.commentId, event.fromUserId, url));
          if (pr.ok) { sentCount++; } else {
            const dm = track(await tryDMImage(event.fromUserId, url));
            if (dm.ok) sentCount++; else failCount++;
          }
        }
        break;
      }

      case "comment_reply": {
        const msg = d.text?.trim();
        if (!msg || !event.commentId) break; // no public-reply target on dm/story_reply
        steps.push({ nodeType: "comment_reply", action: "public_comment_reply", text: msg });
        if (!dryRun) {
          if (await textAlreadySent(accountId, event.commentId, `creply:${msg}`)) { sentCount++; break; }
          const r = track(await tryReplyToComment(event.commentId, msg));
          if (r.ok) { sentCount++; await markTextSent(accountId, event.commentId, `creply:${msg}`); } else failCount++;
        }
        break;
      }

      case "follow_gate": {
        const account = await loadAccount(accountId);
        if (!account) { gated = true; break; }

        const isFollowing = dryRun
          ? (account.followerCache ?? []).some((f) => f.userId === event.fromUserId)
          : await checkFollowStatus(event.fromUserId, account.accessToken);

        if (isFollowing) {
          steps.push({ nodeType: "follow_gate", action: "gate_passed", text: "User is following — proceeding" });
          // gate passed, BFS continues naturally
          break;
        }

        // Not following — send gate message with button so user can tap to recheck
        const uname = account.username ?? "us";
        const notFollowingMsg = (d.text?.trim()) ||
          `Oops 👀 You're not following yet!\n\nFollow @${uname} then tap below ⬇️`;

        steps.push({ nodeType: "follow_gate", action: "gate_blocked", text: notFollowingMsg });

        if (!dryRun) {
          const templateButtons = [
            { type: "web_url" as const, title: "Visit Profile", url: `https://www.instagram.com/${uname}` },
            { type: "postback" as const, title: "I'm following ✓", payload: "done" },
          ];
          const dm = track(await tryDMWithButtonTemplate(event.fromUserId, notFollowingMsg, templateButtons));
          if (dm.ok) sentCount++; else failCount++;

          // Collect remaining node ids for resumption (full downstream chain)
          const remainingIds = downstreamFrom([...Array.from(nextNodes.get(nodeId) ?? []), ...bfsQueue], nextNodes);
          await parkPending(accountId, "follow", {
            automationId: automation.id,
            commentId: event.commentId,
            fromUserId: event.fromUserId,
            fromUsername: event.fromUsername,
            remainingNodeIds: remainingIds,
            ts: Date.now(),
          });
        }

        gated = true;
        break;
      }

      case "ask_follow": {
        const acct = await loadAccount(accountId);
        const uname = acct?.username ?? "us";
        // Live check — if they already follow, skip the ask and continue the graph.
        if (!dryRun && acct) {
          const already = await checkFollowStatus(event.fromUserId, acct.accessToken);
          if (already) {
            steps.push({ nodeType: "ask_follow", action: "skipped_already_following", text: "" });
            break;
          }
        }
        const template = d.text?.trim() || `Follow @[username] to get exclusive updates 🙏`;
        const msg = template.replace(/\[username\]/gi, uname);
        steps.push({ nodeType: "ask_follow", action: "dm_button_template", text: msg });
        if (!dryRun) {
          const confirmLabel = d.buttons?.[0]?.label?.trim() || "I'm following ✓";
          const templateButtons = [
            { type: "web_url" as const, title: "Visit Profile", url: `https://www.instagram.com/${uname}` },
            { type: "postback" as const, title: confirmLabel, payload: "done" },
          ];
          const dm = track(await tryDMWithButtonTemplate(event.fromUserId, msg, templateButtons));
          if (dm.ok) sentCount++; else failCount++;
          // Gate BFS — park remaining nodes (full downstream chain) until user confirms follow
          const remainingIds = downstreamFrom([...(nextNodes.get(nodeId) ?? []), ...bfsQueue], nextNodes);
          await parkPending(accountId, "follow", {
            automationId: automation.id,
            commentId: event.commentId,
            fromUserId: event.fromUserId,
            fromUsername: event.fromUsername,
            remainingNodeIds: remainingIds,
            ts: Date.now(),
          });
          gated = true;
        }
        break;
      }

      case "lead_form": {
        const q = d.question?.trim();
        if (!q) break;
        steps.push({ nodeType: "lead_form", action: "private_reply", text: q });
        if (!dryRun && (await textAlreadySent(accountId, event.fromUserId, `pr:${q}`))) {
          sentCount++;
        } else if (!dryRun) {
          const pr = track(await tryPrivateReply(event.commentId, event.fromUserId, q));
          if (pr.ok) { sentCount++; await markTextSent(accountId, event.fromUserId, `pr:${q}`); } else {
            const dm = track(await tryDM(event.fromUserId, q));
            if (dm.ok) { sentCount++; await markTextSent(accountId, event.fromUserId, `pr:${q}`); } else failCount++;
          }
        }
        break;
      }

      case "followup_message": {
        const msg = d.text?.trim();
        if (!msg || !d.delayMinutes) break;
        const delayMs = d.delayMinutes * 60_000;
        steps.push({ nodeType: "followup_message", action: `scheduled_send +${d.delayMinutes}m`, text: msg });
        if (!dryRun) {
          await enqueueOutbound({
            accountId,
            id: `auto_${automation.id}_${event.commentId}_fu`,
            type: event.commentId ? "private_reply" : "dm",
            recipient: event.commentId ? { comment_id: event.commentId } : { id: event.fromUserId },
            message: { text: msg },
            igsid: event.fromUserId,
          }, delayMs);
          sentCount++;
        }
        break;
      }
    }

    // Commit the per-node idempotency claim ONLY after a confirmed delivery and
    // only if the node did not rate-limit — a throttled node stays unclaimed so
    // the parked retry below re-runs it. A fully-delivered node is now marked so
    // a duplicate webhook/poll delivery of the same comment can't re-send it.
    if (!dryRun && event.commentId && sentCount > sentBefore && !rateLimited) {
      await claimOnce(k.sentNode(accountId, automation.id, event.commentId, nodeId), 24 * 60 * 60);
    }

    // Rate-limited (613/429) mid-flow — park current node + everything still
    // queued, retry after backoff. Generic: any graph, any node, never dropped.
    if (!dryRun && rateLimited) {
      const remaining = [nodeId, ...(nextNodes.get(nodeId) ?? []), ...bfsQueue];
      await parkAutomationRetry(accountId, automation.id, event, remaining);
      publish({ type: "log", level: "warn", msg: `automation "${automation.name}": rate-limited — parked ${remaining.length} node(s) for retry`, ts: Date.now() });
      break;
    }

    bfsQueue.push(...(nextNodes.get(nodeId) ?? []));
  }

  // Fix 3 — accurate stats: completed only if something sent, track failed
  if (!dryRun) {
    await bumpAutomationStats(automation.id, {
      completed: sentCount > 0 ? 1 : 0,
      failed: sentCount === 0 && failCount > 0 ? 1 : 0,
    });

    publish({
      type: "log",
      level: sentCount > 0 ? "info" : "warn",
      msg: `automation "${automation.name}" → @${event.fromUsername ?? event.fromUserId}: ${sentCount} sent, ${failCount} failed`,
      ts: Date.now(),
    });
  }

  return steps;
}

/**
 * Called when any DM arrives from a user. Checks automationButtonPending —
 * meaning they previously received an opening_message with a button and we
 * were waiting for them to tap it.
 * - If following: skip ask_follow, send remaining content nodes.
 * - If not following: send ask_follow message, park rest in automationFollowPending.
 */
export async function resumeAutomationAfterButtonClick(
  userId: string,
  username?: string,
  accountId?: string
): Promise<boolean> {
  const acct = await resolveAccountId(accountId);
  if (!acct) return false;
  // Atomic claim in Postgres (FOR UPDATE) — dedups one-per-automation (latest),
  // deletes ALL of this user's button rows, collapses webhook+poll duplicates.
  // Returns [] when nothing is parked, so it doubles as the "is this a resume?"
  // gate — callers no longer pre-check the (removed) file-store arrays.
  const claimed = await claimPending(acct, "button", userId, 24 * 60 * 60_000);
  if (!claimed.length) return false;
  const account = await loadAccount(acct);
  if (!account) return false;
  if (!(await automationSendAllowed(acct, userId, username))) return false;

  for (const p of claimed) {
    const automation = await getAutomation(acct, p.automationId);
    if (!automation?.enabled) continue;

    const nodeMap = new Map(automation.nodes.map((n) => [n.id, n]));

    const isFollowing = await checkFollowStatus(userId, account.accessToken);
    publish({ type: "log", level: "info", msg: `automation button-click resume @${username ?? userId}: following=${isFollowing} remaining=[${p.remainingNodeIds.join(",")}]`, ts: Date.now() });

    // Find first gate node (ask_follow OR follow_gate) — both require follow check
    const GATE_NODE_TYPES = new Set(["ask_follow", "follow_gate"]);
    const askFollowIdx = p.remainingNodeIds.findIndex(
      (id) => GATE_NODE_TYPES.has(nodeMap.get(id)?.type ?? "")
    );
    const nodesBeforeAskFollow = askFollowIdx === -1
      ? p.remainingNodeIds
      : p.remainingNodeIds.slice(0, askFollowIdx);
    const askFollowId = askFollowIdx !== -1 ? p.remainingNodeIds[askFollowIdx] : null;
    const nodesAfterAskFollow = askFollowIdx === -1
      ? []
      : p.remainingNodeIds.slice(askFollowIdx + 1);

    // Always execute content nodes before ask_follow boundary
    for (const nodeId of nodesBeforeAskFollow) {
      const node = nodeMap.get(nodeId);
      if (!node) continue;
      const d = node.data;
      switch (node.type) {
        case "text_message":
        case "opening_message": {
          const msg = d.text?.trim(); if (!msg) break;
          await tryDM(userId, msg); // open window → plain DM (no comment-anchor header)
          break;
        }
        case "image_message": {
          const url = d.imageUrl?.trim(); if (!url) break;
          await tryDMImage(userId, url);
          break;
        }
        case "card_message": {
          const textParts = [d.title?.trim(), d.subtitle?.trim()].filter(Boolean).join("\n\n");
          if (d.imageUrl?.trim()) await tryDMImage(userId, d.imageUrl.trim());
          if (textParts) await tryDM(userId, textParts);
          break;
        }
        case "lead_form": {
          const q = d.question?.trim(); if (!q) break;
          await tryDM(userId, q);
          break;
        }
      }
    }

    if (!askFollowId || isFollowing) {
      // nodesBeforeAskFollow already sent above; send the after-gate content too
      for (const nodeId of nodesAfterAskFollow) {
        const node = nodeMap.get(nodeId);
        if (!node) continue;
        const d = node.data;
        switch (node.type) {
          case "text_message":
          case "opening_message": {
            const msg = d.text?.trim(); if (!msg) break;
            await tryDM(userId, msg); // open window → plain DM (no comment-anchor header)
            break;
          }
          case "image_message": {
            const url = d.imageUrl?.trim(); if (!url) break;
            await tryDMImage(userId, url);
            break;
          }
          case "card_message": {
            const textParts = [d.title?.trim(), d.subtitle?.trim()].filter(Boolean).join("\n\n");
            if (d.imageUrl?.trim()) await tryDMImage(userId, d.imageUrl.trim());
            if (textParts) await tryDM(userId, textParts);
            break;
          }
          case "lead_form": {
            const q = d.question?.trim(); if (!q) break;
            await tryDM(userId, q);
            break;
          }
        }
      }
      publish({ type: "log", level: "info", msg: `automation button resume: content sent to @${username ?? userId}`, ts: Date.now() });
    } else {
      // Not following — send gate message with button, park rest in followPending
      const gateNode = nodeMap.get(askFollowId!);
      const isFollowGate = gateNode?.type === "follow_gate";
      const defaultMsg = isFollowGate
        ? `Oops 👀 You're not following yet!\n\nFollow @[username] then tap below ⬇️`
        : `Follow @[username] to get exclusive access 🙏`;
      const template = gateNode?.data.text?.trim() || defaultMsg;
      const msg = template.replace(/\[username\]/gi, account.username);
      const confirmLabel = gateNode?.data.buttons?.[0]?.label?.trim() || "I'm following ✓";
      const templateButtons = [
        { type: "web_url" as const, title: "Visit Profile", url: `https://www.instagram.com/${account.username}` },
        { type: "postback" as const, title: confirmLabel, payload: "done" },
      ];
      await tryDMWithButtonTemplate(userId, msg, templateButtons);

      await parkPending(acct, "follow", {
        automationId: p.automationId,
        commentId: p.commentId,
        fromUserId: userId,
        fromUsername: username,
        remainingNodeIds: nodesAfterAskFollow,
        ts: Date.now(),
      });
      publish({ type: "log", level: "info", msg: `automation button resume: @${username ?? userId} not following — gate msg sent (${gateNode?.type ?? "ask_follow"}), follow gate armed`, ts: Date.now() });
    }
  }
  return true;
}

/**
 * Called when a user follows. Checks automationFollowPending for any
 * gates waiting on this user → sends the remaining nodes.
 */
export async function resumeAutomationAfterFollow(
  userId: string,
  username?: string,
  accountId?: string
): Promise<boolean> {
  const acct = await resolveAccountId(accountId);
  if (!acct) return false;
  // Atomic claim in Postgres — dedups one-per-automation, deletes this user's
  // follow rows; prevents webhook + watcher DM poll double-processing one follow.
  const claimed = await claimPending(acct, "follow", userId, 24 * 60 * 60_000);
  if (!claimed.length) return false;
  const account = await loadAccount(acct);
  if (!account) return false;
  if (!(await automationSendAllowed(acct, userId, username))) return false;

  for (const p of claimed) {
    const automation = await getAutomation(acct, p.automationId);
    if (!automation?.enabled) continue;

    const nodeMap = new Map(automation.nodes.map((n) => [n.id, n]));

    // Real-time O(1) check via is_user_follow_business. Returns false on error.
    const nowFollowing = await checkFollowStatus(userId, account.accessToken);

    if (!nowFollowing) {
      // Still not following — resend ask_follow with buttons and re-park pending
      const uname = account.username;
      const gateMsg = `Hmm, looks like you haven't followed @${uname} yet 👀\n\nHit Follow on the profile then tap "I'm following ✓" below!`;
      const retryButtons = [
        { type: "web_url" as const, title: "Visit Profile", url: `https://www.instagram.com/${uname}` },
        { type: "postback" as const, title: "I'm following ✓", payload: "done" },
      ];
      await tryDMWithButtonTemplate(userId, gateMsg, retryButtons);
      // Re-park so next tap triggers another check
      await parkPending(acct, "follow", { ...p, fromUsername: username, ts: Date.now() });
      continue;
    }

    // Following confirmed — execute remaining nodes
    const successMsg = `You're in! 🎉 Sending it now…`;
    await tryDM(userId, successMsg);

    // Execute remaining nodes in order
    for (const nodeId of p.remainingNodeIds) {
      const node = nodeMap.get(nodeId);
      if (!node) continue;
      const d = node.data;

      switch (node.type) {
        case "text_message":
        case "opening_message": {
          const msg = d.text?.trim(); if (!msg) break;
          await tryDM(userId, msg); // open window → plain DM (no comment-anchor header)
          break;
        }
        case "image_message": {
          const url = d.imageUrl?.trim(); if (!url) break;
          await tryDMImage(userId, url);
          break;
        }
        case "card_message": {
          const textParts = [d.title?.trim(), d.subtitle?.trim()].filter(Boolean).join("\n\n");
          if (d.imageUrl?.trim()) await tryDMImage(userId, d.imageUrl.trim());
          if (textParts) await tryDM(userId, textParts);
          break;
        }
        case "lead_form": {
          const q = d.question?.trim(); if (!q) break;
          await tryDM(userId, q);
          break;
        }
        case "followup_message": {
          const msg = d.text?.trim(); if (!msg || !d.delayMinutes) break;
          await enqueueOutbound({
            accountId: acct,
            id: `auto_resume_${p.automationId}_${userId}_fu`,
            type: p.commentId ? "private_reply" : "dm",
            recipient: p.commentId ? { comment_id: p.commentId } : { id: userId },
            message: { text: msg },
            igsid: userId,
          }, d.delayMinutes! * 60_000);
          break;
        }
      }
    }

    publish({
      type: "log",
      level: "info",
      msg: `automation follow_gate resumed for @${username ?? userId}`,
      ts: Date.now(),
    });
  }
  return true;
}

/* ---------- rate-limit retry (613) ---------- */

const RETRY_BACKOFF_MS = 15 * 60_000;

/** Park an automation that was rate-limited mid-flow, to resume from its
 *  remaining nodes once the backoff window clears. One entry per user+automation. */
async function parkAutomationRetry(
  accountId: string,
  automationId: string,
  event: AutomationEvent,
  remainingNodeIds: string[]
): Promise<void> {
  await parkPending(accountId, "retry", {
    automationId,
    commentId: event.commentId,
    fromUserId: event.fromUserId,
    fromUsername: event.fromUsername,
    remainingNodeIds,
    notBefore: Date.now() + RETRY_BACKOFF_MS,
    attempts: 1,
    ts: Date.now(),
  });
}

/** Drain due rate-limit retries — re-run each parked automation from its
 *  remaining nodes via executeAutomation's resumeFrom path (full reuse, no
 *  duplicated node logic). Called from the watcher tick / api service loop. */
export async function drainAutomationRetries(accountId?: string): Promise<void> {
  const acct = await resolveAccountId(accountId);
  if (!acct) return;
  const due = await claimDueRetries(acct, Date.now());
  if (!due.length) return;

  for (const p of due) {
    const automation = await getAutomation(acct, p.automationId);
    if (!automation?.enabled) continue;
    const event: AutomationEvent = {
      type: automation.trigger.type,
      commentId: p.commentId,
      fromUserId: p.fromUserId,
      fromUsername: p.fromUsername,
      text: "",
    };
    publish({ type: "log", level: "info", msg: `automation "${automation.name}": retrying ${p.remainingNodeIds.length} parked node(s) for @${p.fromUsername ?? p.fromUserId}`, ts: Date.now() });
    await executeAutomation(automation, event, { resumeFrom: p.remainingNodeIds, accountId: acct }).catch((e) =>
      publish({ type: "log", level: "error", msg: `automation retry [${p.automationId}]: ${String(e)}`, ts: Date.now() })
    );
  }
}
