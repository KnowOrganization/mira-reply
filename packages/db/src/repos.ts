// Drizzle repos — the typed data layer Elysia routes (and the worker) call.
// Replaces the per-route raw SQL / file-store access during the strangler port.
// Single-account for now: currentAccountId() returns the connected account;
// every function takes accountId so multi-account is a later no-op.
import { eq, and, desc, count, sql as rawSql } from "drizzle-orm";
import { db } from "./client";
import {
  accounts, automations, postConfigs, processedComments, userStates, knowledge, products,
  deviceTokens, moderationRules, moderationLog, scheduledPosts,
  funnelEntries, discountCodes, abAssignments, productInterest, commenters, conversations,
} from "./schema";
import type { ProductVariant } from "./schema";
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

export async function getAccessToken(accountId: string): Promise<string | null> {
  const [a] = await db.select({ token: accounts.accessToken }).from(accounts).where(eq(accounts.igUserId, accountId));
  return a?.token ?? null;
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

// ── brain build timestamp ────────────────────────────────────────────────────
export async function getBrainBuiltAt(accountId: string): Promise<number | null> {
  const [a] = await db.select({ at: accounts.brainBuiltAt }).from(accounts).where(eq(accounts.igUserId, accountId));
  return a?.at ?? null;
}

export async function setBrainBuiltAt(accountId: string, at: number): Promise<void> {
  await db.update(accounts).set({ brainBuiltAt: at, updatedAt: Date.now() }).where(eq(accounts.igUserId, accountId));
}

// ── ai settings ──────────────────────────────────────────────────────────────
// model is derived from provider + env defaults (not stored per-account).
const aiModelFor = (): string =>
  process.env.NIM_MODELS?.split(",")[0]?.trim() || "meta/llama-3.1-405b-instruct";

export type AiSettings = {
  provider: "nim";
  byokKeySet: boolean;
  model: string;
  voice: { toneSummary: string; styleSampleCount: number };
};

export async function getAiSettings(accountId: string): Promise<AiSettings | null> {
  const [a] = await db
    .select({
      byokKey: accounts.byokKey,
      toneSummary: accounts.toneSummary,
      styleSamples: accounts.styleSamples,
    })
    .from(accounts)
    .where(eq(accounts.igUserId, accountId));
  if (!a) return null;
  return {
    provider: "nim",
    byokKeySet: !!a.byokKey,
    model: aiModelFor(),
    voice: { toneSummary: a.toneSummary ?? "", styleSampleCount: (a.styleSamples ?? []).length },
  };
}

export async function patchAiSettings(
  accountId: string,
  patch: { provider?: string; byokKey?: string | null }
): Promise<AiSettings | null> {
  const set: Record<string, unknown> = { updatedAt: Date.now(), aiProvider: "nim" };
  // null/"" clears the key; any other string stores it.
  if (patch.byokKey !== undefined) set.byokKey = patch.byokKey ? patch.byokKey : null;
  await db.update(accounts).set(set).where(eq(accounts.igUserId, accountId));
  return getAiSettings(accountId);
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

// ── products (DM marketplace catalog) ────────────────────────────────────────
type ProductRow = typeof products.$inferSelect;
export type ProductApi = {
  id: string; title: string; subtitle: string; description: string;
  priceText: string | null; imageUrl: string | null; images: string[]; variants: ProductVariant[]; ctaUrl: string | null;
  available: boolean; featured: boolean; aliases: string[]; slug: string | null; sortOrder: number;
  createdAt: number; updatedAt: number;
};
function toProductApi(r: ProductRow): ProductApi {
  return {
    id: r.id, title: r.title, subtitle: r.subtitle, description: r.description,
    priceText: r.priceText, imageUrl: r.imageUrl, images: r.images, variants: r.variants, ctaUrl: r.ctaUrl,
    available: r.available, featured: r.featured, aliases: r.aliases, slug: r.slug, sortOrder: r.sortOrder,
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  };
}

export async function listProducts(accountId: string): Promise<ProductApi[]> {
  const rows = await db.select().from(products).where(eq(products.accountId, accountId)).orderBy(products.sortOrder, desc(products.createdAt));
  return rows.map(toProductApi);
}

export async function getProduct(accountId: string, id: string): Promise<ProductApi | null> {
  const [r] = await db.select().from(products).where(and(eq(products.accountId, accountId), eq(products.id, id)));
  return r ? toProductApi(r) : null;
}

export async function createProduct(accountId: string, input: Partial<ProductApi> & { title: string }): Promise<ProductApi> {
  const now = Date.now();
  const row = {
    id: crypto.randomUUID(), accountId, title: input.title,
    subtitle: input.subtitle ?? "", description: input.description ?? "",
    priceText: input.priceText ?? null, imageUrl: input.imageUrl ?? null,
    images: input.images ?? [], variants: input.variants ?? [], ctaUrl: input.ctaUrl ?? null,
    available: input.available ?? true, featured: input.featured ?? false, aliases: input.aliases ?? [],
    embedding: null, slug: input.slug ?? null, sortOrder: input.sortOrder ?? 0,
    createdAt: now, updatedAt: now,
  };
  await db.insert(products).values(row);
  return toProductApi(row as ProductRow);
}

export async function updateProduct(accountId: string, id: string, patch: Partial<ProductApi>): Promise<ProductApi | null> {
  const existing = await getProduct(accountId, id);
  if (!existing) return null;
  const set: Partial<ProductRow> = { updatedAt: Date.now() };
  if (patch.title !== undefined) set.title = patch.title;
  if (patch.subtitle !== undefined) set.subtitle = patch.subtitle;
  if (patch.description !== undefined) set.description = patch.description;
  if (patch.priceText !== undefined) set.priceText = patch.priceText;
  if (patch.imageUrl !== undefined) set.imageUrl = patch.imageUrl;
  if (patch.images !== undefined) set.images = patch.images;
  if (patch.variants !== undefined) set.variants = patch.variants;
  if (patch.ctaUrl !== undefined) set.ctaUrl = patch.ctaUrl;
  if (patch.available !== undefined) set.available = patch.available;
  if (patch.featured !== undefined) set.featured = patch.featured;
  if (patch.aliases !== undefined) set.aliases = patch.aliases;
  if (patch.slug !== undefined) set.slug = patch.slug;
  if (patch.sortOrder !== undefined) set.sortOrder = patch.sortOrder;
  await db.update(products).set(set).where(and(eq(products.accountId, accountId), eq(products.id, id)));
  return getProduct(accountId, id);
}

export async function deleteProduct(accountId: string, id: string): Promise<boolean> {
  const rows = await db.delete(products).where(and(eq(products.accountId, accountId), eq(products.id, id))).returning({ id: products.id });
  return rows.length > 0;
}

// ── push device tokens ───────────────────────────────────────────────────────
export async function registerDeviceToken(
  userId: string, token: string, platform: string, accountId: string | null
): Promise<void> {
  await db.insert(deviceTokens)
    .values({ token, userId, accountId, platform, createdAt: Date.now() })
    .onConflictDoUpdate({ target: deviceTokens.token, set: { userId, accountId, platform } });
}

export async function unregisterDeviceToken(token: string): Promise<boolean> {
  const rows = await db.delete(deviceTokens).where(eq(deviceTokens.token, token)).returning({ token: deviceTokens.token });
  return rows.length > 0;
}

export async function getUserDeviceTokens(userId: string): Promise<string[]> {
  const rows = await db.select({ token: deviceTokens.token }).from(deviceTokens).where(eq(deviceTokens.userId, userId));
  return rows.map((r) => r.token);
}

// ── Guard: moderation rules (auto-flag categories + keyword blocklist) ──────
export type ModRuleApi = { id: string; type: string; pattern: string; action: string; enabled: boolean; createdAt: number };
function toModRule(r: typeof moderationRules.$inferSelect): ModRuleApi {
  return { id: r.id, type: r.type, pattern: r.pattern, action: r.action, enabled: r.enabled, createdAt: r.createdAt };
}

export async function listModerationRules(accountId: string, onlyEnabled = false): Promise<ModRuleApi[]> {
  const rows = await db.select().from(moderationRules)
    .where(onlyEnabled ? and(eq(moderationRules.accountId, accountId), eq(moderationRules.enabled, true)) : eq(moderationRules.accountId, accountId))
    .orderBy(desc(moderationRules.createdAt));
  return rows.map(toModRule);
}

export async function createModerationRule(accountId: string, input: { type: string; pattern?: string; action?: string }): Promise<ModRuleApi> {
  const row = {
    id: crypto.randomUUID(), accountId, type: input.type,
    pattern: input.pattern ?? "", action: input.action ?? "flag", enabled: true,
    createdAt: Date.now(),
  };
  await db.insert(moderationRules).values(row);
  return toModRule(row as typeof moderationRules.$inferSelect);
}

export async function updateModerationRule(
  accountId: string, id: string, patch: Partial<{ pattern: string; action: string; enabled: boolean }>
): Promise<ModRuleApi | null> {
  await db.update(moderationRules).set(patch).where(and(eq(moderationRules.accountId, accountId), eq(moderationRules.id, id)));
  const [r] = await db.select().from(moderationRules).where(and(eq(moderationRules.accountId, accountId), eq(moderationRules.id, id)));
  return r ? toModRule(r) : null;
}

export async function deleteModerationRule(accountId: string, id: string): Promise<boolean> {
  const rows = await db.delete(moderationRules).where(and(eq(moderationRules.accountId, accountId), eq(moderationRules.id, id))).returning({ id: moderationRules.id });
  return rows.length > 0;
}

// Guard: Blocklist segment — local-only block list (IG Graph has no business
// block endpoint; lib/ig + apps/api/src/routes/moderation.ts already own the
// POST/DELETE add/remove). This adds the missing read side, enriched with the
// commenter's last-known username where we've seen them before.
export type BlockedUserRow = { igUserId: string; username: string | null };
export async function listBlockedUsers(accountId: string): Promise<BlockedUserRow[]> {
  const [a] = await db.select({ blocklist: accounts.blocklist }).from(accounts).where(eq(accounts.igUserId, accountId));
  const ids = a?.blocklist ?? [];
  if (!ids.length) return [];
  const rows = await db.select({ igUserId: commenters.igUserId, username: commenters.username })
    .from(commenters).where(eq(commenters.accountId, accountId));
  const byId = new Map(rows.map((r) => [r.igUserId, r.username]));
  return ids.map((id) => ({ igUserId: id, username: byId.get(id) || null }));
}

// Crisis kill-switch rides the flat Settings jsonb (same pattern as storefront*).
export async function setCrisisMode(accountId: string, armed: boolean): Promise<void> {
  await patchSettings(accountId, { crisisArmed: armed });
}
export async function getCrisisMode(accountId: string): Promise<boolean> {
  const s = await getSettings(accountId);
  return !!s?.crisisArmed;
}

// ── Guard: moderation log (flagged-item queue + resolved actions) ───────────
export type ModLogEntryApi = { id: number; commentId: string; text: string; fromUserId: string; fromUsername: string | null; ruleType: string; action: string; status: string; ts: number };
function toModLog(r: typeof moderationLog.$inferSelect): ModLogEntryApi {
  return { id: r.id, commentId: r.commentId, text: r.text, fromUserId: r.fromUserId, fromUsername: r.fromUsername, ruleType: r.ruleType, action: r.action, status: r.status, ts: r.ts };
}

export async function insertModerationLog(accountId: string, e: {
  commentId: string; text: string; fromUserId: string; fromUsername?: string | null; ruleType: string; action: string; status?: string;
}): Promise<ModLogEntryApi> {
  const row = {
    accountId, commentId: e.commentId, text: e.text, fromUserId: e.fromUserId,
    fromUsername: e.fromUsername ?? null, ruleType: e.ruleType, action: e.action,
    status: e.status ?? "pending", ts: Date.now(),
  };
  const [r] = await db.insert(moderationLog).values(row).returning();
  return toModLog(r);
}

export async function listModerationLog(accountId: string, limit = 200): Promise<ModLogEntryApi[]> {
  const rows = await db.select().from(moderationLog).where(eq(moderationLog.accountId, accountId)).orderBy(desc(moderationLog.ts)).limit(limit);
  return rows.map(toModLog);
}

export async function getModerationLogItem(accountId: string, id: number): Promise<ModLogEntryApi | null> {
  const [r] = await db.select().from(moderationLog).where(and(eq(moderationLog.accountId, accountId), eq(moderationLog.id, id)));
  return r ? toModLog(r) : null;
}

export async function listFlaggedModeration(accountId: string): Promise<ModLogEntryApi[]> {
  const rows = await db.select().from(moderationLog)
    .where(and(eq(moderationLog.accountId, accountId), eq(moderationLog.status, "pending")))
    .orderBy(desc(moderationLog.ts));
  return rows.map(toModLog);
}

export async function resolveModerationItem(accountId: string, id: number, action: string): Promise<ModLogEntryApi | null> {
  await db.update(moderationLog).set({ action, status: "resolved" }).where(and(eq(moderationLog.accountId, accountId), eq(moderationLog.id, id)));
  return getModerationLogItem(accountId, id);
}

export async function markModerationLogReverted(accountId: string, id: number): Promise<void> {
  await db.update(moderationLog).set({ status: "pending" }).where(and(eq(moderationLog.accountId, accountId), eq(moderationLog.id, id)));
}

// ── Conversational Inbox AI: ice-breakers + persistent menu ──────────────────
export type IceBreakerRow = { question: string; payload: string };
export type MenuItemRow = { title: string; type: "postback" | "web_url"; payload?: string; url?: string };

export async function getIceBreakers(accountId: string): Promise<IceBreakerRow[]> {
  const [a] = await db.select({ v: accounts.iceBreakers }).from(accounts).where(eq(accounts.igUserId, accountId));
  return a?.v ?? [];
}
export async function setIceBreakers(accountId: string, rows: IceBreakerRow[]): Promise<void> {
  await db.update(accounts).set({ iceBreakers: rows, updatedAt: Date.now() }).where(eq(accounts.igUserId, accountId));
}
export async function getPersistentMenu(accountId: string): Promise<MenuItemRow[]> {
  const [a] = await db.select({ v: accounts.persistentMenu }).from(accounts).where(eq(accounts.igUserId, accountId));
  return a?.v ?? [];
}
export async function setPersistentMenu(accountId: string, rows: MenuItemRow[]): Promise<void> {
  await db.update(accounts).set({ persistentMenu: rows, updatedAt: Date.now() }).where(eq(accounts.igUserId, accountId));
}

// ── Commerce: back-in-stock waitlist ─────────────────────────────────────────
export type ProductInterestRow = { id: number; productId: string; igsid: string; username: string | null; notifiedAt: number | null; createdAt: number };
function toInterest(r: typeof productInterest.$inferSelect): ProductInterestRow {
  return { id: r.id, productId: r.productId, igsid: r.igsid, username: r.username, notifiedAt: r.notifiedAt, createdAt: r.createdAt };
}

export async function recordProductInterest(accountId: string, e: { productId: string; igsid: string; username?: string }): Promise<void> {
  await db.insert(productInterest)
    .values({ accountId, productId: e.productId, igsid: e.igsid, username: e.username ?? null, createdAt: Date.now() })
    .onConflictDoNothing();
}

export async function listProductInterest(accountId: string, productId?: string): Promise<ProductInterestRow[]> {
  const rows = await db.select().from(productInterest)
    .where(productId ? and(eq(productInterest.accountId, accountId), eq(productInterest.productId, productId)) : eq(productInterest.accountId, accountId))
    .orderBy(desc(productInterest.createdAt));
  return rows.map(toInterest);
}

export async function listUnnotifiedInterest(accountId: string, productId: string): Promise<ProductInterestRow[]> {
  const rows = await db.select().from(productInterest).where(
    and(eq(productInterest.accountId, accountId), eq(productInterest.productId, productId), rawSql`${productInterest.notifiedAt} is null`)
  );
  return rows.map(toInterest);
}

export async function markInterestNotified(accountId: string, productId: string): Promise<void> {
  await db.update(productInterest).set({ notifiedAt: Date.now() })
    .where(and(eq(productInterest.accountId, accountId), eq(productInterest.productId, productId)));
}

export async function interestCounts(accountId: string): Promise<Record<string, { waiting: number; notified: number }>> {
  const rows = await db.select().from(productInterest).where(eq(productInterest.accountId, accountId));
  const out: Record<string, { waiting: number; notified: number }> = {};
  for (const r of rows) {
    const bucket = (out[r.productId] ??= { waiting: 0, notified: 0 });
    if (r.notifiedAt) bucket.notified++; else bucket.waiting++;
  }
  return out;
}

// ── Publishing: scheduled / published posts ──────────────────────────────────
export type ScheduledPostApi = { id: string; caption: string; imageUrl: string | null; videoUrl: string | null; mediaType: string; scheduledAt: number; status: string; mediaId: string | null; error: string | null; createdAt: number };
function toScheduledPost(r: typeof scheduledPosts.$inferSelect): ScheduledPostApi {
  return { id: r.id, caption: r.caption, imageUrl: r.imageUrl, videoUrl: r.videoUrl, mediaType: r.mediaType, scheduledAt: r.scheduledAt, status: r.status, mediaId: r.mediaId, error: r.error, createdAt: r.createdAt };
}

export async function createScheduledPost(accountId: string, input: { caption?: string; imageUrl?: string; videoUrl?: string; mediaType?: string; scheduledAt?: number }): Promise<ScheduledPostApi> {
  const row = {
    id: crypto.randomUUID(), accountId, caption: input.caption ?? "",
    imageUrl: input.imageUrl ?? null, videoUrl: input.videoUrl ?? null,
    mediaType: input.mediaType ?? "IMAGE", scheduledAt: input.scheduledAt ?? Date.now(),
    status: "scheduled", mediaId: null, error: null, createdAt: Date.now(),
  };
  await db.insert(scheduledPosts).values(row);
  return toScheduledPost(row as typeof scheduledPosts.$inferSelect);
}

export async function listScheduledPosts(accountId: string): Promise<ScheduledPostApi[]> {
  const rows = await db.select().from(scheduledPosts).where(eq(scheduledPosts.accountId, accountId)).orderBy(desc(scheduledPosts.scheduledAt));
  return rows.map(toScheduledPost);
}

export async function deleteScheduledPost(accountId: string, id: string): Promise<boolean> {
  const rows = await db.delete(scheduledPosts).where(and(eq(scheduledPosts.accountId, accountId), eq(scheduledPosts.id, id))).returning({ id: scheduledPosts.id });
  return rows.length > 0;
}

export async function dueScheduledPosts(accountId: string, now: number): Promise<ScheduledPostApi[]> {
  const rows = await db.select().from(scheduledPosts).where(
    and(eq(scheduledPosts.accountId, accountId), eq(scheduledPosts.status, "scheduled"), rawSql`${scheduledPosts.scheduledAt} <= ${now}`)
  );
  return rows.map(toScheduledPost);
}

export async function markScheduledPublished(accountId: string, id: string, mediaId: string): Promise<void> {
  await db.update(scheduledPosts).set({ status: "published", mediaId }).where(and(eq(scheduledPosts.accountId, accountId), eq(scheduledPosts.id, id)));
}

export async function markScheduledFailed(accountId: string, id: string, error: string): Promise<void> {
  await db.update(scheduledPosts).set({ status: "failed", error }).where(and(eq(scheduledPosts.accountId, accountId), eq(scheduledPosts.id, id)));
}

// ── Funnel Studio: giveaway entries / discount codes / A-B results ──────────
export type FunnelEntryApi = { id: number; entryNumber: number; fromUserId: string; fromUsername: string | null; won: boolean; createdAt: number };
function toFunnelEntry(r: typeof funnelEntries.$inferSelect): FunnelEntryApi {
  return { id: r.id, entryNumber: r.entryNumber, fromUserId: r.fromUserId, fromUsername: r.fromUsername, won: r.won, createdAt: r.createdAt };
}

export async function recordFunnelEntry(accountId: string, automationId: string, e: { fromUserId: string; fromUsername?: string }): Promise<FunnelEntryApi> {
  const [{ value: n }] = await db.select({ value: count() }).from(funnelEntries).where(and(eq(funnelEntries.accountId, accountId), eq(funnelEntries.automationId, automationId)));
  const row = {
    accountId, automationId, entryNumber: n + 1, fromUserId: e.fromUserId,
    fromUsername: e.fromUsername ?? null, won: false, createdAt: Date.now(),
  };
  const [r] = await db.insert(funnelEntries).values(row).onConflictDoNothing().returning();
  if (r) return toFunnelEntry(r);
  const [existing] = await db.select().from(funnelEntries).where(and(eq(funnelEntries.automationId, automationId), eq(funnelEntries.fromUserId, e.fromUserId)));
  return toFunnelEntry(existing);
}

export async function listFunnelEntries(accountId: string, automationId: string): Promise<FunnelEntryApi[]> {
  const rows = await db.select().from(funnelEntries).where(and(eq(funnelEntries.accountId, accountId), eq(funnelEntries.automationId, automationId))).orderBy(funnelEntries.entryNumber);
  return rows.map(toFunnelEntry);
}

export async function drawFunnelWinner(accountId: string, automationId: string): Promise<FunnelEntryApi | null> {
  const entries = await listFunnelEntries(accountId, automationId);
  const pool = entries.filter((e) => !e.won);
  if (!pool.length) return null;
  const winner = pool[Math.floor(Math.random() * pool.length)];
  await db.update(funnelEntries).set({ won: true }).where(and(eq(funnelEntries.automationId, automationId), eq(funnelEntries.fromUserId, winner.fromUserId)));
  return { ...winner, won: true };
}

export type DiscountCodeApi = { id: number; code: string; issuedTo: string; issuedToUsername: string | null; redeemedAt: number | null; createdAt: number };
function toDiscountCode(r: typeof discountCodes.$inferSelect): DiscountCodeApi {
  return { id: r.id, code: r.code, issuedTo: r.issuedTo, issuedToUsername: r.issuedToUsername, redeemedAt: r.redeemedAt, createdAt: r.createdAt };
}

export async function issueDiscountCode(accountId: string, automationId: string, e: { code: string; issuedTo: string; issuedToUsername?: string }): Promise<DiscountCodeApi> {
  const row = {
    accountId, automationId, code: e.code, issuedTo: e.issuedTo,
    issuedToUsername: e.issuedToUsername ?? null, redeemedAt: null, createdAt: Date.now(),
  };
  const [r] = await db.insert(discountCodes).values(row).returning();
  return toDiscountCode(r);
}

export async function listDiscountCodes(accountId: string, automationId: string): Promise<DiscountCodeApi[]> {
  const rows = await db.select().from(discountCodes).where(and(eq(discountCodes.accountId, accountId), eq(discountCodes.automationId, automationId))).orderBy(desc(discountCodes.createdAt));
  return rows.map(toDiscountCode);
}

export async function redeemDiscountCode(accountId: string, automationId: string, code: string): Promise<boolean> {
  const rows = await db.update(discountCodes).set({ redeemedAt: Date.now() })
    .where(and(eq(discountCodes.accountId, accountId), eq(discountCodes.automationId, automationId), eq(discountCodes.code, code), rawSql`${discountCodes.redeemedAt} is null`))
    .returning({ id: discountCodes.id });
  return rows.length > 0;
}

export async function assignVariant(accountId: string, automationId: string, fromUserId: string): Promise<number> {
  const [existing] = await db.select({ variant: abAssignments.variant }).from(abAssignments)
    .where(and(eq(abAssignments.automationId, automationId), eq(abAssignments.fromUserId, fromUserId)));
  if (existing) return existing.variant;
  const variant = Math.random() < 0.5 ? 0 : 1;
  await db.insert(abAssignments).values({ accountId, automationId, fromUserId, variant, converted: false, createdAt: Date.now() }).onConflictDoNothing();
  return variant;
}

export async function markVariantConverted(accountId: string, automationId: string, fromUserId: string): Promise<void> {
  await db.update(abAssignments).set({ converted: true }).where(and(eq(abAssignments.automationId, automationId), eq(abAssignments.fromUserId, fromUserId)));
}

export async function abResults(accountId: string, automationId: string): Promise<{ variant: number; assigned: number; converted: number }[]> {
  const rows = await db.select().from(abAssignments).where(and(eq(abAssignments.accountId, accountId), eq(abAssignments.automationId, automationId)));
  const out = [
    { variant: 0, assigned: 0, converted: 0 },
    { variant: 1, assigned: 0, converted: 0 },
  ];
  for (const r of rows) {
    const bucket = out[r.variant];
    if (!bucket) continue;
    bucket.assigned++;
    if (r.converted) bucket.converted++;
  }
  return out;
}

// ── Contacts — derived from commenters + conversations, no new table ───────
export type ContactRow = {
  igUserId: string; username: string; commentCount: number; repliedCount: number;
  status: "hot" | "warm" | "cold" | "customer"; leadScore: number;
};
export async function listContacts(accountId: string): Promise<ContactRow[]> {
  const rows = await db.select().from(commenters).where(eq(commenters.accountId, accountId)).orderBy(desc(commenters.lastSeenAt));
  const convs = await db.select({ igsid: conversations.igsid, status: conversations.status })
    .from(conversations).where(eq(conversations.accountId, accountId));
  const convByIgsid = new Map(convs.map((c) => [c.igsid, c.status]));
  return rows.map((r) => {
    const leadScore = Math.min(100, r.commentCount * 5 + r.repliedCount * 10);
    const convStatus = convByIgsid.get(r.igUserId);
    const status: ContactRow["status"] =
      convStatus === "needs_human" ? "hot" : leadScore >= 60 ? "warm" : r.repliedCount > 0 ? "customer" : "cold";
    return { igUserId: r.igUserId, username: r.username, commentCount: r.commentCount, repliedCount: r.repliedCount, status, leadScore };
  });
}

// Resolve a public storefront slug → accountId (used by the unauthenticated /api/store route).
// Scans accounts.settings.storefrontSlug; returns null if none/unpublished.
export async function getAccountByStorefrontSlug(slug: string): Promise<string | null> {
  const rows = await db.select({ id: accounts.igUserId, settings: accounts.settings }).from(accounts);
  for (const r of rows) {
    const s = r.settings as Settings | null;
    if (s?.storefrontSlug === slug && s?.storefrontEnabled) return r.id;
  }
  return null;
}
