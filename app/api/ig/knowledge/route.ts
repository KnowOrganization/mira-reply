import { NextRequest, NextResponse } from "next/server";
import { listFacts, addFact, backfillEmbeddings } from "@/lib/ig/knowledge";
import type { FactTopic } from "@/lib/ig/store";

export const runtime = "nodejs";

const TOPICS: FactTopic[] = ["gear", "location", "song", "personal", "shop", "general"];

export async function GET() {
  // opening the Knowledge editor is a good moment to embed any old facts
  await backfillEmbeddings().catch(() => {});
  const facts = await listFacts();
  return NextResponse.json({ facts });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as {
    question?: string;
    answer?: string;
    topic?: FactTopic;
    scope?: "account" | "post";
    postId?: string;
    durable?: boolean;
  };
  const question = (b.question || "").trim();
  const answer = (b.answer || "").trim();
  if (!question || !answer) {
    return NextResponse.json(
      { error: "question and answer are required" },
      { status: 400 }
    );
  }
  const isLink = /^https?:\/\//i.test(answer);
  const fact = await addFact({
    question,
    answer,
    topic: b.topic && TOPICS.includes(b.topic) ? b.topic : "general",
    scope: b.scope === "post" ? "post" : "account",
    postId: b.scope === "post" ? b.postId : undefined,
    durable: b.durable !== false,
    link: isLink ? { url: answer, label: question } : undefined,
  });
  return NextResponse.json({ fact });
}
