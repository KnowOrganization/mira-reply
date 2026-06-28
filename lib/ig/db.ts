// Post-config funnel store — now Postgres (Supabase), async. Replaces the old
// better-sqlite3 local DB (which didn't run under Bun and diverged from the
// Supabase funnel). Same exported names/types as before, but async. account_id
// is auto-stamped from the single connected account for the legacy webhook path.
import { v4 as uuidv4 } from "uuid";
import { query } from "@shaiz/db";
import { currentAccountId } from "./accountsRepo";

async function acct(): Promise<string> {
  return (await currentAccountId()) ?? "";
}

// ── PostConfig ──────────────────────────────────────────────────────────────
export type PostConfig = {
  id: string;
  ig_post_id: string;
  keywords: string[];
  welcome_msg: string;
  button_label: string;
  follow_gate: boolean;
  not_following_msg: string;
  link_url: string | null;
  link_msg: string | null;
  active: boolean;
  created_at: number;
  updated_at: number;
};

type ConfigRow = {
  id: string; ig_post_id: string; keywords: string[]; welcome_msg: string; button_label: string;
  follow_gate: boolean; not_following_msg: string; link_url: string | null; link_msg: string | null;
  active: boolean; created_at: string; updated_at: string;
};
function rowToConfig(r: ConfigRow): PostConfig {
  return {
    id: r.id, ig_post_id: r.ig_post_id, keywords: r.keywords ?? [], welcome_msg: r.welcome_msg,
    button_label: r.button_label, follow_gate: r.follow_gate, not_following_msg: r.not_following_msg,
    link_url: r.link_url, link_msg: r.link_msg, active: r.active,
    created_at: Number(r.created_at), updated_at: Number(r.updated_at),
  };
}

export async function getPostConfigs(): Promise<PostConfig[]> {
  const rows = await query<ConfigRow>("SELECT * FROM post_configs ORDER BY created_at DESC");
  return rows.map(rowToConfig);
}

export async function getPostConfigById(id: string): Promise<PostConfig | null> {
  const rows = await query<ConfigRow>("SELECT * FROM post_configs WHERE id=$1", [id]);
  return rows[0] ? rowToConfig(rows[0]) : null;
}

export async function getPostConfigByPostId(igPostId: string): Promise<PostConfig | null> {
  const rows = await query<ConfigRow>("SELECT * FROM post_configs WHERE ig_post_id=$1 AND active=true LIMIT 1", [igPostId]);
  return rows[0] ? rowToConfig(rows[0]) : null;
}

export async function createPostConfig(data: Omit<PostConfig, "id" | "created_at" | "updated_at">): Promise<PostConfig> {
  const now = Date.now();
  const id = uuidv4();
  await query(
    `INSERT INTO post_configs (id, account_id, ig_post_id, keywords, welcome_msg, button_label, follow_gate, not_following_msg, link_url, link_msg, active, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [id, await acct(), data.ig_post_id, JSON.stringify(data.keywords), data.welcome_msg, data.button_label,
     data.follow_gate, data.not_following_msg, data.link_url, data.link_msg, data.active, now, now]
  );
  return (await getPostConfigById(id))!;
}

export async function updatePostConfig(id: string, data: Partial<Omit<PostConfig, "id" | "created_at">>): Promise<PostConfig | null> {
  const existing = await getPostConfigById(id);
  if (!existing) return null;
  const m = { ...existing, ...data, updated_at: Date.now() };
  await query(
    `UPDATE post_configs SET ig_post_id=$2, keywords=$3, welcome_msg=$4, button_label=$5, follow_gate=$6,
       not_following_msg=$7, link_url=$8, link_msg=$9, active=$10, updated_at=$11 WHERE id=$1`,
    [id, m.ig_post_id, JSON.stringify(m.keywords), m.welcome_msg, m.button_label, m.follow_gate,
     m.not_following_msg, m.link_url, m.link_msg, m.active, m.updated_at]
  );
  return getPostConfigById(id);
}

export async function deletePostConfig(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>("DELETE FROM post_configs WHERE id=$1 RETURNING id", [id]);
  return rows.length > 0;
}

// ── ProcessedComments ────────────────────────────────────────────────────────
export async function isCommentProcessed(commentId: string): Promise<boolean> {
  const rows = await query("SELECT 1 FROM processed_comments WHERE comment_id=$1", [commentId]);
  return rows.length > 0;
}

export async function markCommentProcessed(commentId: string, igsid: string, postId: string): Promise<void> {
  await query(
    `INSERT INTO processed_comments (comment_id, account_id, igsid, post_id, replied_at)
     VALUES ($1,$2,$3,$4,$5) ON CONFLICT (comment_id) DO NOTHING`,
    [commentId, await acct(), igsid, postId, Date.now()]
  );
}

// ── UserStates ────────────────────────────────────────────────────────────────
export type UserState = {
  id: string; igsid: string; post_id: string; comment_id: string;
  state: "awaiting_tap" | "awaiting_follow" | "delivered";
  payload: string | null; created_at: number; updated_at: number;
};

export async function getUserState(igsid: string, postId: string): Promise<UserState | null> {
  const rows = await query<UserState>("SELECT * FROM user_states WHERE igsid=$1 AND post_id=$2", [igsid, postId]);
  return rows[0] ?? null;
}

export async function upsertUserState(data: Omit<UserState, "id" | "created_at" | "updated_at"> & { id?: string }): Promise<void> {
  const now = Date.now();
  await query(
    `INSERT INTO user_states (id, account_id, igsid, post_id, comment_id, state, payload, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (igsid, post_id) DO UPDATE SET state=EXCLUDED.state, payload=EXCLUDED.payload, comment_id=EXCLUDED.comment_id, updated_at=EXCLUDED.updated_at`,
    [data.id ?? uuidv4(), await acct(), data.igsid, data.post_id, data.comment_id, data.state,
     data.payload != null ? JSON.stringify(data.payload) : null, now, now]
  );
}

export async function setUserStateDelivered(igsid: string, postId: string): Promise<void> {
  await query("UPDATE user_states SET state='delivered', updated_at=$3 WHERE igsid=$1 AND post_id=$2", [igsid, postId, Date.now()]);
}

// ── MessageLog ────────────────────────────────────────────────────────────────
export type MessageLogEntry = {
  id: string; direction: "in" | "out"; event_type: string; igsid: string | null;
  post_id: string | null; payload: string; status: string | null; error: string | null; created_at: number;
};

export async function insertLog(entry: Omit<MessageLogEntry, "id" | "created_at">): Promise<void> {
  await query(
    `INSERT INTO message_log (id, account_id, direction, event_type, igsid, post_id, payload, status, error, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [uuidv4(), await acct(), entry.direction, entry.event_type, entry.igsid, entry.post_id,
     typeof entry.payload === "string" ? entry.payload : JSON.stringify(entry.payload), entry.status, entry.error, Date.now()]
  );
}

export async function getRecentLogs(limit = 200): Promise<MessageLogEntry[]> {
  const rows = await query<MessageLogEntry & { created_at: string }>("SELECT * FROM message_log ORDER BY created_at DESC LIMIT $1", [limit]);
  return rows.map((r) => ({ ...r, created_at: Number(r.created_at), payload: typeof r.payload === "string" ? r.payload : JSON.stringify(r.payload) }));
}

export async function getAutomationStats(postId: string): Promise<{ total: number; delivered: number; awaiting: number }> {
  const [t] = await query<{ n: string }>("SELECT COUNT(*)::int as n FROM processed_comments WHERE post_id=$1", [postId]);
  const [d] = await query<{ n: string }>("SELECT COUNT(*)::int as n FROM user_states WHERE post_id=$1 AND state='delivered'", [postId]);
  const [a] = await query<{ n: string }>("SELECT COUNT(*)::int as n FROM user_states WHERE post_id=$1 AND state!='delivered'", [postId]);
  return { total: Number(t?.n ?? 0), delivered: Number(d?.n ?? 0), awaiting: Number(a?.n ?? 0) };
}
