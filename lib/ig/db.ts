import Database from "better-sqlite3";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const DB_PATH = process.env.DATABASE_URL ?? path.join(process.cwd(), "data", "shaiz.db");

const gDb = globalThis as unknown as { __shaiz_db?: Database.Database };

function getDb(): Database.Database {
  if (gDb.__shaiz_db) return gDb.__shaiz_db;
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  gDb.__shaiz_db = db;
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS post_configs (
      id           TEXT PRIMARY KEY,
      ig_post_id   TEXT UNIQUE NOT NULL,
      keywords     TEXT NOT NULL DEFAULT '[]',
      welcome_msg  TEXT NOT NULL DEFAULT '',
      button_label TEXT NOT NULL DEFAULT 'Send me the link 👇',
      follow_gate  INTEGER NOT NULL DEFAULT 1,
      not_following_msg TEXT NOT NULL DEFAULT 'Oops 👀 You''re not following yet!\n\nFollow then tap below ⬇️',
      link_url     TEXT,
      link_msg     TEXT,
      active       INTEGER NOT NULL DEFAULT 1,
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS processed_comments (
      comment_id TEXT PRIMARY KEY,
      igsid      TEXT NOT NULL,
      post_id    TEXT NOT NULL,
      replied_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_states (
      id         TEXT PRIMARY KEY,
      igsid      TEXT NOT NULL,
      post_id    TEXT NOT NULL,
      comment_id TEXT NOT NULL,
      state      TEXT NOT NULL CHECK(state IN ('awaiting_tap','awaiting_follow','delivered')),
      payload    TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(igsid, post_id)
    );
    CREATE INDEX IF NOT EXISTS idx_user_states_igsid ON user_states(igsid);

    CREATE TABLE IF NOT EXISTS message_log (
      id         TEXT PRIMARY KEY,
      direction  TEXT NOT NULL CHECK(direction IN ('in','out')),
      event_type TEXT NOT NULL,
      igsid      TEXT,
      post_id    TEXT,
      payload    TEXT NOT NULL,
      status     TEXT,
      error      TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_message_log_created ON message_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_message_log_igsid ON message_log(igsid);
  `);
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

function rowToConfig(row: Record<string, unknown>): PostConfig {
  return {
    ...(row as Omit<PostConfig, "keywords" | "follow_gate" | "active">),
    keywords: JSON.parse(row.keywords as string),
    follow_gate: (row.follow_gate as number) === 1,
    active: (row.active as number) === 1,
  };
}

export function getPostConfigs(): PostConfig[] {
  const db = getDb();
  return (db.prepare("SELECT * FROM post_configs ORDER BY created_at DESC").all() as Record<string, unknown>[]).map(rowToConfig);
}

export function getPostConfigById(id: string): PostConfig | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM post_configs WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToConfig(row) : null;
}

export function getPostConfigByPostId(igPostId: string): PostConfig | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM post_configs WHERE ig_post_id = ? AND active = 1").get(igPostId) as Record<string, unknown> | undefined;
  return row ? rowToConfig(row) : null;
}

export function createPostConfig(data: Omit<PostConfig, "id" | "created_at" | "updated_at">): PostConfig {
  const db = getDb();
  const now = Date.now();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO post_configs (id, ig_post_id, keywords, welcome_msg, button_label, follow_gate, not_following_msg, link_url, link_msg, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.ig_post_id, JSON.stringify(data.keywords), data.welcome_msg, data.button_label, data.follow_gate ? 1 : 0, data.not_following_msg, data.link_url, data.link_msg, data.active ? 1 : 0, now, now);
  return getPostConfigById(id)!;
}

export function updatePostConfig(id: string, data: Partial<Omit<PostConfig, "id" | "created_at">>): PostConfig | null {
  const db = getDb();
  const existing = getPostConfigById(id);
  if (!existing) return null;
  const merged = { ...existing, ...data, updated_at: Date.now() };
  db.prepare(`
    UPDATE post_configs SET ig_post_id=?, keywords=?, welcome_msg=?, button_label=?, follow_gate=?, not_following_msg=?, link_url=?, link_msg=?, active=?, updated_at=? WHERE id=?
  `).run(merged.ig_post_id, JSON.stringify(merged.keywords), merged.welcome_msg, merged.button_label, merged.follow_gate ? 1 : 0, merged.not_following_msg, merged.link_url, merged.link_msg, merged.active ? 1 : 0, merged.updated_at, id);
  return getPostConfigById(id)!;
}

export function deletePostConfig(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM post_configs WHERE id = ?").run(id);
  return result.changes > 0;
}

// ── ProcessedComments ───────────────────────────────────────────────────────

export function isCommentProcessed(commentId: string): boolean {
  const db = getDb();
  return !!db.prepare("SELECT 1 FROM processed_comments WHERE comment_id = ?").get(commentId);
}

export function markCommentProcessed(commentId: string, igsid: string, postId: string): void {
  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO processed_comments (comment_id, igsid, post_id, replied_at) VALUES (?, ?, ?, ?)")
    .run(commentId, igsid, postId, Date.now());
}

// ── UserStates ──────────────────────────────────────────────────────────────

export type UserState = {
  id: string;
  igsid: string;
  post_id: string;
  comment_id: string;
  state: "awaiting_tap" | "awaiting_follow" | "delivered";
  payload: string | null;
  created_at: number;
  updated_at: number;
};

export function getUserState(igsid: string, postId: string): UserState | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM user_states WHERE igsid = ? AND post_id = ?").get(igsid, postId) as UserState | undefined) ?? null;
}

export function upsertUserState(data: Omit<UserState, "id" | "created_at" | "updated_at"> & { id?: string }): void {
  const db = getDb();
  const now = Date.now();
  db.prepare(`
    INSERT INTO user_states (id, igsid, post_id, comment_id, state, payload, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(igsid, post_id) DO UPDATE SET state=excluded.state, payload=excluded.payload, comment_id=excluded.comment_id, updated_at=excluded.updated_at
  `).run(data.id ?? uuidv4(), data.igsid, data.post_id, data.comment_id, data.state, data.payload ?? null, now, now);
}

export function setUserStateDelivered(igsid: string, postId: string): void {
  const db = getDb();
  db.prepare("UPDATE user_states SET state='delivered', updated_at=? WHERE igsid=? AND post_id=?")
    .run(Date.now(), igsid, postId);
}

// ── MessageLog ──────────────────────────────────────────────────────────────

export type MessageLogEntry = {
  id: string;
  direction: "in" | "out";
  event_type: string;
  igsid: string | null;
  post_id: string | null;
  payload: string;
  status: string | null;
  error: string | null;
  created_at: number;
};

export function insertLog(entry: Omit<MessageLogEntry, "id" | "created_at">): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO message_log (id, direction, event_type, igsid, post_id, payload, status, error, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), entry.direction, entry.event_type, entry.igsid, entry.post_id, entry.payload, entry.status, entry.error, Date.now());
}

export function getRecentLogs(limit = 200): MessageLogEntry[] {
  const db = getDb();
  return db.prepare("SELECT * FROM message_log ORDER BY created_at DESC LIMIT ?").all(limit) as MessageLogEntry[];
}

export function getAutomationStats(postId: string) {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) as n FROM processed_comments WHERE post_id=?").get(postId) as { n: number }).n;
  const delivered = (db.prepare("SELECT COUNT(*) as n FROM user_states WHERE post_id=? AND state='delivered'").get(postId) as { n: number }).n;
  const awaiting = (db.prepare("SELECT COUNT(*) as n FROM user_states WHERE post_id=? AND state!='delivered'").get(postId) as { n: number }).n;
  return { total, delivered, awaiting };
}
