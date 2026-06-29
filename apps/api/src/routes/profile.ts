// GET /api/ig/profile — live IG account profile (username, name, avatar, bio,
// follower/following/media counts). Mobile profile screen + web header.
import { Elysia } from "elysia";
import { readStore } from "@/lib/ig/store";
import { getAccountProfile } from "@/lib/ig/graph";
import { authPlugin } from "../plugins/auth";

export const profileRoute = new Elysia().use(authPlugin).get(
  "/api/ig/profile",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    const s = await readStore(auth.accountId);
    if (!s.account?.accessToken) { set.status = 400; return { error: "not connected" }; }
    try {
      const p = (await getAccountProfile(s.account.accessToken)) as Record<string, unknown>;
      return {
        profile: {
          id: p.id, username: p.username, name: p.name,
          avatarUrl: p.profile_picture_url, biography: p.biography,
          followersCount: p.followers_count, followsCount: p.follows_count,
          mediaCount: p.media_count,
        },
      };
    } catch (e) {
      set.status = 502;
      return { error: e instanceof Error ? e.message : "profile fetch failed" };
    }
  },
  { auth: true }
);
