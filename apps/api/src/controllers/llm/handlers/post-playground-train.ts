// POST /api/playground/train — add a training example (auth-gated)
import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { createTraining, type TrainingInput } from "../../../services/llm-service";

export const postPlaygroundTrainHandler = new Elysia().use(authPlugin).post(
  "/api/playground/train",
  async ({ auth, body, set }) => {
    const b = (body ?? {}) as Record<string, unknown>;
    const comment = typeof b.comment === "string" ? b.comment.trim() : "";
    const verdict = b.verdict === "good" ? "good" : ("bad" as const);
    if (!comment) { set.status = 400; return { error: "comment is required" }; }

    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
    const correctAction =
      b.correctAction === "reply" || b.correctAction === "ask_owner" || b.correctAction === "skip"
        ? b.correctAction
        : undefined;

    const input: TrainingInput = {
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
    };

    const entry = await createTraining(input);
    return { entry };
  },
  { auth: true }
);
