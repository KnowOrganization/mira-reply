// Role gate + entitlements — the authorization primitives. Pure functions, no
// DB. If the ranking inverts or a tier loosens silently, these fail.
import { test, expect, describe } from "bun:test";
import { roleAtLeast, canAct, canEnableAutonomous, type Role } from "../../apps/api/src/lib/roles";
import { entitlementsFor } from "../../lib/ig/entitlements";

describe("roleAtLeast", () => {
  test("owner outranks everything", () => {
    for (const r of ["owner", "admin", "agent", "viewer"] as Role[]) expect(roleAtLeast("owner", r)).toBe(true);
  });
  test("viewer meets only viewer", () => {
    expect(roleAtLeast("viewer", "viewer")).toBe(true);
    expect(roleAtLeast("viewer", "agent")).toBe(false);
  });
  test("null (no access) never qualifies", () => {
    expect(roleAtLeast(null, "viewer")).toBe(false);
  });
  test("agent meets agent but not admin", () => {
    expect(roleAtLeast("agent", "agent")).toBe(true);
    expect(roleAtLeast("agent", "admin")).toBe(false);
  });
});

describe("capability gates", () => {
  test("canAct: viewer/none no, agent+ yes", () => {
    expect(canAct("viewer")).toBe(false);
    expect(canAct(null)).toBe(false);
    expect(canAct("agent")).toBe(true);
    expect(canAct("admin")).toBe(true);
  });
  test("canEnableAutonomous: only admin/owner", () => {
    expect(canEnableAutonomous("agent")).toBe(false);
    expect(canEnableAutonomous("admin")).toBe(true);
    expect(canEnableAutonomous("owner")).toBe(true);
  });
});

describe("entitlements", () => {
  test("unknown plan falls back to free", () => {
    expect(entitlementsFor("bogus")).toEqual(entitlementsFor("free"));
    expect(entitlementsFor(null)).toEqual(entitlementsFor("free"));
  });
  test("higher tiers never reduce the daily cap", () => {
    expect(entitlementsFor("pro").dailySendCap).toBeGreaterThanOrEqual(entitlementsFor("free").dailySendCap);
    expect(entitlementsFor("agency").dailySendCap).toBeGreaterThanOrEqual(entitlementsFor("pro").dailySendCap);
  });
});
