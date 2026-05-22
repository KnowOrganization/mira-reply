import { NextResponse } from "next/server";
import { readStore } from "@/lib/ig/store";

export const runtime = "nodejs";

export async function GET() {
  const s = await readStore();
  const list = Object.values(s.posts).sort((a, b) =>
    a.timestamp < b.timestamp ? 1 : -1
  );
  return NextResponse.json({ posts: list });
}
