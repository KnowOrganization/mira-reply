"use client";
// View-skeleton registry — the "auto-apply" foundation. Maps a top-level view
// (+ optional sub) to its full skeleton, so:
//   • CanvasLayout renders <ViewSkeleton view={view} sub={subView}/> for EVERY
//     Suspense fallback — adding a new view needs no CanvasLayout change beyond
//     registering its skeleton here (or via registerViewSkeleton at runtime).
//   • A generic PageSkeleton covers anything unregistered, so nothing ever
//     falls back to a blank screen.

import { ReactNode } from "react";
import { Skeleton, SkLine, SkCard, SkRepeat } from "./primitives";
import {
  InboxSkeleton, OpportunitiesSkeleton, CatalogSkeleton,
  BroadcastsSkeleton, AutomationsSkeleton, AnalyticsSkeleton, DashboardSkeleton,
  KnowledgeSkeleton, SettingsSkeleton,
} from "./views";

/** Generic centered-page fallback for unregistered views. */
export function PageSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "var(--bg-frame)" }}>
      <div className="max-w-[760px] flex flex-col gap-3">
        <SkLine w={160} h={16} />
        <div className="h-1" />
        <SkRepeat n={6}>{(i) => (
          <SkCard key={i} p={14}>
            <SkLine w={`${50 + (i % 3) * 14}%`} h={12} />
            <div className="mt-2"><Skeleton w="100%" h={34} r={8} /></div>
          </SkCard>
        )}</SkRepeat>
      </div>
    </div>
  );
}

type SkFn = (sub?: string) => ReactNode;

const REGISTRY: Record<string, SkFn> = {
  dashboard: () => <DashboardSkeleton />,
  inbox: (sub) => <InboxSkeleton sub={sub} />,
  opportunities: () => <OpportunitiesSkeleton />,
  catalog: () => <CatalogSkeleton />,
  broadcasts: () => <BroadcastsSkeleton />,
  automations: (sub) => <AutomationsSkeleton sub={sub} />,
  analytics: () => <AnalyticsSkeleton />,
  knowledge: () => <KnowledgeSkeleton />,
  settings: () => <SettingsSkeleton />,
};

/** Resolve the skeleton for a view; unknown views get the generic page. */
export function viewSkeletonFor(view?: string, sub?: string): ReactNode {
  return (view && REGISTRY[view]?.(sub)) ?? <PageSkeleton />;
}

/** Register / override a view skeleton at runtime (future views). */
export function registerViewSkeleton(view: string, fn: SkFn) {
  REGISTRY[view] = fn;
}

// Back-compat: the old API took `kind`. Map the 4 legacy kinds to a view.
const KIND_TO_VIEW: Record<string, string> = {
  list: "inbox",
  board: "opportunities",
  dashboard: "dashboard",
  page: "__page__",
};

/** Suspense fallback entry point. Prefer `view`; `kind` kept for back-compat. */
export function ViewSkeleton({
  view,
  sub,
  kind,
}: {
  view?: string;
  sub?: string;
  kind?: "list" | "board" | "dashboard" | "page";
}) {
  const resolved = view ?? (kind ? KIND_TO_VIEW[kind] : undefined);
  return <>{viewSkeletonFor(resolved, sub)}</>;
}
