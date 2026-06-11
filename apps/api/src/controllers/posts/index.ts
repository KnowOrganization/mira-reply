import { Elysia } from "elysia";
import { getPostsHandler } from "./handlers/get-posts";
import { postPostsHandler } from "./handlers/post-posts";
import { postPostsSyncHandler } from "./handlers/post-posts-sync";
import { getPostIdHandler } from "./handlers/get-post-id";
import { patchPostIdHandler } from "./handlers/patch-post-id";
import { getPostIdCommentsHandler } from "./handlers/get-post-id-comments";
import { getPostIdInsightsHandler } from "./handlers/get-post-id-insights";
import { postPostIdExtractHandler } from "./handlers/post-post-id-extract";
import { postPostIdReplyAllHandler } from "./handlers/post-post-id-reply-all";
import { postPostIdReplyAllStopHandler } from "./handlers/post-post-id-reply-all-stop";

// Route registration order: static segments before dynamic params.
// /posts/sync must come before /posts/:postId; reply-all/stop before reply-all.
export const postsRoute = new Elysia()
  .use(getPostsHandler)
  .use(postPostsHandler)
  .use(postPostsSyncHandler)
  .use(getPostIdHandler)
  .use(patchPostIdHandler)
  .use(getPostIdCommentsHandler)
  .use(getPostIdInsightsHandler)
  .use(postPostIdExtractHandler)
  .use(postPostIdReplyAllStopHandler)
  .use(postPostIdReplyAllHandler);
