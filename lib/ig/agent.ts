// Chat agent — the owner's command console. Mira can answer questions about
// the account AND take actions: teach facts, answer clarifications, approve
// drafts, change mode. A constrained-JSON tool loop, model-agnostic.

import { chat } from "./llm";
import { readStore, updateStore } from "./store";
import { addFact, listFacts, deleteFact, promoteClarification } from "./knowledge";
import { reprocessClarification, sendDraft } from "./pipeline";
import { serveLinkForPost } from "./links";
import { sanitizeReply } from "./variation";

export type AgentMsg = { role: "system" | "user" | "assistant"; content: string };

const MAX_STEPS = 6;

const TOOL_GUIDE = `You can take actions with tools.

To CALL A TOOL, reply with ONLY a JSON object and nothing else:
{"tool":"tool_name","args":{...}}

To REPLY to the owner, write plain text (never JSON).
After a tool runs you receive its result — then call another tool or reply.

TOOLS:
- add_fact {question, answer, topic} — teach Mira a fact. topic ∈ gear, location, song, personal, shop, general.
- list_facts {} — list everything Mira knows.
- delete_fact {id} — forget a fact.
- list_clarifications {} — comments Mira needs the owner to answer.
- answer_clarification {id, answer} — answer one; it becomes a permanent fact.
- list_drafts {} — replies waiting for approval.
- approve_draft {id} — send a pending draft.
- reject_draft {id} — discard a pending draft.
- set_mode {mode} — mode ∈ shadow, assisted, balanced, auto.
- block_user {username} — stop replying to a commenter.
- get_stats {} — account activity summary.`;

async function buildSnapshot(): Promise<string> {
  const s = await readStore();
  if (!s.account) return "No Instagram account connected.";
  const open = s.clarifications.filter((c) => c.status === "open").length;
  const lines = [
    `Account: @${s.account.username}. Mode: ${s.settings.replyMode}.`,
    `Posts: ${Object.keys(s.posts).length}. Comments cached: ${s.commentsCache.length}.`,
    `Pending drafts: ${s.pendingDrafts.length}. Open clarifications: ${open}.`,
    `Knowledge: ${s.knowledge.length} facts, reused ${s.knowledge.reduce((n, f) => n + f.hitCount, 0)}×.`,
    `Replies sent: ${s.history.filter((h) => h.status === "sent").length}.`,
  ];
  return lines.join("\n");
}

type ToolCall = { tool: string; args: Record<string, unknown> };

/** Parse a tool call from a model turn, or null if it's a plain reply. */
function parseTool(raw: string): ToolCall | null {
  const t = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  if (!t.startsWith("{")) return null;
  try {
    const j = JSON.parse(t) as { tool?: unknown; args?: unknown };
    if (typeof j.tool !== "string") return null;
    return { tool: j.tool, args: (j.args as Record<string, unknown>) || {} };
  } catch {
    return null;
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

async function execTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "add_fact": {
      const question = str(args.question);
      const answer = str(args.answer);
      if (!question || !answer) return "error: question and answer required";
      const topic = str(args.topic) || "general";
      const isLink = /^https?:\/\//i.test(answer.trim());
      const f = await addFact({
        question,
        answer,
        topic: topic as never,
        scope: "account",
        link: isLink ? { url: answer.trim(), label: question } : undefined,
      });
      return `saved fact ${f.id}: "${question}"`;
    }
    case "list_facts": {
      const facts = await listFacts();
      if (!facts.length) return "no facts yet";
      return facts
        .slice(0, 30)
        .map((f) => `[${f.id}] ${f.question} → ${f.answer} (${f.scope}, reused ${f.hitCount}×)`)
        .join("\n");
    }
    case "delete_fact": {
      const id = str(args.id);
      if (!id) return "error: id required";
      await deleteFact(id);
      return `deleted ${id}`;
    }
    case "list_clarifications": {
      const s = await readStore();
      const open = s.clarifications.filter((c) => c.status === "open");
      if (!open.length) return "no open clarifications";
      return open
        .map((c) => `[${c.id}] ${c.kind || "context"} — "${c.commentText}" asks: ${c.question}`)
        .join("\n");
    }
    case "answer_clarification": {
      const id = str(args.id);
      const answer = str(args.answer);
      if (!id || !answer) return "error: id and answer required";
      const s = await readStore();
      const c = s.clarifications.find((x) => x.id === id);
      if (!c) return `error: clarification ${id} not found`;
      await updateStore((st) => ({
        ...st,
        clarifications: st.clarifications.map((x) =>
          x.id === id ? { ...x, status: "answered" as const, answer } : x
        ),
      }));
      if (c.kind === "link" || /^https?:\/\//i.test(answer)) {
        // link answer → attach to that post + serve its waiting comments
        await updateStore((st) => {
          const posts = { ...st.posts };
          const p = c.postId ? posts[c.postId] : undefined;
          if (p) {
            posts[c.postId] = {
              ...p,
              links: [
                ...(p.links || []),
                {
                  id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  label: "link",
                  url: answer.trim(),
                  type: "other" as const,
                },
              ],
              updatedAt: Date.now(),
            };
          }
          return { ...st, posts };
        });
        await serveLinkForPost(c.postId).catch(() => {});
      } else {
        await promoteClarification(c, answer).catch(() => {});
        await reprocessClarification(c).catch(() => {});
      }
      return `answered ${id} — saved as a fact, Mira is re-drafting the reply`;
    }
    case "list_drafts": {
      const s = await readStore();
      if (!s.pendingDrafts.length) return "no pending drafts";
      return s.pendingDrafts
        .slice(0, 20)
        .map((d) => `[${d.id}] @${d.fromUsername || d.fromUserId} "${d.inboundText}" → ${d.draftText}`)
        .join("\n");
    }
    case "approve_draft": {
      const id = str(args.id);
      const s = await readStore();
      const d = s.pendingDrafts.find((x) => x.id === id);
      if (!d) return `error: draft ${id} not found`;
      if (!s.account) return "error: not connected";
      await sendDraft(d, s.account.accessToken, s.account.igUserId);
      return `sent draft ${id}`;
    }
    case "reject_draft": {
      const id = str(args.id);
      await updateStore((s) => ({
        ...s,
        pendingDrafts: s.pendingDrafts.filter((d) => d.id !== id),
      }));
      return `rejected ${id}`;
    }
    case "set_mode": {
      const mode = str(args.mode);
      if (!["shadow", "assisted", "balanced", "auto"].includes(mode))
        return "error: mode must be shadow|assisted|balanced|auto";
      await updateStore((s) => ({
        ...s,
        settings: { ...s.settings, replyMode: mode as never },
      }));
      return `mode set to ${mode}`;
    }
    case "block_user": {
      const username = str(args.username).replace(/^@/, "");
      if (!username) return "error: username required";
      const s = await readStore();
      const match = Object.values(s.commenters).find(
        (c) => c.username.toLowerCase() === username.toLowerCase()
      );
      const id = match?.igUserId || username;
      await updateStore((st) => ({
        ...st,
        blocklist: st.blocklist.includes(id) ? st.blocklist : [...st.blocklist, id],
      }));
      return `blocked ${username}`;
    }
    case "get_stats":
      return await buildSnapshot();
    default:
      return `error: unknown tool "${name}"`;
  }
}

/** Run the agent loop: reason, call tools, return a final reply for the owner. */
export async function runAgent(
  history: AgentMsg[]
): Promise<{ reply: string; actions: string[] }> {
  const snapshot = await buildSnapshot();
  const sys: AgentMsg = {
    role: "system",
    content:
      "You are Mira — the owner's personal AI for their Instagram account. " +
      "Casual, short, human. No corporate tone, no 'as an AI', no em-dashes.\n\n" +
      TOOL_GUIDE +
      "\n\nACCOUNT SNAPSHOT:\n" +
      snapshot,
  };
  const convo: AgentMsg[] = [sys, ...history.filter((m) => m.role !== "system")];
  const actions: string[] = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    const raw = await chat(convo, { temperature: 0.4 });
    const call = parseTool(raw);
    if (!call) return { reply: sanitizeReply(raw), actions };

    const result = await execTool(call.tool, call.args).catch(
      (e) => `error: ${e instanceof Error ? e.message : "tool failed"}`
    );
    actions.push(call.tool);
    convo.push({ role: "assistant", content: raw });
    convo.push({ role: "user", content: `TOOL RESULT (${call.tool}):\n${result}` });
  }

  const final = await chat(
    [...convo, { role: "user", content: "Now give me a short plain-text summary." }],
    { temperature: 0.4 }
  );
  return { reply: sanitizeReply(final), actions };
}
