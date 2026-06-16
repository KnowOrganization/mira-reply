// Direct test of the opportunity engine (bypasses the BullMQ queue).
//   bun scripts/test-opportunity.ts   (or tsx with --env-file)
import { isOpportunityCandidate, detectOpportunity, recordOpportunity } from "../lib/ig/opportunity";
import { upsertContactAndConversation } from "../lib/ig/crm";
import { query } from "../lib/ig/pg";

const ACCOUNT = process.env.TEST_ACCOUNT || "26872366029122415"; // thedslabs

async function main() {
  let pass = 0, fail = 0;
  const ok = (n: string, c: unknown) => { c ? (pass++, console.log("  ✓", n)) : (fail++, console.log("  ✗", n)); };

  // Stage 0/1 pre-filter (no DB, no LLM)
  console.log("pre-filter:");
  ok("brand-deal text is a candidate", await isOpportunityCandidate("we'd love a paid brand collaboration, budget 50000"));
  ok("rate-card text is a candidate", await isOpportunityCandidate("can you share your rate card for a sponsored reel?"));
  ok("fan text is NOT a candidate", !(await isOpportunityCandidate("omg i love your content so much")));
  ok("greeting is NOT a candidate", !(await isOpportunityCandidate("hii how are you")));

  // full detect (real LLM classify) + dedup
  const igsid = `opp_test_${Date.now()}`;
  const ref = await upsertContactAndConversation(ACCOUNT, igsid, "opp_test_brand", Date.now());
  if (!ref) throw new Error("upsertContactAndConversation returned null for a non-self igsid");
  console.log("\ndetect + record:");
  await detectOpportunity(ACCOUNT, ref.conversationId, igsid, "Hi! We're a skincare brand and want a paid collaboration. Budget ~₹50,000. Open to a brand deal?");
  let rows = await query<{ type: string; confidence: number; value_estimate: number | null; status: string; reason: string | null }>(
    `SELECT type, confidence, value_estimate, status, reason FROM opportunities WHERE conversation_id = $1`, [ref.conversationId]
  );
  ok("opportunity created from brand DM", rows.length === 1);
  if (rows[0]) console.log("    →", rows[0].type, Math.round(rows[0].confidence * 100) + "%", "val=" + rows[0].value_estimate, rows[0].status);

  // dedup: recordOpportunity again for same conversation → still ONE row (upsert)
  await recordOpportunity(ACCOUNT, ref.conversationId, igsid, { type: "brand_deal", confidence: 0.9, value_estimate: 75000 }, "follow-up, higher budget");
  rows = await query(`SELECT type, confidence, value_estimate FROM opportunities WHERE conversation_id = $1`, [ref.conversationId]);
  ok("dedup — still exactly 1 row after 2nd signal", rows.length === 1);
  ok("dedup — value raised to 75000", (rows[0] as { value_estimate: number } | undefined)?.value_estimate === 75000);

  // cleanup test rows
  await query(`DELETE FROM opportunities WHERE conversation_id = $1`, [ref.conversationId]);
  await query(`DELETE FROM messages WHERE conversation_id = $1`, [ref.conversationId]);
  await query(`DELETE FROM conversations WHERE id = $1`, [ref.conversationId]);
  await query(`DELETE FROM contacts WHERE account_id = $1 AND igsid = $2`, [ACCOUNT, igsid]);

  console.log(`\n${pass} passed · ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
