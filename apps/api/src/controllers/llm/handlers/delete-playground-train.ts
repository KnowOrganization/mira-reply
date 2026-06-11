// DELETE /api/playground/train — remove a training example by id (auth-gated)
import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { deleteTraining } from "../../../services/llm-service";

export const deletePlaygroundTrainHandler = new Elysia().delete(
  "/api/playground/train",
  async ({ request, query, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }

    const id = (query as { id?: string }).id;
    if (!id) { set.status = 400; return { error: "id is required" }; }
    await deleteTraining(id);
    return { ok: true };
  }
);
