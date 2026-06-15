"use client";

// Feature-scoped TanStack Query hooks. Every read is a useQuery, every write a
// useMutation that invalidates the queries it affects. The typed `api` client is
// the queryFn/mutationFn — no raw fetch lives here.
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { api } from "./client";
import type { Automation } from "@shaiz/shared";

// ── query keys ─────────────────────────────────────────────────────────────
export const qk = {
  status: ["ig", "status"] as const,
  dashboard: ["ig", "dashboard"] as const,
  digest: ["ig", "digest"] as const,
  feed: ["ig", "feed"] as const,
  posts: ["ig", "posts"] as const,
  post: (id: string) => ["ig", "posts", id] as const,
  comments: (refresh?: boolean) => ["ig", "comments", { refresh: !!refresh }] as const,
  drafts: ["ig", "drafts"] as const,
  clarifications: ["ig", "clarifications"] as const,
  knowledge: ["ig", "knowledge"] as const,
  brain: ["ig", "brain"] as const,
  brainStats: ["ig", "brain-stats"] as const,
  settings: ["ig", "settings"] as const,
  watcher: ["ig", "watcher"] as const,
  mentions: ["ig", "mentions"] as const,
  automations: ["ig", "automations"] as const,
};

type QOpts<T> = Omit<UseQueryOptions<T, Error, T>, "queryKey" | "queryFn">;

// ── status / dashboard / digest ────────────────────────────────────────────
export type IgStatus = {
  configured?: boolean;
  connected?: boolean;
  account: { username: string; igUserId?: string } | null;
  replyMode?: string;
  commentMode?: "shadow" | "assisted" | "auto";
  dmMode?: "shadow" | "assisted" | "auto";
  brainReady?: boolean;
  factCount?: number;
  onboardingStep?: string;
  onboardingSkipped?: boolean;
  pendingCount?: number;
};

export function useStatus<T = IgStatus>(opts?: QOpts<T>) {
  return useQuery<T>({
    queryKey: qk.status,
    queryFn: () => api.get<T>("/api/ig/status"),
    ...opts,
  });
}

export function useDashboard<T = unknown>(opts?: QOpts<T>) {
  return useQuery<T>({
    queryKey: qk.dashboard,
    queryFn: () => api.get<T>("/api/ig/dashboard"),
    ...opts,
  });
}

export function useDigest<T = unknown>(opts?: QOpts<T>) {
  return useQuery<T>({
    queryKey: qk.digest,
    queryFn: () => api.get<T>("/api/ig/digest"),
    ...opts,
  });
}

// ── live feed ──────────────────────────────────────────────────────────────
export function useFeed<T = unknown>(opts?: QOpts<T>) {
  return useQuery<T>({
    queryKey: qk.feed,
    queryFn: () => api.get<T>("/api/ig/feed"),
    ...opts,
  });
}

// ── posts ──────────────────────────────────────────────────────────────────
export function usePosts<T = unknown>(opts?: QOpts<T>) {
  return useQuery<T>({
    queryKey: qk.posts,
    queryFn: () => api.get<T>("/api/ig/posts"),
    ...opts,
  });
}

export function usePost<T = unknown>(id: string | null | undefined, opts?: QOpts<T>) {
  return useQuery<T>({
    queryKey: qk.post(id ?? ""),
    queryFn: () => api.get<T>(`/api/ig/posts/${id}`),
    enabled: !!id,
    ...opts,
  });
}

export function useSyncPosts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ count?: number }>("/api/ig/posts/sync"),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.posts }),
  });
}

export function usePatchPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      api.patch<{ post?: unknown }>(`/api/ig/posts/${id}`, patch),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: qk.posts });
      qc.invalidateQueries({ queryKey: qk.post(id) });
    },
  });
}

// ── comments / drafts / clarifications ─────────────────────────────────────
export function useComments<T = unknown>(refresh = false, opts?: QOpts<T>) {
  return useQuery<T>({
    queryKey: qk.comments(refresh),
    queryFn: () => api.get<T>("/api/ig/comments" + (refresh ? "?refresh=1" : "")),
    ...opts,
  });
}

export function useDrafts<T = unknown>(opts?: QOpts<T>) {
  return useQuery<T>({
    queryKey: qk.drafts,
    queryFn: () => api.get<T>("/api/ig/drafts"),
    ...opts,
  });
}

export function useClarifications<T = unknown>(opts?: QOpts<T>) {
  return useQuery<T>({
    queryKey: qk.clarifications,
    queryFn: () => api.get<T>("/api/ig/clarifications"),
    ...opts,
  });
}

// ── knowledge ──────────────────────────────────────────────────────────────
export function useKnowledge<T = unknown>(opts?: QOpts<T>) {
  return useQuery<T>({
    queryKey: qk.knowledge,
    queryFn: () => api.get<T>("/api/ig/knowledge"),
    ...opts,
  });
}

export function useAddKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post("/api/ig/knowledge", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.knowledge }),
  });
}

export function useDeleteKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/ig/knowledge/${id}`),
    // optimistically drop the fact from the cached list
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.knowledge });
      const prev = qc.getQueryData<{ facts?: { id: string }[] }>(qk.knowledge);
      if (prev?.facts) {
        qc.setQueryData(qk.knowledge, { ...prev, facts: prev.facts.filter((f) => f.id !== id) });
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.knowledge, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.knowledge }),
  });
}

export function usePatchKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      api.patch(`/api/ig/knowledge/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.knowledge }),
  });
}

// ── brain ──────────────────────────────────────────────────────────────────
export function useBrain<T = unknown>(opts?: QOpts<T>) {
  return useQuery<T>({
    queryKey: qk.brain,
    queryFn: () => api.get<T>("/api/ig/brain"),
    ...opts,
  });
}

/** All brain writes go through one POST endpoint keyed by `action`. */
export function useBrainAction<R = unknown>() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<R>("/api/ig/brain", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.brain }),
  });
}

export function useBrainStats<T = unknown>(opts?: QOpts<T>) {
  return useQuery<T>({
    queryKey: qk.brainStats,
    queryFn: () => api.get<T>("/api/ig/brain-stats"),
    ...opts,
  });
}

// ── settings ───────────────────────────────────────────────────────────────
export function useIgSettings<T = unknown>(opts?: QOpts<T>) {
  return useQuery<T>({
    queryKey: qk.settings,
    queryFn: () => api.get<T>("/api/ig/settings"),
    ...opts,
  });
}

export function usePatchIgSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Record<string, unknown>) => api.patch("/api/ig/settings", patch),
    // optimistic: reflect the toggle/select instantly, reconcile on settle
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: qk.settings });
      const prev = qc.getQueryData<Record<string, unknown>>(qk.settings);
      if (prev) qc.setQueryData(qk.settings, { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.settings, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.settings }),
  });
}

// ── reply mode ─────────────────────────────────────────────────────────────
export function useSetMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mode: string) => api.post("/api/ig/mode", { mode }),
    // optimistically reflect the new reply mode in the status cache
    onMutate: async (mode) => {
      await qc.cancelQueries({ queryKey: qk.status });
      const prev = qc.getQueryData<{ replyMode?: string }>(qk.status);
      if (prev) qc.setQueryData(qk.status, { ...prev, replyMode: mode });
      return { prev };
    },
    onError: (_e, _mode, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.status, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.status }),
  });
}

/** Set comment and/or DM reply mode independently. */
export function useSetChannelMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { commentMode?: string; dmMode?: string }) => api.post("/api/ig/modes", patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: qk.status });
      const prev = qc.getQueryData<Record<string, unknown>>(qk.status);
      if (prev) qc.setQueryData(qk.status, { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.status, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.status }),
  });
}

// ── watcher ────────────────────────────────────────────────────────────────
export function useWatcher<T = { running?: boolean; startedAt?: number }>(opts?: QOpts<T>) {
  return useQuery<T>({
    queryKey: qk.watcher,
    queryFn: () => api.get<T>("/api/ig/watcher"),
    ...opts,
  });
}

export function useWatcherAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action?: "start" | "stop") =>
      api.post<{ running?: boolean }>("/api/ig/watcher", action ? { action } : undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.watcher }),
  });
}

// ── mentions ───────────────────────────────────────────────────────────────
export function useMentions<T = unknown>(opts?: QOpts<T>) {
  return useQuery<T>({
    queryKey: qk.mentions,
    queryFn: () => api.get<T>("/api/ig/mentions"),
    ...opts,
  });
}

export function useRefreshMentions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ added?: number; error?: string }>("/api/ig/mentions"),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.mentions }),
  });
}

export function useMarkMentionRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch("/api/ig/mentions", { id, read: true }),
    // optimistically flip the mention to read
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.mentions });
      const prev = qc.getQueryData<{ mentions?: { id: string; read?: boolean }[] }>(qk.mentions);
      if (prev?.mentions) {
        qc.setQueryData(qk.mentions, {
          ...prev,
          mentions: prev.mentions.map((m) => (m.id === id ? { ...m, read: true } : m)),
        });
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.mentions, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.mentions }),
  });
}

// ── drafts / clarifications writes ─────────────────────────────────────────
export function useDraftAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.post(`/api/ig/drafts/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.drafts });
      qc.invalidateQueries({ queryKey: ["ig", "comments"] });
    },
  });
}

export function useClarificationAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.post(`/api/ig/clarifications/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.clarifications });
      qc.invalidateQueries({ queryKey: ["ig", "comments"] });
    },
  });
}

export function useReprocess() {
  return useMutation({
    mutationFn: (commentId: string) => api.post("/api/ig/reprocess", { commentId }),
  });
}

// ── connection ─────────────────────────────────────────────────────────────
export function useDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/ig/disconnect"),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.status }),
  });
}

// ── automations ────────────────────────────────────────────────────────────
type AutomationsResp = { automations?: Automation[] };

export function useAutomations(opts?: QOpts<AutomationsResp>) {
  return useQuery<AutomationsResp>({
    queryKey: qk.automations,
    queryFn: () => api.get<AutomationsResp>("/api/ig/automations"),
    ...opts,
  });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ automation: Automation }>("/api/ig/automations", { name: "New Automation" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.automations }),
  });
}

export function usePatchAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Automation> }) =>
      api.patch<{ automation: Automation }>(`/api/ig/automations/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.automations }),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/ig/automations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.automations }),
  });
}

export function useTestAutomation() {
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      api.post<{ steps?: unknown[] }>(`/api/ig/automations/${id}/test`, { text }),
  });
}
