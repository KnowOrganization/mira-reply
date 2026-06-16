import { Elysia } from "elysia";
import { getConversationsHandler } from "./handlers/get-conversations";
import { getConversationIdHandler } from "./handlers/get-conversation-id";
import { patchConversationIdHandler } from "./handlers/patch-conversation-id";
import { postConversationSendHandler } from "./handlers/post-conversation-send";
import { getAnalyticsHandler } from "./handlers/get-analytics";
import { postSyncDmsHandler } from "./handlers/post-sync-dms";

export const crmController = new Elysia()
  .use(postSyncDmsHandler)
  .use(getConversationsHandler)
  .use(getConversationIdHandler)
  .use(patchConversationIdHandler)
  .use(postConversationSendHandler)
  .use(getAnalyticsHandler);
