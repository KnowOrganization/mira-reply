// LLM domain controller — composes all route handlers into a single Elysia instance.
import { Elysia } from "elysia";
import { postAgentHandler } from "./handlers/post-agent";
import { postChatHandler } from "./handlers/post-chat";
import { postPlaygroundHandler } from "./handlers/post-playground";
import { getPlaygroundTrainHandler } from "./handlers/get-playground-train";
import { postPlaygroundTrainHandler } from "./handlers/post-playground-train";
import { deletePlaygroundTrainHandler } from "./handlers/delete-playground-train";
import { postAutomationsTestHandler } from "./handlers/post-automations-test";
import { postInjectHandler } from "./handlers/post-inject";
import { postReprocessHandler } from "./handlers/post-reprocess";

export const llmRoute = new Elysia()
  .use(postAgentHandler)
  .use(postChatHandler)
  .use(postPlaygroundHandler)
  .use(getPlaygroundTrainHandler)
  .use(postPlaygroundTrainHandler)
  .use(deletePlaygroundTrainHandler)
  .use(postAutomationsTestHandler)
  .use(postInjectHandler)
  .use(postReprocessHandler);
