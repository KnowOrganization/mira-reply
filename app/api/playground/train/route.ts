import { NextResponse } from "next/server";
import { addTraining, listTraining, removeTraining } from "@/lib/ig/training";

export const runtime = "nodejs";

/** List every training example. */
export async function GET() {
  return NextResponse.json({ training: await listTraining() });
}

/** Save an approve / deny verdict as a training example. */
export async function POST(req: Request) {
  const b = (await req.json()) as Record<string, unknown>;
  const comment = typeof b.comment === "string" ? b.comment.trim() : "";
  const verdict = b.verdict === "good" ? "good" : "bad";
  if (!comment)
    return NextResponse.json({ error: "comment is required" }, { status: 400 });

  const str = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;
  const correctAction =
    b.correctAction === "reply" ||
    b.correctAction === "ask_owner" ||
    b.correctAction === "skip"
      ? b.correctAction
      : undefined;

  const entry = await addTraining({
    comment,
    caption: typeof b.caption === "string" ? b.caption : "",
    notes: typeof b.notes === "string" ? b.notes : "",
    miraAction: typeof b.miraAction === "string" ? b.miraAction : "",
    miraReply: typeof b.miraReply === "string" ? b.miraReply : "",
    intent: typeof b.intent === "string" ? b.intent : "",
    verdict,
    correctAction: verdict === "bad" ? correctAction : undefined,
    idealReply: verdict === "bad" ? str(b.idealReply) : undefined,
    askQuestion: verdict === "bad" ? str(b.askQuestion) : undefined,
    note: str(b.note),
  });
  return NextResponse.json({ entry });
}

/** Delete a training example by id. */
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await removeTraining(id);
  return NextResponse.json({ ok: true });
}
