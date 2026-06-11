// DELETE /api/playground/train — remove a training example by id (auth-gated)
import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { deleteTraining } from "../../../services/llm-service";

export const deletePlaygroundTrainHandler = new Elysia().use(authPlugin).delete(
  "/api/playground/train",
  async ({ auth, query, set }) => {
    const id = (query as { id?: string }).id;
    if (!id) { set.status = 400; return { error: "id is required" }; }
    await deleteTraining(id);
    return { ok: true };
  },
  { auth: true }
);
