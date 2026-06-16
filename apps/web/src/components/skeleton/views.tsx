"use client";
// Full-view skeletons — reproduce each view's real outer shell (same flex,
// widths, paddings) so the swap to real content causes no layout shift. Used as
// Suspense fallbacks (whole-view, code-split load). Compose unit blueprints.

import { ReactNode } from "react";
import { Skeleton, SkLine, SkText, SkCircle, SkButton, SkCard, SkRepeat } from "./primitives";
import {
  SkThreadRow, SkCommentCard, SkMentionRow, SkOppCard, SkProductCard,
  SkBroadcastRow, SkRunRow, SkTemplateCard, SkRailRow, SkKpiTile, SkStatTile, SkBars,
  SkRing, SkBarList, SkFunnel, SkSpark, SkHeatmap, SkDayCard, SkFactRow, SkProfileHeader,
  SkRowStack,
} from "./units";

/* A section card with a title/sub header — mirrors Analytics' <Section>. */
function SkSection({ titleW = 140, subW = 220, children }: { titleW?: number; subW?: number; children: ReactNode }) {
  return (
    <SkCard p={20} r={16}>
      <div className="flex items-center gap-2 mb-3">
        <Skeleton w={15} h={15} r={4} />
        <SkLine w={titleW} h={14} />
      </div>
      <div className="mb-4"><SkLine w={subW} h={10} /></div>
      {children}
    </SkCard>
  );
}

/* ───────────────────────── Inbox ───────────────────────── */

export function InboxSkeleton({ sub }: { sub?: string }) {
  if (sub === "comments") {
    return (
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-[680px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1"><SkRepeat n={4}>{(i) => <SkButton key={i} w={56} h={26} />}</SkRepeat></div>
            <SkButton w={140} h={28} />
          </div>
          <div className="flex flex-col gap-2.5"><SkRepeat n={5}>{(i) => <SkCommentCard key={i} i={i} />}</SkRepeat></div>
        </div>
      </div>
    );
  }
  if (sub === "mentions") {
    return (
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-[680px]">
          <div className="flex items-center justify-between mb-3">
            <SkLine w={80} h={11} />
            <div className="flex gap-1.5"><SkButton w={96} h={28} /><SkButton w={110} h={28} /></div>
          </div>
          <div className="flex flex-col gap-2.5"><SkRepeat n={5}>{(i) => <SkMentionRow key={i} i={i} />}</SkRepeat></div>
        </div>
      </div>
    );
  }
  // dms (default) — two-pane
  return (
    <div className="flex-1 flex min-h-0">
      <div className="w-[300px] shrink-0 flex flex-col border-r" style={{ borderColor: "var(--border)" }}>
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <SkLine w={54} h={13} />
            <SkButton w={54} h={24} />
          </div>
          <div className="flex gap-1 mt-2"><SkRepeat n={3}>{(i) => <SkButton key={i} w={48} h={22} />}</SkRepeat></div>
        </div>
        <div className="flex-1 overflow-y-auto"><SkRepeat n={7}>{(i) => <SkThreadRow key={i} i={i} />}</SkRepeat></div>
      </div>
      <div className="flex-1 flex items-center justify-center"><SkLine w={140} h={12} /></div>
    </div>
  );
}

/* ───────────────────────── Opportunities ───────────────────────── */

export function OpportunitiesSkeleton() {
  return (
    <div className="flex-1 flex min-h-0" style={{ background: "var(--bg-frame)" }}>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-5 pt-4 pb-2 flex items-center gap-2 shrink-0">
          <Skeleton w={15} h={15} r={4} />
          <SkLine w={110} h={14} />
          <Skeleton w={40} h={16} r={999} />
          <div className="ml-1"><SkLine w={120} h={10} /></div>
        </div>
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-5 pb-4">
          <div className="flex gap-3 h-full">
            <SkRepeat n={3}>{(c) => (
              <div key={c} className="w-[210px] shrink-0 flex flex-col rounded-xl" style={{ border: "1px solid var(--border)" }}>
                <div className="px-2.5 py-2 flex items-center gap-1.5 border-b" style={{ borderColor: "var(--border)" }}>
                  <Skeleton w={7} h={7} circle />
                  <SkLine w={90} h={11} />
                  <div className="ml-auto"><SkLine w={16} h={10} /></div>
                </div>
                <div className="flex-1 p-2 flex flex-col gap-2">
                  <SkRepeat n={2 + (c % 2)}>{(i) => <SkOppCard key={i} i={i} />}</SkRepeat>
                </div>
              </div>
            )}</SkRepeat>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Catalog ───────────────────────── */

export function CatalogSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "var(--bg-frame)" }}>
      <div className="max-w-[760px]">
        <SkLine w={90} h={14} />
        <div className="mt-2 mb-4"><SkLine w={260} h={10} /></div>
        <SkCard p={12} className="mb-5">
          <div className="grid grid-cols-2 gap-2">
            <SkRepeat n={5}>{(i) => <Skeleton key={i} w="100%" h={30} r={8} />}</SkRepeat>
            <Skeleton w="100%" h={36} r={8} style={{ gridColumn: "span 2" }} />
          </div>
        </SkCard>
        <div className="grid grid-cols-2 gap-3"><SkRepeat n={6}>{(i) => <SkProductCard key={i} />}</SkRepeat></div>
      </div>
    </div>
  );
}

/* ───────────────────────── Broadcasts ───────────────────────── */

export function BroadcastsSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "var(--bg-frame)" }}>
      <div className="max-w-[680px]">
        <SkLine w={100} h={14} />
        <div className="mt-2 mb-4"><SkLine w={300} h={10} /></div>
        <SkCard p={12} className="mb-5">
          <Skeleton w="100%" h={32} r={8} />
          <div className="flex gap-2 mt-2"><Skeleton w="100%" h={32} r={8} style={{ flex: 1 }} /><SkButton w={110} h={32} /></div>
        </SkCard>
        <div className="flex flex-col gap-2.5 mb-8"><SkRepeat n={4}>{(i) => <SkBroadcastRow key={i} />}</SkRepeat></div>
        <SkLine w={140} h={11} />
        <div className="mt-2 flex flex-col gap-2"><SkRepeat n={5}>{(i) => <SkLine key={i} w="100%" h={12} />}</SkRepeat></div>
      </div>
    </div>
  );
}

/* ───────────────────────── Automations ───────────────────────── */

export function AutomationsSkeleton({ sub }: { sub?: string }) {
  const main =
    sub === "create" || sub === "templates" ? (
      <div className="p-6" style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <SkLine w={160} h={15} />
        <div className="mt-2 mb-5"><SkLine w={260} h={11} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          <SkRepeat n={6}>{(i) => <SkTemplateCard key={i} />}</SkRepeat>
        </div>
      </div>
    ) : sub === "history" ? (
      <div style={{ padding: "20px 22px", width: "100%" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <SkLine w={160} h={15} />
          <div className="mt-2 mb-4"><SkLine w={240} h={11} /></div>
          <div className="flex flex-col gap-1.5"><SkRepeat n={6}>{(i) => <SkRunRow key={i} />}</SkRepeat></div>
        </div>
      </div>
    ) : (
      // canvas
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2.5 px-4 border-b" style={{ height: 60, borderColor: "var(--border)" }}>
          <Skeleton w={22} h={22} r={6} />
          <SkLine w={140} h={13} />
          <Skeleton w={8} h={8} circle />
          <div className="ml-auto"><SkButton w={90} h={28} /></div>
        </div>
        <div className="flex-1 flex items-center justify-center" style={{ background: "var(--bg)" }}>
          <Skeleton w={240} h={120} r={12} />
        </div>
      </div>
    );

  return (
    <div className="flex-1 flex min-h-0">
      <div className="shrink-0 flex flex-col items-center py-2" style={{ width: 44, borderRight: "1px solid var(--border)", background: "var(--bg-sidebar)" }}>
        <div className="mb-2"><Skeleton w={20} h={20} r={6} /></div>
        <SkRepeat n={5}>{(i) => <SkRailRow key={i} />}</SkRepeat>
      </div>
      <div className="flex-1 flex min-w-0 overflow-auto">{main}</div>
    </div>
  );
}

/* ───────────────────────── Analytics ───────────────────────── */

export function AnalyticsSkeleton({ inner = false }: { inner?: boolean }) {
  const sections = (
    <>
      <SkSection titleW={140} subW={300}>
        <SkHeatmap />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-4">
          <SkRepeat n={7}>{(i) => <SkDayCard key={i} />}</SkRepeat>
        </div>
      </SkSection>
      <SkSection titleW={110} subW={320}><SkBarList rows={8} /></SkSection>
      <div className="grid md:grid-cols-2 gap-4">
        <SkSection titleW={130} subW={180}>
          <div className="flex gap-2"><SkRepeat n={3}>{(i) => <SkStatTile key={i} />}</SkRepeat></div>
        </SkSection>
        <SkSection titleW={110} subW={160}><SkBarList rows={6} /></SkSection>
      </div>
      <SkSection titleW={150} subW={220}>
        <SkFunnel stages={5} />
        <div className="flex gap-2 mt-3"><SkRepeat n={4}>{(i) => <SkStatTile key={i} />}</SkRepeat></div>
      </SkSection>
      <SkSection titleW={170} subW={200}>
        <div className="flex gap-2 mb-3"><SkRepeat n={3}>{(i) => <SkStatTile key={i} />}</SkRepeat></div>
        <div className="flex flex-col gap-2">
          <SkRepeat n={3}>{(i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton w={36} h={36} r={6} />
              <SkLine w="50%" h={11} />
              <div className="ml-auto"><SkLine w={120} h={10} /></div>
            </div>
          )}</SkRepeat>
        </div>
      </SkSection>
      <div className="grid md:grid-cols-2 gap-4">
        <SkSection titleW={110} subW={120}><SkBarList rows={6} /></SkSection>
        <SkSection titleW={120} subW={120}><SkBarList rows={6} /></SkSection>
      </div>
      <SkSection titleW={140} subW={160}><SkSpark /></SkSection>
    </>
  );

  if (inner) return sections;

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "var(--bg-frame)" }}>
      <div className="max-w-[1040px] mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Skeleton w={16} h={16} r={4} />
          <SkLine w={110} h={16} />
          <div className="flex gap-1 ml-auto"><SkRepeat n={3}>{(i) => <SkButton key={i} w={60} h={26} />}</SkRepeat></div>
        </div>
        {sections}
      </div>
    </div>
  );
}

/* ───────────────────────── Dashboard ───────────────────────── */

function SkBentoCard({ titleW = 100, children }: { titleW?: number; children: ReactNode }) {
  return (
    <SkCard p={16} r={16}>
      <div className="flex items-center gap-2 mb-3">
        <Skeleton w={14} h={14} r={4} />
        <SkLine w={titleW} h={12} />
      </div>
      {children}
    </SkCard>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex-1 flex min-h-0" style={{ background: "var(--bg-frame)" }}>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[1100px] mx-auto flex flex-col gap-4">
          <SkProfileHeader />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <SkRepeat n={6}>{(i) => <SkKpiTile key={i} />}</SkRepeat>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <SkBentoCard titleW={90}><SkRing /></SkBentoCard>
            <SkBentoCard titleW={110}><SkBars n={14} /></SkBentoCard>
            <SkBentoCard titleW={120}><div className="flex flex-col gap-2"><Skeleton w={120} h={18} r={5} /><SkText lines={2} h={10} lastW="70%" /></div></SkBentoCard>
            <SkBentoCard titleW={100}><SkRowStack n={3} lead="icon" lines={2} /></SkBentoCard>
            <SkBentoCard titleW={70}>
              <div className="flex gap-4 mb-2.5"><Skeleton w={40} h={16} r={5} /><Skeleton w={40} h={16} r={5} /></div>
              <SkRowStack n={3} lead="circle" lines={1} right={false} />
            </SkBentoCard>
            <SkBentoCard titleW={90}><SkRowStack n={3} lead="thumb" lines={1} /></SkBentoCard>
            <SkBentoCard titleW={120}><SkRowStack n={4} lead="circle" lines={1} /></SkBentoCard>
            <SkBentoCard titleW={110}>
              <div className="mb-2"><Skeleton w={40} h={22} r={6} /></div>
              <SkRowStack n={3} lead="none" lines={1} right={false} />
            </SkBentoCard>
            <SkBentoCard titleW={110}><SkFunnel stages={4} /><div className="mt-2"><SkLine w="60%" h={11} /></div></SkBentoCard>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SkRepeat n={4}>{(i) => <Skeleton key={i} w="100%" h={48} r={16} />}</SkRepeat>
          </div>
        </div>
      </div>
      <div className="w-[300px] shrink-0 flex-col px-5 py-5 hidden lg:flex" style={{ borderLeft: "1px solid var(--border)", background: "var(--bg-sidebar)" }}>
        <SkLine w={120} h={13} />
        <div className="mt-4 flex flex-col gap-3">
          <SkRepeat n={6}>{(i) => (
            <div key={i} className="flex items-start gap-2">
              <SkCircle size={24} />
              <div className="flex-1 flex flex-col gap-1.5">
                <SkLine w={`${60 + (i % 3) * 12}%`} h={10} />
                <SkLine w="40%" h={9} />
              </div>
            </div>
          )}</SkRepeat>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Knowledge ───────────────────────── */

export function KnowledgeSkeleton() {
  return (
    <div className="space-y-3">
      <SkCard p={12}>
        <Skeleton w="100%" h={34} r={8} />
        <div className="mt-2"><Skeleton w="100%" h={46} r={8} /></div>
        <div className="mt-2 flex justify-end"><SkButton w={110} h={30} /></div>
      </SkCard>
      <SkLine w={120} h={11} />
      <div className="space-y-1.5"><SkRepeat n={6}>{(i) => <SkFactRow key={i} />}</SkRepeat></div>
    </div>
  );
}

/* ───────────────────────── Settings ───────────────────────── */

export function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-5" style={{ width: 280 }}>
      <SkRepeat n={5}>{(i) => (
        <div key={i} className="flex flex-col gap-2">
          <SkLine w={90} h={10} />
          <SkCard p={12}><SkText lines={2} h={11} lastW="55%" /></SkCard>
        </div>
      )}</SkRepeat>
    </div>
  );
}
