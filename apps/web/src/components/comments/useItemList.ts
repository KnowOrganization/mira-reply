"use client";

import { useMemo } from "react";
import type { CommentRow, PendingDraft, Clarification, Item, ItemState, Tab, PostGroup } from "./types";

type Counts = {
  all: number;
  needs_you: number;
  draft: number;
  replied: number;
};

type ItemListResult = {
  items: Item[];
  counts: Counts;
  filtered: Item[];
  postGroups: PostGroup[];
};

export function useItemList(
  rows: CommentRow[],
  pending: PendingDraft[],
  clars: Clarification[],
  tab: Tab,
  search: string
): ItemListResult {
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const usedDrafts = new Set<string>();
    const usedClars = new Set<string>();

    for (const row of rows) {
      const draft = pending.find(
        (d) =>
          !usedDrafts.has(d.id) &&
          (d.threadOrMediaId === row.id ||
            (d.inboundText === row.text && d.fromUserId === row.fromUserId))
      );
      if (draft) usedDrafts.add(draft.id);
      const clar = clars.find(
        (c) =>
          !usedClars.has(c.id) &&
          c.commentText === row.text &&
          c.fromUserId === row.fromUserId
      );
      if (clar) usedClars.add(clar.id);

      let state: ItemState;
      if (row.isOwn) state = "mine";
      else if (clar) state = "needs_you";
      else if (draft) state = "draft";
      else if (row.ownReply) state = "replied";
      else state = "open";

      out.push({
        key: row.id,
        ts: row.ts,
        state,
        commentId: row.id,
        text: row.text,
        fromUserId: row.fromUserId,
        fromUsername: row.fromUsername,
        isOwn: row.isOwn,
        postId: row.postId,
        postCaption: row.postCaption,
        postThumb: row.postThumb,
        postPermalink: row.postPermalink,
        intent: draft?.intent,
        isSuperfan: row.isSuperfan,
        draft,
        clar,
        ownReply: row.ownReply,
      });
    }

    for (const d of pending) {
      if (usedDrafts.has(d.id)) continue;
      out.push({
        key: `d-${d.id}`,
        ts: d.createdAt,
        state: "draft",
        text: d.inboundText,
        fromUserId: d.fromUserId,
        fromUsername: d.fromUsername || "",
        isOwn: false,
        postId: d.postId || "",
        postCaption: "",
        intent: d.intent,
        draft: d,
      });
    }
    for (const c of clars) {
      if (usedClars.has(c.id)) continue;
      out.push({
        key: `c-${c.id}`,
        ts: c.createdAt,
        state: "needs_you",
        text: c.commentText,
        fromUserId: c.fromUserId,
        fromUsername: c.fromUsername || "",
        isOwn: false,
        postId: c.postId || "",
        postCaption: "",
        clar: c,
      });
    }
    return out.sort((a, b) => b.ts - a.ts);
  }, [rows, pending, clars]);

  const counts = useMemo<Counts>(() => {
    const v = items.filter((i) => !i.isOwn);
    return {
      all: v.length,
      needs_you: v.filter((i) => i.state === "needs_you").length,
      draft: v.filter((i) => i.state === "draft").length,
      replied: v.filter((i) => i.state === "replied").length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (i.isOwn) return false;
      if (tab !== "all" && i.state !== tab) return false;
      if (q) {
        return (
          i.text.toLowerCase().includes(q) ||
          i.fromUsername.toLowerCase().includes(q) ||
          i.postCaption.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, tab, search]);

  const postGroups = useMemo<PostGroup[]>(() => {
    const map = new Map<string, PostGroup>();
    for (const it of filtered) {
      const key = it.postId || "_none";
      let g = map.get(key);
      if (!g) {
        g = {
          postId: key,
          caption: it.postCaption,
          thumb: it.postThumb,
          permalink: it.postPermalink,
          items: [],
          latest: 0,
        };
        map.set(key, g);
      }
      g.items.push(it);
      if (it.ts > g.latest) g.latest = it.ts;
      if (!g.caption && it.postCaption) g.caption = it.postCaption;
      if (!g.thumb && it.postThumb) g.thumb = it.postThumb;
      if (!g.permalink && it.postPermalink) g.permalink = it.postPermalink;
    }
    return Array.from(map.values()).sort((a, b) => b.latest - a.latest);
  }, [filtered]);

  return { items, counts, filtered, postGroups };
}
