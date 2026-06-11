// CRUD /api/ig/post-configs[/:id] — scoped to the logged-in user's account.
import { Elysia } from "elysia";
import {
  listPostConfigs, getPostConfig, createPostConfig, updatePostConfig, deletePostConfig, funnelStats,
} from "@shaiz/db";
import { requireUser, type AuthCtx } from "../lib/auth";

async function guard(request: Request, set: { status?: number | string }): Promise<AuthCtx | { error: string }> {
  const a = await requireUser(request.headers);
  if (!a.ctx) { set.status = a.status!; return { error: a.error! }; }
  if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }
  return a.ctx as AuthCtx;
}
const failed = (x: unknown): x is { error: string } => typeof (x as { error?: string }).error === "string";

export const postConfigsRoute = new Elysia()
  .get("/api/ig/post-configs", async ({ request, set }) => {
    const g = await guard(request, set); if (failed(g)) return g;
    return { post_configs: await listPostConfigs(g.accountId!) };
  })
  .post("/api/ig/post-configs", async ({ request, body, set }) => {
    const g = await guard(request, set); if (failed(g)) return g;
    const b = (body ?? {}) as Record<string, any>;
    if (!b.ig_post_id) { set.status = 400; return { error: "ig_post_id required" }; }
    if (!b.welcome_msg) { set.status = 400; return { error: "welcome_msg required" }; }
    const post_config = await createPostConfig(g.accountId!, b as any);
    set.status = 201;
    return { post_config };
  })
  .get("/api/ig/post-configs/:id", async ({ request, params, set }) => {
    const g = await guard(request, set); if (failed(g)) return g;
    const post_config = await getPostConfig(g.accountId!, params.id);
    if (!post_config) { set.status = 404; return { error: "not found" }; }
    return { post_config, stats: await funnelStats(post_config.ig_post_id) };
  })
  .put("/api/ig/post-configs/:id", async ({ request, params, body, set }) => {
    const g = await guard(request, set); if (failed(g)) return g;
    const post_config = await updatePostConfig(g.accountId!, params.id, (body ?? {}) as any);
    if (!post_config) { set.status = 404; return { error: "not found" }; }
    return { post_config };
  })
  .patch("/api/ig/post-configs/:id", async ({ request, params, body, set }) => {
    const g = await guard(request, set); if (failed(g)) return g;
    const post_config = await updatePostConfig(g.accountId!, params.id, (body ?? {}) as any);
    if (!post_config) { set.status = 404; return { error: "not found" }; }
    return { post_config };
  })
  .delete("/api/ig/post-configs/:id", async ({ request, params, set }) => {
    const g = await guard(request, set); if (failed(g)) return g;
    const ok = await deletePostConfig(g.accountId!, params.id);
    if (!ok) { set.status = 404; return { error: "not found" }; }
    return { ok: true };
  });
