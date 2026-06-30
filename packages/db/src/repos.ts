// Drizzle repos — the typed data layer Elysia routes (and the worker) call.
// Replaces the per-route raw SQL / file-store access during the strangler port.
// Single-account for now: currentAccountId() returns the connected account;
// every function takes accountId so multi-account is a later no-op.
import { eq, and, desc, count } from "drizzle-orm";
import { db } from "./client";
import {
  accounts, automations, postConfigs, processedComments, userStates, knowledge, products,
  deviceTokens,
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
  priceText: string | null; imageUrl: string | null; ctaUrl: string | null;
  available: boolean; aliases: string[]; slug: string | null; sortOrder: number;
  createdAt: number; updatedAt: number;
};
function toProductApi(r: ProductRow): ProductApi {
  return {
    id: r.id, title: r.title, subtitle: r.subtitle, description: r.description,
    priceText: r.priceText, imageUrl: r.imageUrl, ctaUrl: r.ctaUrl,
    available: r.available, aliases: r.aliases, slug: r.slug, sortOrder: r.sortOrder,
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
    priceText: input.priceText ?? null, imageUrl: input.imageUrl ?? null, ctaUrl: input.ctaUrl ?? null,
    available: input.available ?? true, aliases: input.aliases ?? [],
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
  if (patch.ctaUrl !== undefined) set.ctaUrl = patch.ctaUrl;
  if (patch.available !== undefined) set.available = patch.available;
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
