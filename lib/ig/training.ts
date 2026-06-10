// Playground training — the owner approves or corrects Mira's decisions, and
// those examples steer the live reply engine. This is in-context "training":
// no fine-tuning, but the local model reliably mirrors concrete examples of
// how the owner wants comments handled.
//
// A correction captures the ACTION Mira should take (reply / ask the owner /
// stay silent), not just a blob of text — so "ask me, don't guess" is a real,
// honoured instruction, never echoed to a follower.
//
// Matching is SEMANTIC: each trained comment is embedded, so "which bike",
// "what model is this" and "konsa bike hai" all hit the same example. Falls
// back to lexical overlap when the embedding model is unavailable.

import { readStore, updateStore, type TrainingExample } from "./store";
import { similarity } from "./variation";
import { embed, cosine } from "./embed";

const MAX_TRAINING = 500;

// match thresholds
const OVERRIDE_LEXICAL = 0.85; // near-identical wording → apply verdict verbatim
const OVERRIDE_SEMANTIC = 0.9; // same question, different words → apply verbatim
const SOFT_FLOOR = 0.55; // relevant enough to inject as a few-shot example

/** The decision a trained example resolves to. */
export type TrainedMatch =
  | { kind: "reply"; text: string; intent: string }
  | { kind: "clarify"; question: string; intent: string }
  | { kind: "skip"; intent: string };

/** Save a new training example, embedding its comment for semantic recall. */
export async function addTraining(
  e: Omit<TrainingExample, "id" | "createdAt" | "embedding">
): Promise<TrainingExample> {
  const embedding = (await embed(e.comment)) || undefined;
  const entry: TrainingExample = {
    ...e,
    embedding,
    id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  await updateStore((s) => ({
    ...s,
    training: [entry, ...(s.training || [])].slice(0, MAX_TRAINING),
  }));
  return entry;
}

/** All training examples, newest first. */
export async function listTraining(): Promise<TrainingExample[]> {
  const s = await readStore();
  return s.training || [];
}

/** Delete a training example. */
export async function removeTraining(id: string): Promise<void> {
  await updateStore((s) => ({
    ...s,
    training: (s.training || []).filter((t) => t.id !== id),
  }));
}

/** Lexical + semantic score of a query against one example. */
function scoreOf(
  qText: string,
  qEmb: number[] | null,
  e: TrainingExample
): { lex: number; sem: number; best: number } {
  const lex = similarity(qText, e.comment);
  const sem =
    qEmb && e.embedding && e.embedding.length === qEmb.length
      ? cosine(qEmb, e.embedding)
      : 0;
  return { lex, sem, best: Math.max(lex, sem) };
}

/** Resolve one example to the decision it teaches. */
function resolve(e: TrainingExample): TrainedMatch | null {
  // approved → repeat exactly what Mira did
  if (e.verdict === "good") {
    if (e.miraAction === "skip") return { kind: "skip", intent: e.intent };
    if (e.miraAction === "clarify")
      return { kind: "clarify", question: e.miraReply, intent: e.intent };
    const t = (e.miraReply || "").trim();
    return t ? { kind: "reply", text: t, intent: e.intent } : null;
  }
  // corrected → apply the owner's chosen action. Legacy entries (no
  // correctAction) are treated as a plain reply correction.
  const action = e.correctAction || "reply";
  if (action === "skip") return { kind: "skip", intent: e.intent };
  if (action === "ask_owner") {
    const q = (
      e.askQuestion ||
      e.note ||
      "Need your input to answer this comment."
    ).trim();
    return { kind: "clarify", question: q, intent: e.intent };
  }
  const t = (e.idealReply || "").trim();
  return t ? { kind: "reply", text: t, intent: e.intent } : null;
}

/**
 * Find a trained example matching this comment closely enough — same wording
 * OR same meaning — to apply the owner's verdict verbatim. Returns null when
 * nothing is close (buildTrainingBlock's soft guidance still runs then).
 */
export function matchTraining(
  qText: string,
  qEmb: number[] | null,
  all: TrainingExample[]
): TrainedMatch | null {
  let best: TrainingExample | null = null;
  let bestScore = { lex: 0, sem: 0, best: 0 };
  for (const e of all || []) {
    const sc = scoreOf(qText, qEmb, e);
    if (sc.best > bestScore.best) {
      bestScore = sc;
      best = e;
    }
  }
  if (!best) return null;
  if (bestScore.lex < OVERRIDE_LEXICAL && bestScore.sem < OVERRIDE_SEMANTIC)
    return null;
  return resolve(best);
}

/** One-line description of what an example teaches — for the few-shot block. */
function describe(e: TrainingExample): string | null {
  const m = resolve(e);
  if (!m) return null;
  if (m.kind === "skip") return `Comment: "${e.comment}" → do NOT reply, skip it.`;
  if (m.kind === "clarify")
    return `Comment: "${e.comment}" → do NOT guess, ask the owner first.`;
  return `Comment: "${e.comment}" → reply: "${m.text}"`;
}

/**
 * Build the few-shot training block for one comment — the examples most
 * relevant by meaning, so Mira handles a paraphrased comment the trained way
 * even when the strict override threshold is not met.
 */
export function buildTrainingBlock(
  qText: string,
  qEmb: number[] | null,
  all: TrainingExample[]
): string {
  if (!all?.length) return "";
  const ranked = all
    .map((e) => ({ e, score: scoreOf(qText, qEmb, e).best }))
    .filter((r) => r.score >= SOFT_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  if (!ranked.length) return "";

  const lines: string[] = [
    "OWNER-TRAINED EXAMPLES — the owner set these rules for comments that mean the same thing as this one. Follow them exactly:",
  ];
  for (const { e } of ranked) {
    const d = describe(e);
    if (d) lines.push(d);
  }
  const notes = ranked.map((r) => r.e.note?.trim()).filter(Boolean);
  if (notes.length) {
    lines.push("Owner's reasoning (guidance, never send this text):");
    for (const n of notes) lines.push(`- ${n}`);
  }
  return lines.join("\n");
}
