// @ts-nocheck — throwaway verification script (node/bun), not part of the app build
import { query } from "@shaiz/db";
const sess = await query<{column_name:string}>(`SELECT column_name FROM information_schema.columns WHERE table_name='session' ORDER BY ordinal_position`);
console.log("session cols:", sess.map(c=>c.column_name).join(","));
const users = await query(`SELECT u.id, u.email FROM "user" u LIMIT 5`);
console.log("users:", JSON.stringify(users));
const accs = await query(`SELECT ig_user_id, user_id, org_id, username FROM accounts LIMIT 5`);
console.log("accounts:", JSON.stringify(accs));
const om = await query(`SELECT org_id, user_id, role FROM org_members LIMIT 8`);
console.log("org_members:", JSON.stringify(om));
process.exit(0);
