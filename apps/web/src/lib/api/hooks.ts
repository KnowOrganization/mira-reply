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
import { useEffect, useState } from "react";
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
  brainGraph: ["ig", "brain-graph"] as const,
  brainStats: ["ig", "brain-stats"] as const,
  settings: ["ig", "settings"] as const,
  watcher: ["ig", "watcher"] as const,
  mentions: ["ig", "mentions"] as const,
  automations: ["ig", "automations"] as const,
  products: ["ig", "products"] as const,
  conversations: (folder?: string) => ["ig", "crm", "conversations", { folder: folder ?? "" }] as const,
  conversation: (id: string) => ["ig", "crm", "conversations", id] as const,
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

// ── products (DM marketplace) ───────────────────────────────────────────────
export type Product = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  priceText: string | null;
  imageUrl: string | null;
  ctaUrl: string | null;
  available: boolean;
  aliases: string[];
  slug: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export function useProducts(opts?: QOpts<{ products: Product[] }>) {
  return useQuery<{ products: Product[] }>({
    queryKey: qk.products,
    queryFn: () => api.get<{ products: Product[] }>("/api/ig/products"),
    ...opts,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Product> & { title: string }) => api.post<{ product: Product }>("/api/ig/products", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.products }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<Product> & { id: string }) => api.patch<{ product: Product }>(`/api/ig/products/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.products }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/ig/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.products }),
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

export type BrainGraphNode = { id: string; type: string; label: string; subtype: string | null };
export type BrainGraphLink = { source: string; target: string; type: string; weight: number };
export type BrainGraphResp = { nodes: BrainGraphNode[]; links: BrainGraphLink[] };

export function useBrainGraph(opts?: QOpts<BrainGraphResp>) {
  return useQuery<BrainGraphResp>({
    queryKey: qk.brainGraph,
    queryFn: () => api.get<BrainGraphResp>("/api/ig/brain/graph"),
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
    onSettled: () => qc.invalidateQueries({ queryKey: qk.automations }),
  });
}

export function usePatchAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Automation> }) =>
      api.patch<{ automation: Automation }>(`/api/ig/automations/${id}`, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: qk.automations });
      const prev = qc.getQueryData<AutomationsResp>(qk.automations);
      qc.setQueryData<AutomationsResp>(qk.automations, (old) => old ? ({
        ...old,
        automations: (old.automations ?? []).map((a) =>
          a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a
        ),
      }) : old);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.automations, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.automations }),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/ig/automations/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.automations });
      const prev = qc.getQueryData<AutomationsResp>(qk.automations);
      qc.setQueryData<AutomationsResp>(qk.automations, (old) => old ? ({
        ...old,
        automations: (old.automations ?? []).filter((a) => a.id !== id),
      }) : old);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.automations, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.automations }),
  });
}

export function useTestAutomation() {
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      api.post<{ steps?: unknown[] }>(`/api/ig/automations/${id}/test`, { text }),
  });
}

// ── recovered: CRM / Inbox conversations / Opportunities (from 764af50) ──
export function useReplyToComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      api.post(`/api/ig/comments/${encodeURIComponent(id)}/reply`, { text }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ig", "comments"] }),
  });
}

export type CrmConversationListItem = {
  id: string; folder: string; status: string;
  window_expires_at: number | null; human_agent_window_expires_at: number | null;
  assigned_to: string | null; ai_mode: string; notes: string; updated_at: number;
  ai_draft: string | null; ai_draft_at: number | null;
  referral: { source?: string; ref?: string } | null;
  // decision trace (latest decision_log row) — why Mira drafted/asked/declined
  ai_decision: string | null; ai_confidence: number | null; ai_risk: string | null; ai_reason: string | null;
  // a parked "which one?" — set while Mira waits for the user to disambiguate
  pending_slot: { type: string; question?: string; candidates?: { label: string }[] } | null;
  contact_id: string; igsid: string; display_name: string | null;
  tags: string[]; lead_status: string;
  last_text: string | null; last_direction: string | null;
};

export type CrmMessage = {
  id: string; mid: string | null; direction: "in" | "out"; type: string;
  body: { text?: string } & Record<string, unknown>;
  sent_by: "user" | "ai" | "human"; seen_at: number | null; created_at: number;
};

export function useConversations(folder?: string) {
  return useQuery({
    queryKey: qk.conversations(folder),
    queryFn: () => api.get<{ conversations: CrmConversationListItem[] }>(
      `/api/ig/crm/conversations${folder ? `?folder=${encodeURIComponent(folder)}` : ""}`
    ),
    // SSE (useInboxStream) is the primary, instant path; this poll is a tight
    // backstop so a dropped/blocked stream still updates within ~5s, never 30s+.
    refetchInterval: 5_000,
  });
}

export function useSyncDms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (limit: number) =>
      api.post<{ ok: boolean; started: boolean }>(`/api/ig/crm/sync-dms?limit=${limit}`),
    // the import runs server-side fire-and-forget; refetch the lists a few times
    // as threads land (plus the inbox's own 20s poll as a backstop)
    onSuccess: () => {
      const bump = () => {
        qc.invalidateQueries({ queryKey: ["ig", "crm", "conversations"] });
      };
      [1500, 4000, 8000, 14000].forEach((ms) => setTimeout(bump, ms));
    },
  });
}

/**
 * Live inbox via the tenant-scoped SSE stream (/api/ig/stream). When a DM
 * arrives (webhook → Redis bus → SSE), or a draft/reply lands, the server pushes
 * an event and we invalidate the conversation queries — the inbox refetches and
 * shows it within a few hundred ms, no polling wait. `connected` drives the
 * "live" indicator. EventSource auto-reconnects on drop.
 */
export function useInboxStream(): { connected: boolean } {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const es = new EventSource("/api/ig/stream");
    const refetchInbox = () => {
      // prefix-invalidate: refetches the thread list AND any open thread detail
      qc.invalidateQueries({ queryKey: ["ig", "crm", "conversations"] });
    };
    es.onopen = () => {
      setConnected(true);
      // catch up on (re)connect — pull anything that landed while disconnected
      refetchInbox();
    };
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      let ev: { type?: string };
      try { ev = JSON.parse(e.data); } catch { return; }
      if (ev.type === "conversation" || ev.type === "message" || ev.type === "draft" || ev.type === "sent") {
        refetchInbox();
      }
    };
    return () => { es.close(); setConnected(false); };
  }, [qc]);
  return { connected };
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: qk.conversation(id ?? "none"),
    queryFn: () => api.get<{ conversation: CrmConversationListItem; messages: CrmMessage[] }>(
      `/api/ig/crm/conversations/${id}`
    ),
    enabled: !!id,
    // open thread updates near-instantly via SSE; this is the backstop
    refetchInterval: 5_000,
  });
}

export function useSendReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      api.post<{ ok: true; messageId: string; via: string }>(`/api/ig/crm/conversations/${id}/send`, { text }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.conversation(vars.id) });
      qc.invalidateQueries({ queryKey: ["ig", "crm", "conversations"] });
    },
  });
}

export function usePatchConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      api.patch(`/api/ig/crm/conversations/${id}`, patch),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.conversation(vars.id) });
      qc.invalidateQueries({ queryKey: ["ig", "crm", "conversations"] });
    },
  });
}

// ── Phase 2: AI settings, KB, analytics ───────────────────────────────────────

export type AiSettings = {
  provider: "nim";
  byokKeySet: boolean;
  model: string;
  voice: { toneSummary: string; styleSampleCount: number };
};

export type KbEntry = { id: string; question: string; answer: string; tags: string[] };

export type CrmAnalytics = {
  avgResponseMs: number | null; responseSamples: number;
  leadsCaptured: number; contactsTotal: number;
  conversationsTotal: number; pendingDrafts: number;
};

export function useAiSettings() {
  return useQuery({
    queryKey: ["ig", "ai-settings"],
    queryFn: () => api.get<AiSettings>("/api/ig/ai-settings"),
  });
}

export function usePatchAiSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { provider?: string; byokKey?: string | null }) =>
      api.patch("/api/ig/ai-settings", patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ig", "ai-settings"] }),
  });
}

export function useKb() {
  return useQuery({
    queryKey: ["ig", "kb"],
    queryFn: () => api.get<{ entries: KbEntry[] }>("/api/ig/kb"),
  });
}

export function useAddKb() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entry: { question: string; answer: string; tags?: string[] }) =>
      api.post<{ entry: KbEntry }>("/api/ig/kb", entry),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ig", "kb"] }),
  });
}

export function useDeleteKb() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/ig/kb/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ig", "kb"] }),
  });
}

export function useCrmAnalytics() {
  return useQuery({
    queryKey: ["ig", "crm", "analytics"],
    queryFn: () => api.get<CrmAnalytics>("/api/ig/crm/analytics"),
    refetchInterval: 60_000,
  });
}

// ── opportunities ─────────────────────────────────────────────────────────────

export type Opportunity = {
  id: string; type: string; confidence: number; value_estimate: number | null;
  status: string; reason: string | null; notes: string | null;
  detected_at: number; conversation_id: string;
  igsid: string; display_name: string | null; lead_status: string;
  last_text?: string | null;
};

export type OpportunityDetail = {
  opportunity: Opportunity & { contact_id: string; tags: string[]; email: string | null; phone: string | null };
  messages: CrmMessage[];
};

export function useOpportunities(status?: string) {
  return useQuery({
    queryKey: ["ig", "opportunities", { status: status ?? "" }],
    queryFn: () => api.get<{ opportunities: Opportunity[] }>(`/api/ig/crm/opportunities${status ? `?status=${status}` : ""}`),
    refetchInterval: 15_000, // backstop; live updates via useOpportunityStream
  });
}

export function useOpportunity(id: string | null) {
  return useQuery({
    queryKey: ["ig", "opportunities", "detail", id ?? "none"],
    queryFn: () => api.get<OpportunityDetail>(`/api/ig/crm/opportunities/${id}`),
    enabled: !!id,
    refetchInterval: 10_000,
  });
}

export function usePatchOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; status?: string; value_estimate?: number | null; notes?: string }) =>
      api.patch(`/api/ig/crm/opportunities/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ig", "opportunities"] }),
  });
}

/** Live board: SSE pushes a tenant-scoped `opportunity` event when one is
 *  detected/updated → invalidate the list so the Kanban updates instantly. */
export function useOpportunityStream(): { connected: boolean } {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const es = new EventSource("/api/ig/stream");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      let ev: { type?: string };
      try { ev = JSON.parse(e.data); } catch { return; }
      if (ev.type === "opportunity") qc.invalidateQueries({ queryKey: ["ig", "opportunities"] });
    };
    return () => { es.close(); setConnected(false); };
  }, [qc]);
  return { connected };
}

// ── Account Brain ─────────────────────────────────────────────────────────────

export type BrainStatus = {
  builtAt: number | null;
  toneSummary: string;
  styleSampleCount: number;
  ownerProfile: { bio?: string; voice?: string; defaultLanguage?: string } | null;
  factCount: number;
  kbCount: number;
  audienceMap: { themes?: { label: string; count: number }[]; topCommenters?: { username: string; count: number }[]; sampleSize?: number } | null;
  gaps: string[];
};

export function useBrainStatus() {
  return useQuery({
    queryKey: ["ig", "brain", "status"],
    queryFn: () => api.get<BrainStatus>("/api/ig/brain/status"),
    refetchInterval: (q) => (q.state.data?.builtAt ? false : 8000), // poll until first build lands
  });
}

export function useRebuildBrain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ ok: true; status: string }>("/api/ig/brain/rebuild"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ig", "brain", "status"] }),
  });
}
