import { initSchema, query } from "@/lib/ig/pg";
import { claimOnce, redis, k } from "@/lib/ig/redis";

async function main() {
  await initSchema();
  const tables = await query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
  );
  console.log("PG tables:", tables.map((t) => t.tablename).join(", "));

  const key = k.seen("test_acct", "c_" + Date.now());
  const first = await claimOnce(key, 30);
  const second = await claimOnce(key, 30);
  console.log("claimOnce first:", first, "second:", second, "(want true, false)");

  await redis.quit();
  const { pool } = await import("@/lib/ig/pg");
  await pool.end();
  console.log("OK");
}
main().catch((e) => { console.error("FAIL", e); process.exit(1); });
