// Iterative brain tool-use loop. Opt-in for low-confidence / ambiguous
// comments. Single LLM round per hop, max 2 extra hops after the first plan
// attempt. Each hop the LLM either requests more brain calls or emits the
// final plan.
//
// JSON contract (Ollama JSON mode):
//   { "needs": [{ "tool": "...", "args": {...} }] }
//   { "plan": { "steps": [...], "rationale": "..." } }
// Pipeline parses, runs needs through brain.bundle, feeds back as a
// "brain_result" system message, asks again.

import { chatJSON } from "../llm";
import { brain } from "./client";
import type { ToolCall } from "./brain";
import type { ActionPlan } from "../planner";

type Msg = { role: "system" | "user" | "assistant"; content: string };
type Hop = { needs?: ToolCall[]; plan?: ActionPlan };

const MAX_HOPS = 2; // 1 initial + 2 extra

export async function planWithLoop(
  systemPrompt: string,
  userPrompt: string,
  fallback: ActionPlan
): Promise<ActionPlan> {
  const tools = brain
    .tools()
    .map((t) => `- ${t.name}: ${t.description}`)
    .join("\n");

  const sys =
    systemPrompt +
    "\n\nBRAIN TOOLS (request more data before deciding):\n" +
    tools +
    "\n\nResponse format (JSON only):\n" +
    '{ "needs": [{ "tool": "kb.search", "args": { "query": "..." } }] }   ← to fetch more data\n' +
    '{ "plan": { "steps": [{ "tool": "reply", "args": {...} }], "rationale": "..." } }   ← when ready\n' +
    "\nPick ONE of those two shapes. Do not invent tools. Max 3 extra fetches across the whole conversation.";

  const msgs: Msg[] = [
    { role: "system", content: sys },
    { role: "user", content: userPrompt },
  ];

  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const out = await chatJSON<Hop>(msgs, {} as Hop, 0.2);

    if (out.plan && Array.isArray(out.plan.steps) && out.plan.steps.length) {
      return {
        steps: out.plan.steps,
        rationale: out.plan.rationale || `Loop plan @hop${hop}`,
      };
    }

    if (
      hop < MAX_HOPS &&
      out.needs &&
      Array.isArray(out.needs) &&
      out.needs.length
    ) {
      // cap fan-out per hop so a confused LLM can't burn budget
      const calls = out.needs.slice(0, 4);
      const results = await brain.bundle(calls);
      // feed back as a compact JSON blob
      msgs.push({
        role: "assistant",
        content: JSON.stringify({ needs: calls }),
      });
      msgs.push({
        role: "user",
        content:
          "brain_result:\n" +
          JSON.stringify(results, null, 2) +
          "\n\nNow emit { plan: { steps: [...], rationale } } — no more needs.",
      });
      continue;
    }

    break; // shape unrecognized → fallback
  }
  return fallback;
}
