import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { patchPost } from "../../../services/posts-service";
import type { PostLink } from "@/lib/ig/store";

export const patchPostIdHandler = new Elysia().use(authPlugin).patch(
  "/api/ig/posts/:postId",
  async ({ auth, params, body, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }

    const b = (body ?? {}) as {
      notes?: string;
      addQA?: { q: string; a: string };
      addLink?: { label: string; url: string; type?: PostLink["type"] };
      removeLink?: string;
    };

    return patchPost(auth.accountId, params.postId, b, set);
  },
  { auth: true }
);
