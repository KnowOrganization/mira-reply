// Engine dry-run proof: a linear-edged automation (as mobile/web now save)
// traverses trigger → every step, including the six new funnel executors, and
// emits a DryRunStep per node. dryRun writes nothing. Run:
//   bun scripts/verification-misc/automation-dryrun-check.ts
import { executeAutomation } from "../../lib/ig/automation";
import type { Automation } from "../../lib/ig/store";

const ACCT = "verify_dryrun_acct";

const node = (id: string, type: string, data: Record<string, unknown> = {}) =>
  ({ id, type, position: { x: 0, y: 0 }, data }) as Automation["nodes"][number];

// Only literal-text funnel nodes here — the AI-generated message nodes
// (comment_reply/text_message) need a real account in the store for genMsg.
const nodes = [
  node("t", "trigger", { text: "comment_post" }),
  node("n2", "giveaway", { text: "You're in!", showEntryNumber: true }),
  node("n3", "discount_code", { codePool: ["SAVE10", "SAVE20"] }),
  node("n4", "quiz", { text: "Pick A or B!", answers: [{ match: "giveaway", reply: "A it is!" }] }),
  node("n5", "tag_reward", { minTags: 1, text: "Tag reward unlocked 🎁" }),
  node("n6", "ab_split", { variants: [{ label: "A", text: "Variant A" }, { label: "B", text: "Variant B" }] }),
  node("n7", "price_reply", { text: "DM us for prices!" }),
];
const edges = nodes.slice(0, -1).map((n, i) => ({
  id: `e_${n.id}_${nodes[i + 1].id}`, source: n.id, target: nodes[i + 1].id,
}));

const automation: Automation = {
  id: "verify_dryrun_auto", name: "verify", enabled: true,
  trigger: { type: "comment_post", keywords: [], postIds: [] },
  nodes, edges,
  stats: { triggered: 0, completed: 0, failed: 0 },
  createdAt: Date.now(), updatedAt: Date.now(),
} as Automation;

const steps = await executeAutomation(
  automation,
  { type: "comment_post", commentId: "c_verify", fromUserId: "u_verify", fromUsername: "verifier", text: "giveaway @friend1 pls" },
  { dryRun: true, accountId: ACCT },
);

let failed = 0;
const got = steps.map((s) => s.nodeType);
console.log("steps emitted:", got.join(" → ") || "(none)");
for (const want of ["giveaway", "discount_code", "quiz", "tag_reward", "ab_split", "price_reply"]) {
  const ok = got.includes(want);
  console.log(`  ${ok ? "✓" : "✗"} ${want} executor emitted a step`);
  if (!ok) failed++;
}
// edges-driven traversal proof: no edges → no steps
const inert = await executeAutomation(
  { ...automation, edges: [] },
  { type: "comment_post", commentId: "c_verify2", fromUserId: "u_verify", text: "giveaway" },
  { dryRun: true, accountId: ACCT },
);
const inertOk = inert.length === 0;
console.log(`  ${inertOk ? "✓" : "✗"} empty edges → zero steps (confirms engine is edge-driven)`);
if (!inertOk) failed++;

console.log(failed ? `\n${failed} FAILED` : "\nall dry-run checks passed");
process.exit(failed ? 1 : 0);
