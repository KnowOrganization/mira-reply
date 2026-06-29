import { Elysia } from "elysia";
import { getDashboardHandler } from "./handlers/get-dashboard";
import { getFeedHandler } from "./handlers/get-feed";
import { getLogsHandler } from "./handlers/get-logs";
import { getDigestHandler } from "./handlers/get-digest";
import { getBrainHandler } from "./handlers/get-brain";
import { postBrainHandler } from "./handlers/post-brain";
import { getBrainStatsHandler } from "./handlers/get-brain-stats";
import { getBrainStatusHandler } from "./handlers/get-brain-status";
import { postBrainRebuildHandler } from "./handlers/post-brain-rebuild";
import { getBrainProbeHandler } from "./handlers/get-brain-probe";
import { postCleanupHandler } from "./handlers/post-cleanup";
import { getInsightsAccountHandler } from "./handlers/get-insights-account";

export const analyticsRoute = new Elysia()
  .use(getDashboardHandler)
  .use(getFeedHandler)
  .use(getLogsHandler)
  .use(getDigestHandler)
  .use(getBrainHandler)
  .use(postBrainHandler)
  .use(getBrainStatsHandler)
  .use(getBrainStatusHandler)
  .use(postBrainRebuildHandler)
  .use(getBrainProbeHandler)
  .use(postCleanupHandler)
  .use(getInsightsAccountHandler);
