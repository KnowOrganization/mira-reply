// recallFact tenant-safety guard. The fix (A1 of the memory-system audit)
// changed recallFact to take the caller's already-loaded `facts` array instead
// of reading the store ambiently (which fell back to "newest account" and
// leaked the wrong tenant's brain). These cases assert recall operates ONLY on
// the passed facts and respects scope — and they hit recallFact's early-return
// paths, so they need no Ollama/LLM and stay deterministic.
import { test, expect, describe } from "bun:test";
import { recallFact } from "../../lib/ig/knowledge";
import type { Fact } from "../../lib/ig/store";

const fact = (over: Partial<Fact>): Fact =>
  ({
    id: "f1",
    question: "do you ship to canada",
    answer: "yes, free over $80",
    topic: "shop",
    scope: "account",
    aliases: [],
    hitCount: 0,
    confidence: 1,
    durable: true,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  }) as Fact;

describe("recallFact tenant safety", () => {
  test("empty facts → null (proves no ambient store read)", async () => {
    expect(await recallFact("anything at all", undefined, [])).toBeNull();
  });

  test("empty query → null", async () => {
    expect(await recallFact("   ", undefined, [fact({})])).toBeNull();
  });

  test("post-scoped fact for a different post is not a candidate → null", async () => {
    const f = fact({ scope: "post", postId: "POST_B" });
    // querying in the context of POST_A: f is filtered out, leaving no
    // candidates, so recall returns before any embed/keyword work.
    expect(await recallFact("do you ship to canada", "POST_A", [f])).toBeNull();
  });

  test("expired fact is not a candidate → null", async () => {
    const f = fact({ expiresAt: 1 }); // expired (before now)
    expect(await recallFact("do you ship to canada", undefined, [f])).toBeNull();
  });
});
