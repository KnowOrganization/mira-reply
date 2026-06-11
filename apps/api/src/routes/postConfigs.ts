// CRUD /api/ig/post-configs[/:id] — scoped to the logged-in user's account.
import { Elysia } from "elysia";
import {
  listPostConfigs, getPostConfig, createPostConfig, updatePostConfig, deletePostConfig, funnelStats,
} from "@shaiz/db";
import { authPlugin } from "../plugins/auth";

export const postConfigsRoute = new Elysia()
  .use(authPlugin)
  .get("/api/ig/post-configs", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return { post_configs: await listPostConfigs(auth.accountId) };
  }, { auth: true })
  .post("/api/ig/post-configs", async ({ auth, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const b = (body ?? {}) as Record<string, any>;
    if (!b.ig_post_id) { set.status = 400; return { error: "ig_post_id required" }; }
    if (!b.welcome_msg) { set.status = 400; return { error: "welcome_msg required" }; }
    const post_config = await createPostConfig(auth.accountId, b as any);
    set.status = 201;
    return { post_config };
  }, { auth: true })
  .get("/api/ig/post-configs/:id", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const post_config = await getPostConfig(auth.accountId, params.id);
    if (!post_config) { set.status = 404; return { error: "not found" }; }
    return { post_config, stats: await funnelStats(post_config.ig_post_id) };
  }, { auth: true })
  .put("/api/ig/post-configs/:id", async ({ auth, params, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const post_config = await updatePostConfig(auth.accountId, params.id, (body ?? {}) as any);
    if (!post_config) { set.status = 404; return { error: "not found" }; }
    return { post_config };
  }, { auth: true })
  .patch("/api/ig/post-configs/:id", async ({ auth, params, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const post_config = await updatePostConfig(auth.accountId, params.id, (body ?? {}) as any);
    if (!post_config) { set.status = 404; return { error: "not found" }; }
    return { post_config };
  }, { auth: true })
  .delete("/api/ig/post-configs/:id", async ({ auth, params, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const ok = await deletePostConfig(auth.accountId, params.id);
    if (!ok) { set.status = 404; return { error: "not found" }; }
    return { ok: true };
  }, { auth: true });
