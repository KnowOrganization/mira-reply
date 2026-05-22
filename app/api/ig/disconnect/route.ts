import { NextResponse } from "next/server";
import { patchStore } from "@/lib/ig/store";

export const runtime = "nodejs";

export async function POST() {
  await patchStore({ account: null, pendingDrafts: [] });
  return NextResponse.json({ ok: true });
}
