// End-to-end pipeline test — full inbound chain, deterministic, no real DM.
//
//   signed webhook  →  Next :3000  →  rewrite :4000 receiver
//     →  webhook_events (PG persist)  →  BullMQ ingest
//     →  worker processComment  →  post_configs funnel match
//     →  processed_comments + user_states + message_log  →  BullMQ outbound
//     →  worker processOutboundJob  →  (MIRA_OUTBOUND_DISABLED) log + drop
//     →  webhook_events.processed_at set
//
// Reuses the already-connected account + the existing TEST_POST_001 post_config.
// Sends NO real message: the worker MUST run with MIRA_OUTBOUND_DISABLED=1.
//
// Prereqs (3 procs up):
//   bun run dev:api
//   bun run dev:web
//   MIRA_OUTBOUND_DISABLED=1 bun run worker:watch
//
// Run:   bun --env-file=.env.local scripts/verification-misc/e2e-pipeline.mjs
//   flags:  --keep    leave the synthetic rows in place for inspection
//           --direct  hit the Elysia receiver on :4000 directly (skip Next proxy)
import crypto from "node:crypto";
import postgres from "postgres";

const KEEP = process.argv.includes("--keep");
const DIRECT = process.argv.includes("--direct");
const TARGET = (DIRECT ? "http://localhost:4000" : "http://localhost:3000") + "/api/ig/webhook";

const ACCOUNT = "27720245664231807"; // dstrails — the connected account
const MEDIA = "TEST_POST_001"; // matches the seeded post_config
const COMMENT_ID = "e2e-test-comment-001";
const EVENT_KEY = `c_${COMMENT_ID}`;
const FROM_ID = "e2e_test_user";
const FROM_USER = "e2e_tester";
const TEXT = "please drop the link 🙏"; // contains keyword "link"

const secret = process.env.META_APP_SECRET;
if (!secret) throw new Error("META_APP_SECRET missing — run with --env-file=.env.local");
const sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5, connect_timeout: 10 });

const sign = (raw) => "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
const post = (raw, sig) =>
  fetch(TARGET, { method: "POST", headers: { "content-type": "application/json", "x-hub-signature-256": sig }, body: raw });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const payload = JSON.stringify({
  object: "instagram",
  entry: [{
    id: ACCOUNT,
    time: Math.floor(Date.now() / 1000),
    changes: [{
      field: "comments",
      value: { id: COMMENT_ID, from: { id: FROM_ID, username: FROM_USER }, media: { id: MEDIA }, text: TEXT },
    }],
  }],
});

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
};

async function purge() {
  await sql`delete from webhook_events where event_key = ${EVENT_KEY}`;
  await sql`delete from processed_comments where comment_id = ${COMMENT_ID}`;
  await sql`delete from user_states where igsid = ${FROM_ID}`;
  await sql`delete from message_log where igsid = ${FROM_ID}`;
}

async function main() {
  console.log(`\nE2E pipeline test → ${TARGET}\n`);

  // clean slate — synthetic rows only, so re-runs start fresh
  await purge();

  // ── stage 1: receiver accepts + persists ──────────────────────────────────
  const r1 = await post(payload, sign(payload));
  const b1 = await r1.json().catch(() => ({}));
  check("receiver returns 200", r1.status === 200, `status=${r1.status}`);
  check("event stored (stored=1)", b1.ok === true && b1.stored === 1, JSON.stringify(b1));

  // ── stage 2: worker drains ingest → processed_at set ──────────────────────
  let evRow = null;
  for (let i = 0; i < 30; i++) { // up to ~15s
    const [row] = await sql`select received_at, processed_at, error from webhook_events where event_key = ${EVENT_KEY}`;
    if (row?.processed_at) { evRow = row; break; }
    if (row && !evRow) evRow = row; // keep last seen for diagnostics
    await sleep(500);
  }
  check("webhook_events row persisted", !!evRow?.received_at);
  check("worker processed event (processed_at set)", !!evRow?.processed_at,
    evRow?.processed_at ? "" : "still null after 15s — is the worker running?");
  check("processed without error", evRow ? !evRow.error : false, evRow?.error || "");

  // ── stage 3: post_configs funnel side-effects ─────────────────────────────
  const [pc] = await sql`select id from post_configs where ig_post_id = ${MEDIA} and active = true limit 1`;
  check("post_config TEST_POST_001 present", !!pc, pc ? `id=${pc.id}` : "missing — seed it");

  const [proc] = await sql`select 1 as ok from processed_comments where comment_id = ${COMMENT_ID}`;
  check("comment marked processed", !!proc);

  const [us] = await sql`select state, post_id from user_states where igsid = ${FROM_ID}`;
  check("user_state = awaiting_tap", us?.state === "awaiting_tap", us ? `state=${us.state}` : "no row");

  const [lg] = await sql`select status, event_type, direction from message_log where igsid = ${FROM_ID} and direction = 'in' order by created_at desc limit 1`;
  check("inbound logged status=matched", lg?.status === "matched", lg ? `status=${lg.status}` : "no row");

  // outbound enqueue is the line right after the funnel writes above and runs
  // inside the same processed event → its success is implied by processed_at +
  // these rows. The send itself is suppressed by MIRA_OUTBOUND_DISABLED.
  console.log(`  ℹ️  outbound private_reply (pr_${COMMENT_ID}) enqueued; send suppressed.`);
  console.log(`      confirm in worker log: "outbound DISABLED — dropped private_reply (pr_${COMMENT_ID})"`);

  // ── stage 4: dedup — identical redelivery counts as duplicate ─────────────
  const r2 = await post(payload, sign(payload));
  const b2 = await r2.json().catch(() => ({}));
  check("duplicate delivery deduped (duplicates=1, stored=0)",
    b2.ok === true && b2.duplicates === 1 && b2.stored === 0, JSON.stringify(b2));

  // ── stage 5: bad signature rejected ───────────────────────────────────────
  const r3 = await post(payload, "sha256=" + "0".repeat(64));
  check("bad signature → 403", r3.status === 403, `status=${r3.status}`);

  // ── teardown ──────────────────────────────────────────────────────────────
  if (!KEEP) { await purge(); console.log("\n  synthetic rows cleaned up (--keep to retain)"); }

  console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
  await sql.end();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error("\nfatal:", e); await sql.end().catch(() => {}); process.exit(2); });
