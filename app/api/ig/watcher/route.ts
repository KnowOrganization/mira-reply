import { NextRequest, NextResponse } from "next/server";
import { ensureWatcher, stopWatcher, watcherStatus } from "@/lib/ig/watcher";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(watcherStatus());
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { action?: "start" | "stop" };
  if (body.action === "stop") return NextResponse.json(stopWatcher());
  return NextResponse.json(ensureWatcher());
}
