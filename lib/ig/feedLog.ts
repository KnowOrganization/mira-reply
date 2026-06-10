import { updateStore, type FeedEvent } from "./store";

let seq = 0;

export async function logFeedEvent(event: Omit<FeedEvent, "id">): Promise<void> {
  const id = `fe_${Date.now()}_${(seq++).toString(36)}`;
  const full: FeedEvent = { ...event, id };
  await updateStore((s) => ({
    ...s,
    feedEvents: [full, ...(s.feedEvents || [])].slice(0, 500),
  }));
}
