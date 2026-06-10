import { NextRequest, NextResponse } from "next/server";
import { getRecentLogs } from "@/lib/ig/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "200", 10), 1000);
  const logs = getRecentLogs(limit);
  return NextResponse.json({ logs });
}
