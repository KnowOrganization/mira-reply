import { Elysia } from "elysia";
import { getKnowledgeHandler } from "./handlers/get-knowledge";
import { postKnowledgeHandler } from "./handlers/post-knowledge";
import { patchKnowledgeIdHandler } from "./handlers/patch-knowledge-id";
import { deleteKnowledgeIdHandler } from "./handlers/delete-knowledge-id";
import { getDraftsHandler } from "./handlers/get-drafts";
import { postDraftsIdHandler } from "./handlers/post-drafts-id";
import { getClarificationsHandler } from "./handlers/get-clarifications";
import { postClarificationsIdHandler } from "./handlers/post-clarifications-id";
import { getCommentsHandler } from "./handlers/get-comments";
import { getMentionsHandler } from "./handlers/get-mentions";
import { postMentionsHandler } from "./handlers/post-mentions";
import { patchMentionsHandler } from "./handlers/patch-mentions";
import { getCommentersHandler } from "./handlers/get-commenters";
import { postCommentIdReplyHandler } from "./handlers/post-comment-id-reply";
import { postCommentIdGenerateHandler } from "./handlers/post-comment-id-generate";
import { getKbHandler } from "./handlers/get-kb";
import { postKbHandler } from "./handlers/post-kb";
import { deleteKbIdHandler } from "./handlers/delete-kb-id";

export const inboxRoute = new Elysia()
  .use(getKnowledgeHandler)
  .use(postKnowledgeHandler)
  .use(patchKnowledgeIdHandler)
  .use(deleteKnowledgeIdHandler)
  .use(getDraftsHandler)
  .use(postDraftsIdHandler)
  .use(getClarificationsHandler)
  .use(postClarificationsIdHandler)
  .use(getCommentsHandler)
  .use(getMentionsHandler)
  .use(postMentionsHandler)
  .use(patchMentionsHandler)
  .use(getCommentersHandler)
  .use(postCommentIdReplyHandler)
  .use(postCommentIdGenerateHandler)
  .use(getKbHandler)
  .use(postKbHandler)
  .use(deleteKbIdHandler);
