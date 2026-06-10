import { NextResponse } from "next/server";
import { patchStore } from "@/lib/ig/store";

export const runtime = "nodejs";

export async function POST() {
  await patchStore({ account: null, pendingDrafts: [], lastToken: undefined });
  return NextResponse.json({ ok: true });
}
