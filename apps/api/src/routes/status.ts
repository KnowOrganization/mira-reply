// GET /api/ig/status — now requires a Supabase session and returns ONLY the
// logged-in user's connected Instagram account (or connected:false if none).
import { Elysia } from "elysia";
import { db, accounts, drafts, history, getOnboarding } from "@shaiz/db";
import { eq, count } from "drizzle-orm";
import { authPlugin } from "../plugins/auth";

function isConfigured(): boolean {
  return Boolean(
    process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_WEBHOOK_VERIFY_TOKEN
  );
}

const disconnected = {
  configured: isConfigured(), connected: false, account: null,
  replyMode: "assisted", settings: {}, pendingCount: 0, historyCount: 0, canReconnect: false,
};

export const statusRoute = new Elysia().use(authPlugin).get("/api/ig/status", async ({ auth }) => {
  if (!auth.accountId) return disconnected;

  const [acct] = await db.select().from(accounts).where(eq(accounts.igUserId, auth.accountId));
  if (!acct || !acct.accessToken) return disconnected;

  const [{ value: pendingCount }] = await db.select({ value: count() }).from(drafts).where(eq(drafts.accountId, acct.igUserId));
  const [{ value: historyCount }] = await db.select({ value: count() }).from(history).where(eq(history.accountId, acct.igUserId));
  const onboarding = await getOnboarding(acct.igUserId);

  return {
    configured: isConfigured(),
    connected: true,
    account: {
      username: acct.username, igUserId: acct.igUserId,
      tokenExpiresAt: acct.tokenExpiresAt, connectedAt: acct.connectedAt,
    },
    replyMode: acct.settings?.replyMode ?? "assisted",
    commentMode: acct.settings?.commentMode ?? "assisted",
    dmMode: acct.settings?.dmMode ?? "auto",
    settings: acct.settings ?? {},
    pendingCount, historyCount,
    canReconnect: Boolean(acct.lastToken),
    // Brain-first onboarding: the UI shows the train-brain step until the brain
    // is ready or the owner skipped it.
    onboardingStep: onboarding.step,
    onboardingSkipped: onboarding.skippedAt !== null,
    brainReady: onboarding.brainReady,
    factCount: onboarding.factCount,
  };
}, { auth: true });
