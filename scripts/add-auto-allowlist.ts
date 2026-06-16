// add-auto-allowlist.ts — add a contact (by username) to the operating account's
// dmAutoAllowlist so Mira auto-replies to THAT thread, like dstrails. Adds the
// username AND, if they've already DM'd, their igsid (the reliable match key).
// Run: MIRA_STORE=drizzle bun --env-file=.env.local scripts/add-auto-allowlist.ts moknoworg
import { currentAccountId } from "../lib/ig/accountsRepo";
import { query } from "../lib/ig/pg";
import { getSettings, patchSettings } from "../packages/db/src/repos";

async function main() {
  const username = (process.argv[2] || "moknoworg").replace(/^@/, "");
  const acct = await currentAccountId();
  if (!acct) {
    console.error("No connected account.");
    process.exit(1);
  }

  const settings = await getSettings(acct);
  const cur: string[] = (settings?.dmAutoAllowlist as string[] | undefined) ?? [];

  // resolve igsid from anywhere this person has been seen (DM, comment, mention,
  // draft…). from_user_id / igsid is the IG-scoped sender id — the only key the
  // DM allowlist can match on (the DM webhook carries no username).
  const rows = await query<{ src: string; id: string }>(
    `SELECT 'conversations' src, igsid id FROM conversations WHERE lower(username)=lower($1) AND igsid <> ''
     UNION SELECT 'commenters', ig_user_id FROM commenters WHERE lower(username)=lower($1)
     UNION SELECT 'comments_cache', from_user_id FROM comments_cache WHERE lower(from_username)=lower($1)
     UNION SELECT 'drafts', from_user_id FROM drafts WHERE lower(from_username)=lower($1)
     UNION SELECT 'clarifications', from_user_id FROM clarifications WHERE lower(from_username)=lower($1)
     UNION SELECT 'mentions', from_user_id FROM mentions WHERE lower(from_username)=lower($1)
     UNION SELECT 'pending_resume', from_user_id FROM pending_resume WHERE lower(from_username)=lower($1)`,
    [username]
  ).catch((e) => {
    console.error("lookup error:", String(e));
    return [] as { src: string; id: string }[];
  });
  if (rows.length) console.log("igsid candidates:", JSON.stringify(rows));
  const igsid = rows.find((r) => r.id && r.id.length > 0)?.id;

  const next = new Set(cur);
  next.add(username);
  if (igsid) next.add(igsid);

  await patchSettings(acct, { dmAutoAllowlist: [...next] });

  console.log(`Account: ${acct}`);
  console.log(`Added @${username}${igsid ? ` (igsid ${igsid})` : " (igsid not found — username-only until they DM)"}`);
  console.log(`dmAutoAllowlist now:`, JSON.stringify([...next]));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
