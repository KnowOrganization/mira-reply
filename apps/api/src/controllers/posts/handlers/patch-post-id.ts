import { Elysia } from "elysia";
import { requireUser } from "../../../lib/auth";
import { patchPost } from "../../../services/posts-service";
import type { PostLink } from "@/lib/ig/store";

export const patchPostIdHandler = new Elysia().patch(
  "/api/ig/posts/:postId",
  async ({ request, params, body, set }) => {
    const a = await requireUser(request.headers);
    if (!a.ctx) { set.status = a.status!; return { error: a.error }; }
    if (!a.ctx.accountId) { set.status = 404; return { error: "no account" }; }

    const b = (body ?? {}) as {
      notes?: string;
      addQA?: { q: string; a: string };
      addLink?: { label: string; url: string; type?: PostLink["type"] };
      removeLink?: string;
    };

    return patchPost(a.ctx.accountId, params.postId, b, set);
  }
);
