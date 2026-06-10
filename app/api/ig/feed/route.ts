import { NextResponse } from "next/server";
import { readStore } from "@/lib/ig/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = await readStore();
  return NextResponse.json({ events: store.feedEvents || [] });
}
