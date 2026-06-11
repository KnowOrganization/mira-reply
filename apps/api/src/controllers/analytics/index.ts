import { Elysia } from "elysia";
import { getDashboardHandler } from "./handlers/get-dashboard";
import { getFeedHandler } from "./handlers/get-feed";
import { getLogsHandler } from "./handlers/get-logs";
import { getDigestHandler } from "./handlers/get-digest";
import { getBrainHandler } from "./handlers/get-brain";
import { postBrainHandler } from "./handlers/post-brain";
import { getBrainStatsHandler } from "./handlers/get-brain-stats";
import { getBrainProbeHandler } from "./handlers/get-brain-probe";
import { postCleanupHandler } from "./handlers/post-cleanup";

export const analyticsRoute = new Elysia()
  .use(getDashboardHandler)
  .use(getFeedHandler)
  .use(getLogsHandler)
  .use(getDigestHandler)
  .use(getBrainHandler)
  .use(postBrainHandler)
  .use(getBrainStatsHandler)
  .use(getBrainProbeHandler)
  .use(postCleanupHandler);
