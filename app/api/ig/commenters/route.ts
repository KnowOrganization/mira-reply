import { NextResponse } from "next/server";
import { readStore } from "@/lib/ig/store";

export const runtime = "nodejs";

export async function GET() {
  const s = await readStore();
  const list = Object.values(s.commenters)
    .sort((a, b) => b.commentCount - a.commentCount)
    .slice(0, 100);
  return NextResponse.json({ commenters: list });
}
