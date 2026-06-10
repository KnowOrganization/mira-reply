import { NextResponse } from "next/server";
import { brain } from "@/lib/ig/mcp/client";

export const runtime = "nodejs";

// Smoke test for the brain MCP — runs each tool, reports timings.
export async function GET() {
  const t = (label: string, fn: () => Promise<unknown>) =>
    fn().then(async (r) => {
      const start = performance.now();
      const out = await fn();
      const ms = +(performance.now() - start).toFixed(2);
      return { tool: label, ms, sample: shape(out) };
    });

  await brain.warm();

  const [acct, kb, bundle] = await Promise.all([
    t("account.info", () => brain.accountInfo()),
    t("kb.search(jacket)", () => brain.kbSearch("jacket brand", 5)),
    t("brain.bundle", () =>
      brain.bundle([
        { tool: "account.info" },
        { tool: "kb.search", args: { query: "where", k: 3 } },
      ])
    ),
  ]);

  return NextResponse.json({
    results: [acct, kb, bundle],
    stats: brain.stats(),
  });
}

function shape(v: unknown): unknown {
  if (Array.isArray(v)) return { array: true, len: v.length, first: v[0] };
  if (v && typeof v === "object") return Object.keys(v as object).slice(0, 10);
  return v;
}
