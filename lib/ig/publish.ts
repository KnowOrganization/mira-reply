// Publishing & Content OS — schedule a post, publish immediately, or sweep due
// posts. The IG Content Publishing API is two-step (create container, then
// publish it) — see lib/ig/graph.ts createMediaContainer/publishMediaContainer.
import { getAccessToken, dueScheduledPosts, markScheduledPublished, markScheduledFailed } from "@shaiz/db";
import { createMediaContainer, publishMediaContainer } from "./graph";

export type PublishInput = {
  caption?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: "IMAGE" | "VIDEO" | "REELS";
};

/** Create + publish a container in one call. Returns the published media id. */
export async function publishToInstagram(accountId: string, input: PublishInput): Promise<string> {
  const token = await getAccessToken(accountId);
  if (!token) throw new Error("not connected");
  const { id: creationId } = await createMediaContainer(accountId, token, input);
  const { id: mediaId } = await publishMediaContainer(accountId, creationId, token);
  return mediaId;
}

/** Worker sweep hook (called every 60s alongside reconcileAccount) — publishes
 *  any scheduled post whose time has come, marking it published/failed. */
export async function publishDuePosts(accountId: string): Promise<void> {
  const due = await dueScheduledPosts(accountId, Date.now());
  for (const post of due) {
    try {
      const mediaId = await publishToInstagram(accountId, {
        caption: post.caption,
        imageUrl: post.imageUrl ?? undefined,
        videoUrl: post.videoUrl ?? undefined,
        mediaType: post.mediaType as PublishInput["mediaType"],
      });
      await markScheduledPublished(accountId, post.id, mediaId);
    } catch (e) {
      await markScheduledFailed(accountId, post.id, e instanceof Error ? e.message : "publish failed");
    }
  }
}
