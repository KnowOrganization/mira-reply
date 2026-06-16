// Non-destructive: fill display_name for contacts that only show a raw IGSID.
// DM webhooks carry no sender handle, so contacts created from DMs have a null
// display_name. This resolves each via Meta's profile API. Because an IGSID is
// scoped to the account that received the DM (and some rows are currently mis-
// filed across accounts), it tries every connected account's token until one
// resolves. Only ever WRITES display_name — never deletes or moves anything.
//   bun scripts/backfill-contact-names.ts
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function profile(igsid: string, token: string): Promise<string | null> {
  try {
    const r = await fetch(`https://graph.instagram.com/v23.0/${igsid}?fields=name,username&access_token=${token}`);
    const j = (await r.json()) as { name?: string; username?: string; error?: unknown };
    if (j.error) return null;
    return j.username || j.name || null;
  } catch { return null; }
}

async function main() {
  const tokens = (await pool.query(`SELECT username, access_token FROM accounts`)).rows as
    { username: string; access_token: string }[];
  const contacts = (await pool.query(
    `SELECT id, account_id, igsid FROM contacts WHERE display_name IS NULL OR display_name = ''`
  )).rows as { id: string; account_id: string; igsid: string }[];

  console.log(`${contacts.length} contact(s) without a name, ${tokens.length} account token(s) to try\n`);
  let named = 0;
  for (const ct of contacts) {
    // skip synthetic/test igsids that aren't real Instagram users
    if (!/^\d+$/.test(ct.igsid)) { console.log(`  skip ${ct.igsid} (not a real IGSID)`); continue; }
    let label: string | null = null;
    for (const t of tokens) {
      label = await profile(ct.igsid, t.access_token);
      if (label) break;
    }
    if (label) {
      await pool.query(`UPDATE contacts SET display_name = $2 WHERE id = $1`, [ct.id, label]);
      named++;
      console.log(`  ${ct.igsid} → ${label}`);
    } else {
      console.log(`  ${ct.igsid} → (unresolved by any account)`);
    }
  }
  console.log(`\nnamed ${named}/${contacts.length}`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
