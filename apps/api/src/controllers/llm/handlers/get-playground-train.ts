// GET /api/playground/train — list training examples (auth-gated)
import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getTraining } from "../../../services/llm-service";

export const getPlaygroundTrainHandler = new Elysia().use(authPlugin).get(
  "/api/playground/train",
  async () => {
    return { training: await getTraining() };
  },
  { auth: true }
);
