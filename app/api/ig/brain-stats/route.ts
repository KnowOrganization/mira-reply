import { NextResponse } from "next/server";
import { brain } from "@/lib/ig/mcp/client";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    stats: brain.stats(),
    tools: brain.tools().map((t) => ({
      name: t.name,
      description: t.description,
    })),
  });
}
