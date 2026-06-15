// Drizzle repos — the typed data layer Elysia routes (and the worker) call.
// Replaces the per-route raw SQL / file-store access during the strangler port.
// Single-account for now: currentAccountId() returns the connected account;
// every function takes accountId so multi-account is a later no-op.
import { eq, and, desc, count } from "drizzle-orm";
import { db } from "./client";
import {
  accounts, automations, postConfigs, processedComments, userStates, knowledge,
} from "./schema";
import type { Settings } from "../../../lib/ig/store";

// ── onboarding / brain readiness ─────────────────────────────────────────────
// Mira stays draft-only until the brain has at least this many facts — keep in
// sync with MIN_BRAIN_FACTS in lib/ig/dmPipeline.ts.
export const MIN_BRAIN_FACTS = 3;

export async function factCount(accountId: string): Promise<number> {
  const [r] = await db.select({ value: count() }).from(knowledge).where(eq(knowledge.accountId, accountId));
  return r?.value ?? 0;
}

export async function getOnboarding(accountId: string): Promise<{ step: string; skippedAt: number | null; brainReady: boolean; factCount: number }> {
  const [a] = await db
    .select({ step: accounts.onboardingStep, skippedAt: accounts.onboardingSkippedAt })
    .from(accounts)
    .where(eq(accounts.igUserId, accountId));
  const facts = await factCount(accountId);
  return {
    step: a?.step ?? "connect",
    skippedAt: a?.skippedAt ?? null,
    brainReady: facts >= MIN_BRAIN_FACTS,
    factCount: facts,
  };
}

export async function setOnboarding(accountId: string, patch: { step?: string; skipped?: boolean }): Promise<void> {
  const set: Record<string, unknown> = { updatedAt: Date.now() };
  if (patch.step !== undefined) set.onboardingStep = patch.step;
  if (patch.skipped) set.onboardingSkippedAt = Date.now();
  await db.update(accounts).set(set).where(eq(accounts.igUserId, accountId));
}

export async function currentAccountId(): Promise<string | null> {
  const [a] = await db
    .select({ id: accounts.igUserId })
    .from(accounts)
    .orderBy(desc(accounts.connectedAt))
    .limit(1);
  return a?.id ?? null;
}

// ── settings ─────────────────────────────────────────────────────────────────
export async function getSettings(accountId: string): Promise<Settings | null> {
  const [a] = await db.select({ settings: accounts.settings }).from(accounts).where(eq(accounts.igUserId, accountId));
  return a?.settings ?? null;
}

export async function patchSettings(accountId: string, patch: Partial<Settings>): Promise<Settings | null> {
  const cur = await getSettings(accountId);
  if (cur === null) return null;
  const merged = { ...cur, ...patch } as Settings;
  await db.update(accounts).set({ settings: merged, updatedAt: Date.now() }).where(eq(accounts.igUserId, accountId));
  return merged;
}

// ── automations (visual node-graph) ──────────────────────────────────────────
type AutomationRow = typeof automations.$inferSelect;
function toAutomation(r: AutomationRow) {
  const { accountId, ...rest } = r;
  return rest; // { id, name, enabled, trigger, nodes, edges, stats, createdAt, updatedAt }
}

export async function listAutomations(accountId: string) {
  const rows = await db.select().from(automations).where(eq(automations.accountId, accountId)).orderBy(desc(automations.createdAt));
  return rows.map(toAutomation);
}

export async function getAutomation(accountId: string, id: string) {
  const [r] = await db.select().from(automations).where(and(eq(automations.accountId, accountId), eq(automations.id, id)));
  return r ? toAutomation(r) : null;
}

export async function insertAutomation(accountId: string, a: AutomationRow) {
  await db.insert(automations).values({ ...a, accountId });
  return toAutomation({ ...a, accountId });
}

export async function patchAutomation(accountId: string, id: string, patch: Partial<AutomationRow>) {
  const existing = await getAutomation(accountId, id);
  if (!existing) return null;
  const next = { ...patch, id, updatedAt: Date.now() };
  await db.update(automations).set(next).where(and(eq(automations.accountId, accountId), eq(automations.id, id)));
  return { ...existing, ...next };
}

export async function removeAutomation(accountId: string, id: string): Promise<boolean> {
  const rows = await db.delete(automations).where(and(eq(automations.accountId, accountId), eq(automations.id, id))).returning({ id: automations.id });
  return rows.length > 0;
}

// ── post-config funnel (snake_case API shape preserved for the frontend) ─────
type PostConfigRow = typeof postConfigs.$inferSelect;
export type PostConfigApi = {
  id: string; ig_post_id: string; keywords: string[]; welcome_msg: string;
  button_label: string; follow_gate: boolean; not_following_msg: string;
  link_url: string | null; link_msg: string | null; active: boolean;
  created_at: number; updated_at: number;
};
function toPostConfigApi(r: PostConfigRow): PostConfigApi {
  return {
    id: r.id, ig_post_id: r.igPostId, keywords: r.keywords, welcome_msg: r.welcomeMsg,
    button_label: r.buttonLabel, follow_gate: r.followGate, not_following_msg: r.notFollowingMsg,
    link_url: r.linkUrl, link_msg: r.linkMsg, active: r.active,
    created_at: r.createdAt, updated_at: r.updatedAt,
  };
}

export async function listPostConfigs(accountId: string): Promise<PostConfigApi[]> {
  const rows = await db.select().from(postConfigs).where(eq(postConfigs.accountId, accountId)).orderBy(desc(postConfigs.createdAt));
  return rows.map(toPostConfigApi);
}

export async function getPostConfig(accountId: string, id: string): Promise<PostConfigApi | null> {
  const [r] = await db.select().from(postConfigs).where(and(eq(postConfigs.accountId, accountId), eq(postConfigs.id, id)));
  return r ? toPostConfigApi(r) : null;
}

export async function createPostConfig(accountId: string, input: Partial<PostConfigApi> & { ig_post_id: string; welcome_msg: string }): Promise<PostConfigApi> {
  const now = Date.now();
  const row = {
    id: crypto.randomUUID(), accountId, igPostId: input.ig_post_id, keywords: input.keywords ?? [],
    welcomeMsg: input.welcome_msg, buttonLabel: input.button_label ?? "Send me the link 👇",
    followGate: input.follow_gate ?? true,
    notFollowingMsg: input.not_following_msg ?? "Oops 👀 You're not following yet!\n\nFollow then tap below ⬇️",
    linkUrl: input.link_url ?? null, linkMsg: input.link_msg ?? null, active: input.active ?? true,
    createdAt: now, updatedAt: now,
  };
  await db.insert(postConfigs).values(row);
  return toPostConfigApi(row as PostConfigRow);
}

export async function updatePostConfig(accountId: string, id: string, patch: Partial<PostConfigApi>): Promise<PostConfigApi | null> {
  const existing = await getPostConfig(accountId, id);
  if (!existing) return null;
  const set: Partial<PostConfigRow> = { updatedAt: Date.now() };
  if (patch.ig_post_id !== undefined) set.igPostId = patch.ig_post_id;
  if (patch.keywords !== undefined) set.keywords = patch.keywords;
  if (patch.welcome_msg !== undefined) set.welcomeMsg = patch.welcome_msg;
  if (patch.button_label !== undefined) set.buttonLabel = patch.button_label;
  if (patch.follow_gate !== undefined) set.followGate = patch.follow_gate;
  if (patch.not_following_msg !== undefined) set.notFollowingMsg = patch.not_following_msg;
  if (patch.link_url !== undefined) set.linkUrl = patch.link_url;
  if (patch.link_msg !== undefined) set.linkMsg = patch.link_msg;
  if (patch.active !== undefined) set.active = patch.active;
  await db.update(postConfigs).set(set).where(and(eq(postConfigs.accountId, accountId), eq(postConfigs.id, id)));
  return getPostConfig(accountId, id);
}

export async function deletePostConfig(accountId: string, id: string): Promise<boolean> {
  const rows = await db.delete(postConfigs).where(and(eq(postConfigs.accountId, accountId), eq(postConfigs.id, id))).returning({ id: postConfigs.id });
  return rows.length > 0;
}

export async function funnelStats(igPostId: string) {
  const proc = await db.select().from(processedComments).where(eq(processedComments.postId, igPostId));
  const states = await db.select({ state: userStates.state }).from(userStates).where(eq(userStates.postId, igPostId));
  const delivered = states.filter((s) => s.state === "delivered").length;
  return { total: proc.length, delivered, awaiting: states.length - delivered };
}
