// Always-reply threshold + per-channel mode logic. Pure functions — no I/O.
import { test, expect, describe } from "bun:test";
import { prefilter } from "../../lib/ig/rulebook";
import { shouldSkipForVariety } from "../../lib/ig/sender";
import { normalizeMode, type Settings } from "../../lib/ig/store";

const ACCT = "mira";

describe("prefilter — alwaysReply", () => {
  test("lone vague word is skipped by default", () => {
    expect(prefilter("ok", ACCT)).toEqual({ action: "skip", reason: "one-word" });
  });
  test("lone vague word passes through when alwaysReply is on", () => {
    expect(prefilter("ok", ACCT, true)).toBeNull();
  });
  test("rulebook skips still apply with alwaysReply (two users chatting)", () => {
    expect(prefilter("@someoneelse lol", ACCT, true)).toEqual({ action: "skip", reason: "tags-other" });
  });
  test("emoji-only still reacts with alwaysReply", () => {
    expect(prefilter("🔥", ACCT, true)).toEqual({ action: "react", reason: "emoji-only" });
  });
});

const settings = (over: Partial<Settings>): Settings =>
  ({
    replyMode: "auto", commentMode: "assisted", dmMode: "auto", alwaysReply: false,
    skipOwnComments: true, autoReplySimpleAcks: true, autoDMLinks: true, cooldownMinutes: 0,
    dailySendCap: 1000, minSecondsBetweenSends: 45, sendJitter: true, selectiveReplyRate: 1,
    uniquenessThreshold: 0.55, ...over,
  });

describe("shouldSkipForVariety", () => {
  test("never skips when alwaysReply is on, even at rate 1", () => {
    expect(shouldSkipForVariety("simple_acknowledgement", settings({ alwaysReply: true }))).toBe(false);
  });
  test("only ever skips simple acks", () => {
    expect(shouldSkipForVariety("question_general", settings({ alwaysReply: false }))).toBe(false);
  });
});

describe("normalizeMode", () => {
  test("balanced folds into auto", () => expect(normalizeMode("balanced")).toBe("auto"));
  test("passes through the three states", () => {
    expect(normalizeMode("shadow")).toBe("shadow");
    expect(normalizeMode("assisted")).toBe("assisted");
    expect(normalizeMode("auto")).toBe("auto");
  });
  test("unknown / undefined defaults to assisted", () => {
    expect(normalizeMode(undefined)).toBe("assisted");
    expect(normalizeMode("whatever")).toBe("assisted");
  });
});
