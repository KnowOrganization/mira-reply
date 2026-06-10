import { NextRequest, NextResponse } from "next/server";
import { getPostConfigs, createPostConfig } from "@/lib/ig/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SQLite ManyChat-style post-config funnel (Layer 1). The comment webhook reads
// these directly via getPostConfigByPostId; this HTTP CRUD is for managing them.
export async function GET() {
  const configs = getPostConfigs();
  return NextResponse.json({ post_configs: configs });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    ig_post_id?: string;
    keywords?: string[];
    welcome_msg?: string;
    button_label?: string;
    follow_gate?: boolean;
    not_following_msg?: string;
    link_url?: string;
    link_msg?: string;
    active?: boolean;
  };
  if (!body.ig_post_id) return NextResponse.json({ error: "ig_post_id required" }, { status: 400 });
  if (!body.welcome_msg) return NextResponse.json({ error: "welcome_msg required" }, { status: 400 });

  const config = createPostConfig({
    ig_post_id: body.ig_post_id,
    keywords: body.keywords ?? [],
    welcome_msg: body.welcome_msg,
    button_label: body.button_label ?? "Send me the link 👇",
    follow_gate: body.follow_gate ?? true,
    not_following_msg: body.not_following_msg ?? "Oops 👀 You're not following yet!\n\nFollow then tap below ⬇️",
    link_url: body.link_url ?? null,
    link_msg: body.link_msg ?? null,
    active: body.active ?? true,
  });
  return NextResponse.json({ post_config: config }, { status: 201 });
}
