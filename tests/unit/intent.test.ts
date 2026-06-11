// Deterministic fast-path intent classifier (the LLM only runs when this
// returns null). Covers the shortcuts that must never hit the model.
import { test, expect, describe } from "bun:test";
import { quickClassify } from "../../lib/ig/intent";

describe("quickClassify", () => {
  test("empty → unclear", () => expect(quickClassify("")).toBe("unclear"));
  test("follow-back spam → spam_promo", () => expect(quickClassify("follow back pls")).toBe("spam_promo"));
  test("pure emoji → simple_acknowledgement", () => expect(quickClassify("🔥🔥")).toBe("simple_acknowledgement"));
  test("short praise → simple_acknowledgement", () => expect(quickClassify("wow nice")).toBe("simple_acknowledgement"));
  test("link ask → link_request", () => expect(quickClassify("send link")).toBe("link_request"));
  test("a real question falls through to the LLM (null)", () =>
    expect(quickClassify("what camera did you shoot this on")).toBeNull());
});
