// GET /api/playground/train — list training examples (auth-gated)
import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { getTraining } from "../../../services/llm-service";

export const getPlaygroundTrainHandler = new Elysia().get(
  "/api/playground/train",
  async ({ request, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    return { training: await getTraining() };
  }
);
