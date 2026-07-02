// The engine executes automations by walking edges only — clients (and the
// API's PATCH fallback) must derive a linear chain from node order. These
// cover the mobile helper; the route fallback uses the same logic inline.
import { test, expect, describe } from "bun:test";
import { deriveLinearEdges } from "../../apps/mobile/src/api/automationGraph";
import type { AutomationNode } from "@shaiz/shared";

const node = (id: string, type: AutomationNode["type"]): AutomationNode => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: {},
});

describe("deriveLinearEdges", () => {
  test("empty → []", () => expect(deriveLinearEdges([])).toEqual([]));

  test("trigger only → []", () =>
    expect(deriveLinearEdges([node("t", "trigger")])).toEqual([]));

  test("trigger + 2 steps → chain in order", () => {
    const edges = deriveLinearEdges([
      node("t", "trigger"),
      node("a", "comment_reply"),
      node("b", "text_message"),
    ]);
    expect(edges).toEqual([
      { id: "e_t_a", source: "t", target: "a" },
      { id: "e_a_b", source: "a", target: "b" },
    ]);
  });

  test("trigger not first → moved to front of the chain", () => {
    const edges = deriveLinearEdges([
      node("a", "text_message"),
      node("t", "trigger"),
      node("b", "lead_form"),
    ]);
    expect(edges[0]).toEqual({ id: "e_t_a", source: "t", target: "a" });
    expect(edges[1]).toEqual({ id: "e_a_b", source: "a", target: "b" });
  });

  test("no trigger node → plain chain over given order", () => {
    const edges = deriveLinearEdges([node("a", "text_message"), node("b", "quiz")]);
    expect(edges).toEqual([{ id: "e_a_b", source: "a", target: "b" }]);
  });
});
