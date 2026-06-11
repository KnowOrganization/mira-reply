// Mira's deterministic pre-filter — decides skip/react before the LLM runs.
import { test, expect, describe } from "bun:test";
import { prefilter, firstEmoji } from "../../lib/ig/rulebook";

const ACCT = "mira";

describe("prefilter", () => {
  test("empty comment is skipped", () => {
    expect(prefilter("", ACCT)).toEqual({ action: "skip", reason: "empty" });
  });
  test("emoji-only reacts back", () => {
    expect(prefilter("🔥🔥", ACCT)).toEqual({ action: "react", reason: "emoji-only" });
  });
  test("tagging another user (not us, no recommendation) is skipped", () => {
    expect(prefilter("@someoneelse lol", ACCT)).toEqual({ action: "skip", reason: "tags-other" });
  });
  test("a lone vague word is skipped", () => {
    expect(prefilter("ok", ACCT)).toEqual({ action: "skip", reason: "one-word" });
  });
  test("a one-word question passes through to the pipeline", () => {
    expect(prefilter("Location?", ACCT)).toBeNull();
  });
  test("a normal comment passes through", () => {
    expect(prefilter("love the colour grade on this one", ACCT)).toBeNull();
  });
});

describe("firstEmoji", () => {
  test("returns the first emoji present", () => {
    expect(firstEmoji("wow 😍 great")).toBe("😍");
  });
  test("falls back to a friendly default when none", () => {
    expect(firstEmoji("no emoji here")).toBe("🙌");
  });
});
