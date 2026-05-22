import { NextRequest, NextResponse } from "next/server";
import { runAgent, type AgentMsg } from "@/lib/ig/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { messages } = (await req.json().catch(() => ({}))) as {
    messages?: AgentMsg[];
  };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }
  try {
    const { reply, actions } = await runAgent(messages.slice(-12));
    return NextResponse.json({ reply, actions });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "agent failed" },
      { status: 500 }
    );
  }
}
