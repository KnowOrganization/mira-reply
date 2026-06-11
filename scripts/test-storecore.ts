// Verifies the Drizzle store engine round-trips against Supabase WITHOUT touching
// the live brain. Run: MIRA_STORE=drizzle bun --env-file=.env.local scripts/test-storecore.ts
import { readStore, updateStore } from "../lib/ig/store";
import { assembleStore } from "../lib/ig/storeDb";
import { currentAccountId } from "../lib/ig/accountsRepo";
import { query } from "../lib/ig/pg";

let fails = 0;
const ok = (n: string, c: boolean) => { console.log(`${c ? "✓" : "✗ FAIL"} ${n}`); if (!c) fails++; };

const acct = (await currentAccountId())!;
console.log("account:", acct);

// 1. assemble reconstructs the store from Drizzle
const s1 = await readStore(); // MIRA_STORE=drizzle → assembleStore
ok("account hydrated", s1.account?.igUserId === acct && s1.account.username === "dstrails");
ok("posts loaded (46)", Object.keys(s1.posts).length === 46);
ok("knowledge loaded (20)", s1.knowledge.length === 20);
ok("history loaded (1000)", s1.history.length === 1000);
ok("commenters loaded (373)", Object.keys(s1.commenters).length === 373);
ok("comments_cache loaded (5000)", s1.commentsCache.length === 5000);
ok("settings present", typeof s1.settings.replyMode === "string");

// 2. mutate: add a test knowledge fact + bump a folded field (toneSummary)
const testId = "__sc_test_" + Date.now();
const marker = "STORECORE_TEST_" + Date.now();
await updateStore((s) => ({
  ...s,
  toneSummary: marker,
  knowledge: [...s.knowledge, {
    id: testId, question: "q", answer: "a", topic: "general", scope: "account",
    aliases: [], hitCount: 0, confidence: 1, durable: true, createdAt: Date.now(), updatedAt: Date.now(),
  } as never],
}));

// 3. fresh assemble (bypasses cache → real DB) proves persistence
const s2 = await assembleStore(acct);
ok("knowledge persisted (+1 = 21)", s2.knowledge.length === 21);
ok("test fact present", s2.knowledge.some((f) => f.id === testId));
ok("folded field (toneSummary) persisted", s2.toneSummary === marker);
ok("big collections intact (history still 1000)", s2.history.length === 1000);
ok("comments_cache intact (5000)", s2.commentsCache.length === 5000);

// 3b. exercise the INSERT path of the other hot brain-write collections
const hId = "__sc_h_" + Date.now();
const cId = "__sc_c_" + Date.now();
const dId = "__sc_d_" + Date.now();
const day = "2099-01-01";
await updateStore((s) => ({
  ...s,
  history: [...s.history, { id: hId, kind: "comment", inbound: "in", outbound: "out", intent: "x", sentAt: Date.now(), status: "sent" } as never],
  pendingDrafts: [...s.pendingDrafts, { id: dId, kind: "comment", threadOrMediaId: "t", fromUserId: "u", inboundText: "i", draftText: "d", intent: "x", createdAt: Date.now() } as never],
  commenters: { ...s.commenters, [cId]: { igUserId: cId, username: "tester", firstSeenAt: Date.now(), lastSeenAt: Date.now(), commentCount: 1, repliedCount: 0, themes: ["t"] } as never },
  dailyStats: { ...s.dailyStats, [day]: { date: day, comments: 1, autoReplied: 0, drafted: 0, sent: 0, dmSent: 0, factsLearned: 0, clarificationsResolved: 0 } as never },
}));
const sx = await assembleStore(acct);
ok("history insert persisted (1001)", sx.history.length === 1001 && sx.history.some((h) => h.id === hId));
ok("draft insert persisted", sx.pendingDrafts.some((d) => d.id === dId));
ok("commenter insert persisted", !!sx.commenters[cId] && sx.commenters[cId].username === "tester");
ok("daily_stat insert persisted", !!sx.dailyStats[day]);
// cleanup those
await updateStore((s) => {
  const commenters = { ...s.commenters }; delete commenters[cId];
  const dailyStats = { ...s.dailyStats }; delete dailyStats[day];
  return { ...s, history: s.history.filter((h) => h.id !== hId), pendingDrafts: s.pendingDrafts.filter((d) => d.id !== dId), commenters, dailyStats };
});
const sy = await assembleStore(acct);
ok("all test rows cleaned (history 1000)", sy.history.length === 1000 && !sy.commenters[cId] && !sy.dailyStats[day]);

// 4. delete via updateStore round-trips
await updateStore((s) => ({ ...s, knowledge: s.knowledge.filter((f) => f.id !== testId) }));
const s3 = await assembleStore(acct);
ok("knowledge back to 20 after delete", s3.knowledge.length === 20);

// cleanup folded field (restore empty toneSummary)
await query("UPDATE accounts SET tone_summary='' WHERE ig_user_id=$1", [acct]);
await query("DELETE FROM knowledge WHERE id=$1", [testId]); // belt-and-suspenders

console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
