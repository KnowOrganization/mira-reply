// Layer 4.5 — Brain Capability Router.
//
// Reads the perception, decides which brain tools the planner LLM actually
// needs, fetches them in parallel via brain.bundle, returns a compact block
// to inject into the planner prompt.
//
// Goal: planner LLM stays a single call. No tool-use round trips. Brain
// fetches are bounded, parallel, and cached.

import { brain } from "./client";
import type { Perception } from "../perception";

export type DraftInputLite = {
  text: string;
  fromUserId: string;
  postId?: string;
  commentId?: string;
};

export type PrefetchResult = {
  block: string; // human-readable, injectable into the LLM prompt
  kbHit: boolean;
  topFactIds: string[];
  raw: {
    account?: unknown;
    post?: unknown;
    facts?: unknown[];
    commenter?: unknown;
  };
};

/**
 * Decide which brain tools to call for this comment + perception, run them
 * in parallel, return a compact prompt block.
 */
export async function prefetch(
  input: DraftInputLite,
  perception: Perception
): Promise<PrefetchResult> {
  const needs: { tool: string; args?: Record<string, unknown> }[] = [];

  // Always fetch the account voice — it's a one-line cache hit.
  needs.push({ tool: "account.info" });

  // Post context whenever we know the post.
  if (input.postId) needs.push({ tool: "post.get", args: { id: input.postId } });

  // Commenter only when relationship matters — superfan/personal/business.
  const wantCommenter =
    perception.relationship_signal === "personal" ||
    perception.relationship_signal === "business" ||
    perception.relationship_signal === "troll" ||
    perception.relationship_signal === "superfan";
  if (wantCommenter)
    needs.push({
      tool: "commenter.profile",
      args: { igUserId: input.fromUserId },
    });

  // KB search whenever there's a question to answer.
  const wantKb =
    perception.knowledge_gaps.length > 0 ||
    /\?|where|kahan|kaha|kya|how|kaise|what|which|kab|when|why/i.test(
      input.text
    );
  if (wantKb)
    needs.push({
      tool: "kb.search",
      args: {
        query: input.text,
        k: 5,
        scope: "any",
        postId: input.postId,
      },
    });

  // Owner correction recall — always try; cheap when training is empty.
  needs.push({
    tool: "training.similar",
    args: { text: input.text, k: 2 },
  });

  // Thread context only if we know the commentId — prevents contradictions.
  if (input.commentId)
    needs.push({
      tool: "thread.context",
      args: { commentId: input.commentId },
    });

  // Single round-trip fetch.
  const results = (await brain.bundle(needs)) as Array<{
    tool: string;
    ok: boolean;
    result?: unknown;
  }>;

  const byTool: Record<string, unknown> = {};
  for (const r of results) {
    if (r.ok) byTool[r.tool] = r.result;
  }

  const account = byTool["account.info"] as
    | { username?: string; voice?: string; defaultLanguage?: string }
    | undefined;
  const post = byTool["post.get"] as
    | {
        caption?: string;
        notes?: string;
        qa?: { q: string; a: string }[];
        links?: { label: string; url: string }[];
      }
    | undefined;
  const facts = (byTool["kb.search"] as
    | Array<{
        factId: string;
        question: string;
        answer: string;
        score: number;
      }>
    | undefined) || [];
  const commenter = byTool["commenter.profile"] as
    | {
        username?: string;
        relationship?: string;
        themes?: string[];
        lastReplyText?: string;
      }
    | undefined;
  const trainHits = (byTool["training.similar"] as
    | Array<{
        verdict: "good" | "bad";
        correctAction?: "reply" | "ask_owner" | "skip";
        comment: string;
        idealReply?: string;
        askQuestion?: string;
        note?: string;
        score: number;
      }>
    | undefined) || [];
  const thread = byTool["thread.context"] as
    | { ownReplies?: { text: string; ts: number }[] }
    | undefined;

  // KB hit if top fact score above threshold. Tuned for normalized cosine.
  const KB_HIT_THRESHOLD = 0.55;
  const topFact = facts[0];
  const kbHit = !!(topFact && topFact.score >= KB_HIT_THRESHOLD);

  // Build a tight prompt block — only what's present.
  const lines: string[] = ["BRAIN:"];

  if (account?.username) {
    lines.push(
      `• account @${account.username} | voice: ${
        account.voice || "—"
      } | lang: ${account.defaultLanguage || "english"}`
    );
  }

  if (post) {
    if (post.caption) lines.push(`• post caption: ${truncate(post.caption, 200)}`);
    if (post.notes) lines.push(`• owner notes: ${truncate(post.notes, 200)}`);
    if (post.qa && post.qa.length) {
      lines.push(`• post Q&A:`);
      for (const qa of post.qa.slice(0, 4))
        lines.push(`   - Q: ${qa.q} → A: ${qa.a}`);
    }
    if (post.links && post.links.length) {
      lines.push(
        `• post links: ${post.links.map((l) => `${l.label}=${l.url}`).join(" | ")}`
      );
    }
  }

  if (facts.length) {
    lines.push(`• KB matches (top ${facts.length}):`);
    for (const f of facts.slice(0, 5))
      lines.push(
        `   - [${f.score.toFixed(2)}] ${f.question} → ${truncate(f.answer, 140)}`
      );
  } else if (wantKb) {
    lines.push(`• KB matches: none`);
  }

  if (commenter) {
    lines.push(
      `• commenter @${commenter.username || "?"} | ${
        commenter.relationship || "new"
      }${
        commenter.themes && commenter.themes.length
          ? ` | themes: ${commenter.themes.join(", ")}`
          : ""
      }`
    );
    if (commenter.lastReplyText)
      lines.push(
        `• last reply Mira sent them: "${truncate(commenter.lastReplyText, 120)}"`
      );
  }

  if (trainHits.length) {
    const strong = trainHits.filter((t) => t.score >= 0.78);
    if (strong.length) {
      lines.push(`• owner corrections on similar comments:`);
      for (const t of strong.slice(0, 2)) {
        const verdict =
          t.correctAction === "skip"
            ? "→ SKIP"
            : t.correctAction === "ask_owner"
            ? `→ ASK OWNER: ${truncate(t.askQuestion || "", 80)}`
            : t.idealReply
            ? `→ REPLY: ${truncate(t.idealReply, 120)}`
            : "";
        lines.push(
          `   - [${t.score.toFixed(2)}] "${truncate(t.comment, 80)}" ${verdict}${
            t.note ? ` (note: ${truncate(t.note, 80)})` : ""
          }`
        );
      }
    }
  }

  if (thread?.ownReplies && thread.ownReplies.length) {
    lines.push(`• already said on this thread:`);
    for (const r of thread.ownReplies.slice(0, 3))
      lines.push(`   - "${truncate(r.text, 120)}"`);
  }

  return {
    block: lines.join("\n"),
    kbHit,
    topFactIds: facts.map((f) => f.factId),
    raw: {
      account,
      post,
      facts,
      commenter,
    },
  };
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
