// Publishing & Content OS — schedule a post, publish immediately, list the
// queue/history, and a daily-quota readout (IG caps content publishing at
// 25 posts / 24h per account — quotaTotal mirrors that limit).
import { Elysia } from "elysia";
import { listScheduledPosts, createScheduledPost, updateScheduledPost, deleteScheduledPost, bestPostingHours } from "@shaiz/db";
import { publishToInstagram, type PublishInput } from "../../../../lib/ig/publish";
import { chat } from "../../../../lib/ig/llm";
import { authPlugin } from "../plugins/auth";

const DAILY_QUOTA = 25;

export const publishingRoute = new Elysia()
  .use(authPlugin)
  .get("/api/ig/publishing/scheduled", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return { posts: await listScheduledPosts(auth.accountId) };
  }, { auth: true })
  .get("/api/ig/publishing/quota", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const posts = await listScheduledPosts(auth.accountId);
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const usage = posts.filter((p) => p.status === "published" && p.scheduledAt >= since).length;
    return { quotaUsage: usage, quotaTotal: DAILY_QUOTA };
  }, { auth: true })
  .post("/api/ig/publishing/now", async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as PublishInput;
    try {
      const mediaId = await publishToInstagram(auth.accountId, b);
      return { ok: true, mediaId };
    } catch (e) {
      set.status = 502;
      return { error: e instanceof Error ? e.message : "publish failed" };
    }
  }, { requireRole: "agent" })
  .post("/api/ig/publishing/scheduled", async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const post = await createScheduledPost(auth.accountId, (body ?? {}) as any);
    set.status = 201;
    return { post };
  }, { requireRole: "agent" })
  .patch("/api/ig/publishing/scheduled/:id", async ({ auth, params, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const post = await updateScheduledPost(auth.accountId, params.id, (body ?? {}) as any);
    if (!post) { set.status = 404; return { error: "not found or already published" }; }
    return { post };
  }, { requireRole: "agent" })
  .delete("/api/ig/publishing/scheduled/:id", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const ok = await deleteScheduledPost(auth.accountId, params.id);
    if (!ok) { set.status = 404; return { error: "not found" }; }
    return { ok: true };
  }, { requireRole: "agent" })
  .get("/api/ig/publishing/best-times", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return { hours: await bestPostingHours(auth.accountId) };
  }, { auth: true })
  .post("/api/ig/publishing/caption", async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as { description?: string };
    if (!b.description?.trim()) { set.status = 400; return { error: "description required" }; }
    const out = await chat([
      { role: "system", content: "You write short, engaging Instagram captions with 3-5 relevant hashtags at the end. Return only the caption text, no preamble, no quotes." },
      { role: "user", content: b.description },
    ], { temperature: 0.8 });
    return { caption: out.trim() };
  }, { requireRole: "agent" });
