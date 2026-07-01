// Publishing & Content OS — schedule a post, publish immediately, or sweep due
// posts. The IG Content Publishing API is two-step (create container, then
// publish it) — see lib/ig/graph.ts createMediaContainer/publishMediaContainer.
import { getAccessToken, dueScheduledPosts, markScheduledPublished, markScheduledFailed } from "@shaiz/db";
import { createMediaContainer, publishMediaContainer, createCarouselItemContainer, createCarouselContainer } from "./graph";

export type PublishInput = {
  caption?: string;
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  mediaType?: "IMAGE" | "VIDEO" | "REELS" | "CAROUSEL";
};

/** Create + publish a container in one call. Returns the published media id.
 *  2+ images => carousel (N item containers + 1 parent container); otherwise
 *  the existing single-container flow. */
export async function publishToInstagram(accountId: string, input: PublishInput): Promise<string> {
  const token = await getAccessToken(accountId);
  if (!token) throw new Error("not connected");

  if (input.images && input.images.length > 1) {
    const items = await Promise.all(input.images.map((url) => createCarouselItemContainer(accountId, token, url)));
    const { id: creationId } = await createCarouselContainer(accountId, token, {
      caption: input.caption,
      childrenIds: items.map((i) => i.id),
    });
    const { id: mediaId } = await publishMediaContainer(accountId, creationId, token);
    return mediaId;
  }

  const { id: creationId } = await createMediaContainer(accountId, token, {
    caption: input.caption,
    imageUrl: input.imageUrl ?? input.images?.[0],
    videoUrl: input.videoUrl,
    mediaType: input.mediaType === "CAROUSEL" ? undefined : input.mediaType,
  });
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
        images: post.images,
        videoUrl: post.videoUrl ?? undefined,
        mediaType: post.mediaType as PublishInput["mediaType"],
      });
      await markScheduledPublished(accountId, post.id, mediaId);
    } catch (e) {
      await markScheduledFailed(accountId, post.id, e instanceof Error ? e.message : "publish failed");
    }
  }
}
