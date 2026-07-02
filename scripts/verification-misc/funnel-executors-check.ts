// Funnel Studio repos round-trip check — proves the DB layer the new engine
// executors call (giveaway/discount_code/ab_split) behaves as the executors
// assume: idempotent entries, no double-issue, sticky variants. Run:
//   bun scripts/verification-misc/funnel-executors-check.ts
// Needs DATABASE_URL (picked up from .env by bun). Cleans up its rows.
import {
  recordFunnelEntry, listFunnelEntries, drawFunnelWinner,
  issueDiscountCode, listDiscountCodes, redeemDiscountCode,
  assignVariant, abResults, query,
} from "@shaiz/db";

const ACCT = "verify_funnel_acct";
const AUTO = `verify_funnel_${Date.now().toString(36)}`;

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}

async function cleanup() {
  await query(`delete from funnel_entries where automation_id = $1`, [AUTO]);
  await query(`delete from discount_codes where automation_id = $1`, [AUTO]);
  await query(`delete from ab_assignments where automation_id = $1`, [AUTO]);
}

try {
  console.log("giveaway (recordFunnelEntry):");
  const e1 = await recordFunnelEntry(ACCT, AUTO, { fromUserId: "u1", fromUsername: "alice" });
  check("first entry gets #1", e1.entryNumber === 1, `got #${e1.entryNumber}`);
  const e2 = await recordFunnelEntry(ACCT, AUTO, { fromUserId: "u2", fromUsername: "bob" });
  check("second user gets #2", e2.entryNumber === 2, `got #${e2.entryNumber}`);
  const e1again = await recordFunnelEntry(ACCT, AUTO, { fromUserId: "u1" });
  check("repeat user keeps original entry number (idempotent)", e1again.entryNumber === 1, `got #${e1again.entryNumber}`);
  const entries = await listFunnelEntries(ACCT, AUTO);
  check("listFunnelEntries returns exactly 2", entries.length === 2, `got ${entries.length}`);
  const winner = await drawFunnelWinner(ACCT, AUTO);
  check("drawFunnelWinner returns a winner with won=true", !!winner?.won);

  console.log("discount_code (issue/list/redeem):");
  const c1 = await issueDiscountCode(ACCT, AUTO, { code: "SAVE10", issuedTo: "u1", issuedToUsername: "alice" });
  check("issue returns the code", c1.code === "SAVE10");
  const codes = await listDiscountCodes(ACCT, AUTO);
  check("listDiscountCodes shows the issued code", codes.some((c) => c.code === "SAVE10" && c.issuedTo === "u1"));
  const r1 = await redeemDiscountCode(ACCT, AUTO, "SAVE10");
  check("first redeem succeeds", r1 === true);
  const r2 = await redeemDiscountCode(ACCT, AUTO, "SAVE10");
  check("second redeem of same code fails", r2 === false);
  const r3 = await redeemDiscountCode(ACCT, AUTO, "NOPE");
  check("redeeming an unknown code fails", r3 === false);

  console.log("ab_split (assignVariant/abResults):");
  const v1 = await assignVariant(ACCT, AUTO, "u1");
  const v1again = await assignVariant(ACCT, AUTO, "u1");
  check("variant is 0 or 1", v1 === 0 || v1 === 1, `got ${v1}`);
  check("variant is sticky per user", v1 === v1again, `${v1} then ${v1again}`);
  await assignVariant(ACCT, AUTO, "u2");
  const ab = await abResults(ACCT, AUTO);
  const totalAssigned = ab.reduce((s, r) => s + r.assigned, 0);
  check("abResults buckets both users", totalAssigned === 2, `assigned=${totalAssigned}`);
  check("abResults has variant 0 and 1 buckets", ab.length === 2 && ab[0].variant === 0 && ab[1].variant === 1);
} finally {
  await cleanup();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
