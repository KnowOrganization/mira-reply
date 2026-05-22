import { NextResponse } from "next/server";
import { readStore, type FactTopic } from "@/lib/ig/store";
import { addFact, deleteFact } from "@/lib/ig/knowledge";
import { chatJSON } from "@/lib/ig/llm";

export const runtime = "nodejs";

const TOPICS: FactTopic[] = [
  "personal",
  "gear",
  "location",
  "song",
  "shop",
  "general",
];

function asTopic(t: unknown): FactTopic {
  return TOPICS.includes(t as FactTopic) ? (t as FactTopic) : "general";
}

/** GET — the account's brain: account-scoped facts + per-topic stats + gaps. */
export async function GET() {
  const s = await readStore();
  const now = Date.now();
  const facts = s.knowledge.filter(
    (f) => f.scope === "account" && !(f.expiresAt && f.expiresAt < now)
  );
  const byTopic: Record<string, number> = {};
  for (const t of TOPICS) byTopic[t] = 0;
  for (const f of facts) byTopic[f.topic] = (byTopic[f.topic] || 0) + 1;
  const gaps = TOPICS.filter((t) => byTopic[t] === 0);
  return NextResponse.json({
    facts,
    byTopic,
    gaps,
    total: facts.length,
    account: s.account ? { username: s.account.username } : null,
  });
}

/** POST — add a fact, extract facts from free text, or delete a fact. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    action?: "add" | "extract" | "delete";
    question?: string;
    answer?: string;
    topic?: string;
    text?: string;
    topicHint?: string;
    id?: string;
  };

  if (body.action === "delete") {
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await deleteFact(body.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "add") {
    const question = (body.question || "").trim();
    const answer = (body.answer || "").trim();
    if (!question || !answer)
      return NextResponse.json({ error: "question + answer required" }, { status: 400 });
    const isLink = /^https?:\/\//i.test(answer);
    const fact = await addFact({
      question,
      answer,
      topic: asTopic(body.topic),
      scope: "account",
      link: isLink ? { url: answer, label: question } : undefined,
    });
    return NextResponse.json({ ok: true, created: [fact] });
  }

  if (body.action === "extract") {
    const text = (body.text || "").trim();
    if (!text) return NextResponse.json({ ok: true, created: [] });
    const hint = body.topicHint
      ? `These facts are mostly about the owner's ${body.topicHint}. `
      : "";
    const out = await chatJSON<{
      facts: { question: string; answer: string; topic: string }[];
    }>(
      [
        {
          role: "system",
          content:
            "You turn what an Instagram creator says about themselves and their account into reusable facts. " +
            hint +
            "Extract every distinct fact. Each fact: a natural question a follower might ask, the answer, and a topic " +
            "(gear, location, song, personal, shop, general). Keep answers concise and factual. " +
            'Output JSON only: {"facts":[{"question":"...","answer":"...","topic":"..."}]}',
        },
        { role: "user", content: text },
      ],
      { facts: [] }
    );
    const created = [];
    for (const f of out.facts || []) {
      const question = (f.question || "").trim();
      const answer = (f.answer || "").trim();
      if (!question || !answer) continue;
      const isLink = /^https?:\/\//i.test(answer);
      created.push(
        await addFact({
          question,
          answer,
          topic: asTopic(f.topic),
          scope: "account",
          link: isLink ? { url: answer, label: question } : undefined,
        })
      );
    }
    return NextResponse.json({ ok: true, created });
  }

  return NextResponse.json({ error: "bad action" }, { status: 400 });
}
