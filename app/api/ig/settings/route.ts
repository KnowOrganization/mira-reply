import { NextRequest, NextResponse } from "next/server";
import { readStore, patchStore, type Settings } from "@/lib/ig/store";

export const runtime = "nodejs";

export async function GET() {
  const s = await readStore();
  return NextResponse.json(s.settings);
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as Partial<Settings>;
  const cur = await readStore();
  const next = await patchStore({ settings: { ...cur.settings, ...body } });
  return NextResponse.json(next.settings);
}
