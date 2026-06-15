// e2e-brain.ts — end-to-end test of the Account Brain create flow that the new
// MCQ interview drives. It composes a representative blob (exactly the shape
// Brain.tsx `Interview.build()` sends: "<question>\n<answer>" pairs), runs the
// SAME `extract` service path the UI hits, and asserts the contract the UI
// depends on: facts get created → the count rises → brain becomes "ready"
// (>= MIN_BRAIN_FACTS) → getOnboarding reflects it. It then DELETES every fact
// it created, so the real account's brain is left exactly as it was.
//
// Runs in-process (no HTTP / auth), against the same Supabase store the worker
// uses. Run:
//   MIRA_STORE=drizzle bun --env-file=.env.local scripts/e2e-brain.ts
import { getBrain, postBrain } from "../apps/api/src/services/analytics-service";
import { getOnboarding, MIN_BRAIN_FACTS } from "../packages/db/src/repos";
import { currentAccountId } from "../lib/ig/accountsRepo";

type Created = { created?: { id: string }[] };

// A representative MCQ run — what a fitness creator's taps + tiny inputs compose
// into. Same format as Interview.build(): one "question\nanswer" block each.
const BLOB = [
  "What's your name, and where are you based?\nName: Test Creator, Based in: Pune, India",
  "What's your account about?\nFitness, Health & Wellness",
  "What do you do or offer here?\nCoaching / consulting, Digital products / courses",
  "Where can people buy, book, or find more?\nWebsite / shop: https://example.com/coach",
  "Open to brand collabs or paid partnerships?\nSelective / depends",
  "What do you create with?\nPhone camera, CapCut",
  "Your personality & content vibe?\nEnergetic, Inspirational",
  "What do followers ask you most?\nHow to start — start with three home workouts a week",
].join("\n\n");

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  const acct = await currentAccountId();
  if (!acct) {
    console.error("No connected account — cannot run. Is the DB reachable / an account connected?");
    process.exit(1);
  }

  const before = await getBrain(acct);
  console.log(`\nAccount: @${before.account?.username ?? "?"} (${acct})`);
  console.log(`Baseline: ${before.total} facts\n`);

  const createdIds: string[] = [];
  try {
    console.log("1) Extract facts from a representative MCQ run (real LLM + addFact path)…");
    const res = (await postBrain({ action: "extract", text: BLOB })) as Created;
    const created = res.created ?? [];
    for (const f of created) if (f?.id) createdIds.push(f.id);
    check("extract created ≥ 1 fact", created.length >= 1, `${created.length} created`);

    console.log("\n2) Count rose + brain reaches ready threshold…");
    const after = await getBrain(acct);
    check(
      "total increased by the number created",
      after.total === before.total + created.length,
      `${before.total} → ${after.total}`
    );
    check(
      `brain ready (total ≥ MIN_BRAIN_FACTS=${MIN_BRAIN_FACTS})`,
      after.total >= MIN_BRAIN_FACTS,
      `total=${after.total}`
    );
    check(
      "facts span multiple areas (UI graph)",
      Object.values(after.byTopic).filter((n) => n > 0).length >= 2,
      `areas=${Object.entries(after.byTopic).filter(([, n]) => n > 0).map(([t]) => t).join(",")}`
    );

    console.log("\n3) getOnboarding reflects readiness (the gate Continue uses)…");
    const onb = await getOnboarding(acct);
    check(
      "onboarding.brainReady matches the count",
      onb.brainReady === after.total >= MIN_BRAIN_FACTS,
      `brainReady=${onb.brainReady}, factCount=${onb.factCount}`
    );
  } finally {
    // Always clean up — leave the real account's brain exactly as we found it.
    console.log(`\n4) Cleanup — deleting ${createdIds.length} test fact(s)…`);
    for (const id of createdIds) {
      await postBrain({ action: "delete", id }).catch((e) => console.log(`  ! delete ${id} failed: ${String(e)}`));
    }
    const restored = await getBrain(acct);
    check(
      "brain restored to baseline (no pollution)",
      restored.total === before.total,
      `${restored.total} (baseline ${before.total})`
    );
  }

  console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("e2e-brain crashed:", e);
  process.exit(1);
});
