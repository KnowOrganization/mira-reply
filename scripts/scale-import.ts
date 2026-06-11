import { importFromFileStore, listAccounts, listAutomations } from "@/lib/ig/accountsRepo";
import { pool } from "@/lib/ig/pg";

async function main() {
  const res = await importFromFileStore();
  console.log("imported:", res);
  const accts = await listAccounts();
  for (const a of accts) {
    const autos = await listAutomations(a.igUserId);
    console.log(`account @${a.username} (${a.igUserId}): ${autos.length} automation(s)`);
    for (const au of autos) console.log(`   - ${au.id} "${au.name}" enabled=${au.enabled} nodes=${au.nodes.length}`);
  }
  await pool.end();
}
main().catch((e) => { console.error("FAIL", e); process.exit(1); });
