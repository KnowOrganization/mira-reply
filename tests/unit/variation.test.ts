// Anti-ban engine — deterministic, no IO. Guards every outbound reply.
import { test, expect, describe } from "bun:test";
import {
  normalize,
  shingles,
  jaccard,
  similarity,
  tooSimilar,
  mostlyWrongLanguage,
  sanitizeReply,
  detectVibe,
} from "../../lib/ig/variation";

describe("normalize", () => {
  test("lowercases, strips punctuation/emoji, collapses space", () => {
    expect(normalize("Hello,   WORLD!!! 🔥")).toBe("hello world");
  });
});

describe("shingles", () => {
  test("trigrams of a sentence", () => {
    expect(shingles("the quick brown fox")).toEqual(["the quick brown", "quick brown fox"]);
  });
  test("fewer than n words collapses to a single joined token", () => {
    expect(shingles("two words")).toEqual(["two words"]);
  });
});

describe("jaccard", () => {
  test("identical sets = 1, disjoint = 0", () => {
    expect(jaccard(["a", "b"], ["a", "b"])).toBe(1);
    expect(jaccard(["a"], ["b"])).toBe(0);
  });
});

describe("similarity / tooSimilar", () => {
  test("exact match is 1", () => {
    expect(similarity("great shot mate", "great shot mate")).toBe(1);
  });
  test("unrelated replies are low", () => {
    expect(similarity("love this colour grade", "where is the gym")).toBeLessThan(0.2);
  });
  test("tooSimilar flags a near-duplicate against recent sends", () => {
    const r = tooSimilar("thanks so much", ["thanks so much"], 0.55);
    expect(r.similar).toBe(true);
    expect(r.worst).toBe(1);
  });
  test("tooSimilar passes a fresh reply", () => {
    const r = tooSimilar("totally different wording here", ["thanks so much"], 0.55);
    expect(r.similar).toBe(false);
  });
});

describe("mostlyWrongLanguage", () => {
  test("flags a reply that came back in the wrong script", () => {
    expect(mostlyWrongLanguage("привет как дела друзья")).toBe(true);
  });
  test("passes English and short strings", () => {
    expect(mostlyWrongLanguage("hello there friend")).toBe(false);
    expect(mostlyWrongLanguage("ok")).toBe(false);
  });
});

describe("sanitizeReply", () => {
  test("strips surrounding quotes", () => {
    expect(sanitizeReply('"hello there"')).toBe("hello there");
  });
  test("caps emoji at one", () => {
    const out = sanitizeReply("love it 🔥🔥🔥");
    expect((out.match(/🔥/gu) || []).length).toBe(1);
  });
  test("de-shouts a multi-word ALL-CAPS slogan", () => {
    expect(sanitizeReply("BUY WITH CONFIDENCE")).toBe("buy with confidence");
  });
  test("leaves a lone acronym alone", () => {
    expect(sanitizeReply("the KTM looks clean")).toBe("the KTM looks clean");
  });
});

describe("detectVibe", () => {
  test("funny", () => expect(detectVibe("hahaha 😂")).toBe("funny"));
  test("critical", () => expect(detectVibe("this is trash honestly")).toBe("critical"));
  test("hype", () => expect(detectVibe("🔥🔥 insane")).toBe("hype"));
  test("question", () => expect(detectVibe("where is this?")).toBe("question"));
  test("chill", () => expect(detectVibe("nice pic")).toBe("chill"));
});
