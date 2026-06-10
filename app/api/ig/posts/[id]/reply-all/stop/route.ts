import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const g = globalThis as unknown as { __mira_stop_reply_all?: boolean };

export async function POST() {
  g.__mira_stop_reply_all = true;
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  g.__mira_stop_reply_all = false;
  return NextResponse.json({ ok: true });
}
