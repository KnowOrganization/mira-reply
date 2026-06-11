"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import {
  useStatus,
  useComments,
  useDrafts,
  useClarifications,
  useDigest,
  useWatcher,
  useWatcherAction,
  qk,
} from "@/lib/api/hooks";
import type {
  CommentRow,
  PendingDraft,
  Clarification,
  Status,
  Digest,
  FeedEntry,
} from "./types";

export type CommentsDataResult = {
  // queries
  status: Status | null;
  rows: CommentRow[];
  pending: PendingDraft[];
  clars: Clarification[];
  digest: Digest | null;
  watching: boolean;
  live: { ok: boolean; error?: string } | undefined;
  liveError: string | null;
  loading: boolean;
  // live feed
  feed: FeedEntry[];
  // search
  search: string;
  setSearch: (v: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  // actions
  reloadCache: () => void;
  refreshLive: () => Promise<void>;
};

export function useCommentsData(): CommentsDataResult {
  const qc = useQueryClient();
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const statusQ = useStatus<Status>();
  const status = statusQ.data ?? null;
  const commentsQ = useComments<{ rows?: CommentRow[]; live?: { ok: boolean; error?: string } }>(false, {
    refetchInterval: 20_000,
  });
  const draftsQ = useDrafts<{ pending?: PendingDraft[] }>({ refetchInterval: 20_000 });
  const clarsQ = useClarifications<{ open?: Clarification[] }>({ refetchInterval: 20_000 });
  const digestQ = useDigest<Digest>({ refetchInterval: 20_000 });
  const watcherQ = useWatcher<{ running?: boolean }>({ refetchInterval: 30_000 });

  const rows = commentsQ.data?.rows ?? [];
  const pending = draftsQ.data?.pending ?? [];
  const clars = clarsQ.data?.open ?? [];
  const digest = digestQ.data && typeof digestQ.data.inbox === "number" ? digestQ.data : null;
  const watching = !!watcherQ.data?.running;
  const live = commentsQ.data?.live;
  const liveError = live ? (live.ok ? null : live.error || "Instagram fetch failed") : null;

  const reloadCache = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["ig", "comments"] });
    qc.invalidateQueries({ queryKey: qk.drafts });
    qc.invalidateQueries({ queryKey: qk.clarifications });
    qc.invalidateQueries({ queryKey: qk.digest });
  }, [qc]);

  const [refreshing, setRefreshing] = useState(false);
  const refreshLive = useCallback(async () => {
    setRefreshing(true);
    try {
      await api.get("/api/ig/comments?refresh=1");
    } catch {
      /* ignore */
    }
    reloadCache();
    setRefreshing(false);
  }, [reloadCache]);

  const loading = refreshing || commentsQ.isFetching;

  const watcherAction = useWatcherAction();
  useEffect(() => {
    watcherAction.mutate(undefined);
    const es = new EventSource("/api/ig/stream");
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === "comment") {
          setFeed((f) =>
            [
              {
                id: `c-${ev.commentId}`,
                ts: ev.ts,
                who: ev.fromUsername || (ev.fromUserId || "").slice(0, 8),
                text: ev.text || "",
              },
              ...f.filter((x) => x.id !== `c-${ev.commentId}`),
            ].slice(0, 50)
          );
          reloadCache();
        }
        if (ev.type === "draft" || ev.type === "sent") reloadCache();
      } catch {
        /* ignore malformed event */
      }
    };
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadCache]);

  // global "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return {
    status,
    rows,
    pending,
    clars,
    digest,
    watching,
    live,
    liveError,
    loading,
    feed,
    search,
    setSearch,
    searchRef,
    reloadCache,
    refreshLive,
  };
}
