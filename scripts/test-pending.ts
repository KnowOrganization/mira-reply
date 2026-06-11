// Verifies the Postgres/Redis automation-state layer (lib/ig/pending.ts +
// Redis dedup) WITHOUT any Instagram sends. Run: bun --env-file=.env.local scripts/test-pending.ts
import { parkPending, claimPending, claimDueRetries, bumpAutomationStats } from "../lib/ig/pending";
import { claimOnce, k, redis } from "../lib/ig/redis";
import { currentAccountId } from "../lib/ig/accountsRepo";
import { query } from "../lib/ig/pg";

let fails = 0;
function ok(name: string, cond: boolean) { console.log(`${cond ? "✓" : "✗ FAIL"} ${name}`); if (!cond) fails++; }

const acct = (await currentAccountId())!;
console.log("account:", acct);
const U = `__test_${Date.now()}`;

// 1. dedup (claimOnce k.fired) — first claims, second blocked
const f1 = await claimOnce(k.fired(acct, "autoX", "cmtA"), 3600);
const f2 = await claimOnce(k.fired(acct, "autoX", "cmtA"), 3600);
ok("dedup: first claim true", f1 === true);
ok("dedup: second claim false", f2 === false);

// 2. parkPending replace (same user+automation+kind → one row, latest wins)
await parkPending(acct, "button", { automationId: "autoX", commentId: "c1", fromUserId: U, remainingNodeIds: ["n1", "n2"], ts: Date.now() });
await parkPending(acct, "button", { automationId: "autoX", commentId: "c2", fromUserId: U, remainingNodeIds: ["n3"], ts: Date.now() + 5 });
const rows = await query<{ n: string }>("SELECT count(*)::int as n FROM pending_resume WHERE account_id=$1 AND from_user_id=$2 AND kind='button'", [acct, U]);
ok("park replace: exactly 1 button row", Number((rows[0] as any).n) === 1);

// 3. claimPending: returns latest, deletes all of user's button rows
const claimed = await claimPending(acct, "button", U, 24 * 3600 * 1000);
ok("claim: 1 entry returned", claimed.length === 1);
ok("claim: latest remaining nodes [n3]", JSON.stringify(claimed[0]?.remainingNodeIds) === JSON.stringify(["n3"]));
const claimedAgain = await claimPending(acct, "button", U, 24 * 3600 * 1000);
ok("claim: second claim empty (deleted)", claimedAgain.length === 0);

// 4. claimPending window: stale entry (old ts) excluded
await parkPending(acct, "button", { automationId: "autoX", commentId: "c", fromUserId: U, remainingNodeIds: ["x"], ts: Date.now() - 100000 });
const staleClaim = await claimPending(acct, "button", U, 1000); // 1s window
ok("claim window: stale entry excluded", staleClaim.length === 0);

// 5. retry due vs not-due
await parkPending(acct, "retry", { automationId: "autoDue", commentId: "c", fromUserId: U, remainingNodeIds: ["n"], notBefore: Date.now() - 1000, ts: Date.now() });
await parkPending(acct, "retry", { automationId: "autoLater", commentId: "c", fromUserId: U + "2", remainingNodeIds: ["n"], notBefore: Date.now() + 9_000_000, ts: Date.now() });
const due = await claimDueRetries(acct, Date.now());
ok("retry: exactly 1 due claimed", due.length === 1 && due[0].automationId === "autoDue");
const stillThere = await query<{ n: string }>("SELECT count(*)::int as n FROM pending_resume WHERE kind='retry' AND from_user_id=$1", [acct ? U + "2" : ""]);
ok("retry: not-due row remains", Number((stillThere[0] as any).n) === 1);

// 6. bumpAutomationStats on a real automation
const [a] = await query<{ id: string; stats: any }>("SELECT id, stats FROM automations WHERE account_id=$1 LIMIT 1", [acct]);
const before = Number(a.stats?.triggered ?? 0);
await bumpAutomationStats(a.id, { triggered: 1, lastTriggered: Date.now() });
const [a2] = await query<{ stats: any }>("SELECT stats FROM automations WHERE id=$1", [a.id]);
ok("stats: triggered incremented", Number(a2.stats?.triggered ?? 0) === before + 1);

// cleanup
await query("DELETE FROM pending_resume WHERE from_user_id IN ($1,$2)", [U, U + "2"]);
await query("UPDATE automations SET stats = jsonb_set(stats, '{triggered}', to_jsonb($2::int)) WHERE id=$1", [a.id, before]);
await redis.del(k.fired(acct, "autoX", "cmtA"));

console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
