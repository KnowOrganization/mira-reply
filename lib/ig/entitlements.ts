// Plan entitlements seam. A single place that maps an org's plan -> limits, so
// when billing arrives it's a data change here (or a `plans` table) — every
// connect/invite/send already routes through these helpers.
//
// Values are deliberately generous (non-breaking): enforcement plumbing is live
// today, real tier numbers land with billing. Caps can only TIGHTEN actual
// behavior (we take min with the account's own setting), never loosen it.
import { query } from "@shaiz/db";

export type Plan = "free" | "pro" | "agency";
export type Entitlements = { maxAccounts: number; maxSeats: number; dailySendCap: number; autonomous: boolean };

const PLANS: Record<Plan, Entitlements> = {
  free:   { maxAccounts: 3,   maxSeats: 3,   dailySendCap: 1000,  autonomous: true },
  pro:    { maxAccounts: 10,  maxSeats: 10,  dailySendCap: 5000,  autonomous: true },
  agency: { maxAccounts: 200, maxSeats: 200, dailySendCap: 20000, autonomous: true },
};

export function entitlementsFor(plan: string | null | undefined): Entitlements {
  return PLANS[(plan as Plan)] ?? PLANS.free;
}

/** Plan daily-send cap for the org that owns an account (Infinity if unknown). */
export async function planDailyCapForAccount(accountId: string): Promise<number> {
  const [r] = await query<{ plan: string | null }>(
    "SELECT o.plan FROM accounts a JOIN organizations o ON o.id = a.org_id WHERE a.ig_user_id = $1",
    [accountId]
  ).catch(() => [] as { plan: string | null }[]);
  if (!r) return Infinity; // legacy / no org -> don't constrain
  return entitlementsFor(r.plan).dailySendCap;
}
