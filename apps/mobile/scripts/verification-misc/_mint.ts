// @ts-nocheck — throwaway verification script (node/bun), not part of the app build
import { query } from "@shaiz/db";
import { randomBytes } from "crypto";
const uid = "OU48BBHfUrfbdcf8yWGzqpXPqXXjWIo6";
const token = randomBytes(32).toString("hex");
const id = randomBytes(16).toString("hex");
const exp = new Date(Date.now() + 7*24*3600*1000).toISOString();
await query(
  `INSERT INTO session (id, token, user_id, expires_at, created_at, updated_at)
   VALUES ($1,$2,$3,$4, now(), now())`,
  [id, token, uid, exp]
);
console.log("TOKEN="+token);
process.exit(0);
