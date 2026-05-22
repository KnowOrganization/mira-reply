import { NextResponse } from "next/server";
import { readStore } from "@/lib/ig/store";

export const runtime = "nodejs";

export async function GET() {
  const s = await readStore();
  return NextResponse.json({
    open: s.clarifications.filter((c) => c.status === "open"),
    recent: s.clarifications.slice(0, 50),
  });
}
