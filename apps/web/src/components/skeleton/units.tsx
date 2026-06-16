"use client";
// Unit blueprints — one skeleton per real repeated row / card / chart, with
// dimensions tuned to the actual component so the swap to real data causes no
// layout shift. Compose from ./primitives only. Widths/heights are derived from
// the item index (deterministic) to stay SSR/CSR-stable.

import { Skeleton, SkLine, SkText, SkCircle, SkChip, SkThumb, SkButton, SkCard, SkRepeat } from "./primitives";

/* ───────────────────────── Inbox ───────────────────────── */

/** DM thread row — avatar + name/preview + time + window meta. (InboxView list) */
export function SkThreadRow({ i = 0 }: { i?: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
      <SkCircle size={32} />
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <SkLine w={`${48 + (i % 3) * 12}%`} h={12} />
          <SkLine w={26} h={9} />
        </div>
        <SkLine w="78%" h={11} />
      </div>
    </div>
  );
}

/** A chat bubble — alternating side, varied width/height. (InboxView detail) */
export function SkMessageBubble({ i = 0 }: { i?: number }) {
  const mine = i % 2 === 1;
  const w = [62, 44, 70, 52, 38, 58][i % 6] + "%";
  const h = i % 3 === 0 ? 46 : 32;
  return (
    <div className={`flex px-4 py-1 ${mine ? "justify-end" : "justify-start"}`}>
      <Skeleton w={w} h={h} r={16} style={{ maxWidth: "70%", background: mine ? "var(--accent-soft)" : "var(--bg-elev)" }} />
    </div>
  );
}

/** Comment card — avatar+name+time / caption / body / status chip. */
export function SkCommentCard({ i = 0 }: { i?: number }) {
  return (
    <SkCard p={14} r={14}>
      <div className="flex items-center gap-2.5">
        <SkCircle size={32} />
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <SkLine w={`${36 + (i % 3) * 10}%`} h={12} />
          <SkLine w="62%" h={9} />
        </div>
        <SkChip w={54} h={16} />
      </div>
      <div className="mt-2.5">
        <SkText lines={2} h={12} lastW="55%" />
      </div>
    </SkCard>
  );
}

/** Mention row — thumbnail + badge + line + actions. */
export function SkMentionRow({ i = 0 }: { i?: number }) {
  return (
    <SkCard p={14} r={14}>
      <div className="flex gap-3">
        <SkThumb size={48} r={8} />
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <SkChip w={64} h={14} />
            <SkLine w={`${70 + (i % 2) * 20}px`} h={11} />
            <SkLine w={24} h={10} />
          </div>
          <SkLine w="88%" h={11} />
          <div className="flex items-center gap-2 mt-0.5">
            <SkButton w={96} h={14} />
            <SkButton w={60} h={14} />
          </div>
        </div>
      </div>
    </SkCard>
  );
}

/* ───────────────────────── Opportunities ───────────────────────── */

/** Opportunity kanban card. */
export function SkOppCard({ i = 0 }: { i?: number }) {
  return (
    <SkCard p={10} r={12}>
      <div className="flex items-center gap-1.5">
        <Skeleton w={20} h={20} r={6} />
        <SkLine w={`${50 + (i % 3) * 12}%`} h={11} />
        <div className="ml-auto"><SkChip w={32} h={14} /></div>
      </div>
      <div className="mt-1.5"><SkLine w="68%" h={10} /></div>
      <div className="mt-1.5 flex items-center justify-between">
        <SkLine w={50} h={10} />
        <SkLine w={24} h={9} />
      </div>
    </SkCard>
  );
}

/** Opportunity drawer body. */
export function SkOppDrawerBody() {
  return (
    <div className="flex flex-col gap-3.5 p-4">
      <div className="flex items-center justify-between">
        <SkLine w={120} h={15} />
        <SkChip w={64} h={18} />
      </div>
      <SkLine w={160} h={11} />
      <SkCard p={10}><SkText lines={2} h={11} lastW="50%" /></SkCard>
      <Skeleton w="100%" h={30} r={8} />
      <div className="flex flex-wrap gap-2">
        <SkRepeat n={3}>{(i) => <SkButton key={i} w={70} h={24} />}</SkRepeat>
      </div>
      <Skeleton w="100%" h={60} r={8} />
      <Skeleton w="100%" h={36} r={8} />
      <div className="flex flex-col gap-1">
        <SkRepeat n={3}>{(i) => <SkMessageBubble key={i} i={i} />}</SkRepeat>
      </div>
    </div>
  );
}

/* ───────────────────────── Catalog ───────────────────────── */

/** Product card (2-col grid). */
export function SkProductCard() {
  return (
    <SkCard p={12} r={14}>
      <div className="flex gap-3">
        <SkThumb size={56} r={8} />
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <SkLine w="70%" h={12} />
          <SkLine w="50%" h={11} />
          <div className="flex gap-1.5">
            <SkChip w={40} h={14} />
            <SkChip w={30} h={14} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton w={14} h={14} r={4} />
          <Skeleton w={14} h={14} r={4} />
        </div>
      </div>
    </SkCard>
  );
}

/* ───────────────────────── Broadcasts ───────────────────────── */

export function SkBroadcastRow() {
  return (
    <SkCard p={14} r={14}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <SkLine w="80%" h={12} />
          <SkLine w="40%" h={10} />
        </div>
        <SkChip w={70} h={18} />
        <SkButton w={110} h={30} />
      </div>
    </SkCard>
  );
}

/* ───────────────────────── Automations ───────────────────────── */

/** Execution-history run row. */
export function SkRunRow() {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "var(--bg-elev-2)", border: "1px solid var(--border)" }}>
      <Skeleton w={30} h={30} r={8} />
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <SkLine w={140} h={12} />
        <SkLine w={90} h={10} />
      </div>
      <SkChip w={56} h={16} />
      <SkLine w={48} h={10} />
    </div>
  );
}

/** Template gallery card. */
export function SkTemplateCard() {
  return (
    <SkCard p={16} r={14} elev2 style={{ minHeight: 116 }}>
      <div className="flex items-center gap-2.5">
        <Skeleton w={32} h={32} r={9} />
        <SkLine w={120} h={13} />
      </div>
      <div className="mt-2.5"><SkText lines={2} h={11} lastW="60%" /></div>
      <div className="flex gap-1.5 mt-3">
        <SkRepeat n={4}>{(i) => <SkChip key={i} w={48} h={16} />}</SkRepeat>
      </div>
    </SkCard>
  );
}

/** Collapsed automations rail row — a status dot centered in the 44px gutter. */
export function SkRailRow() {
  return (
    <div className="flex items-center justify-center" style={{ height: 32, width: 44 }}>
      <Skeleton w={6} h={6} circle />
    </div>
  );
}

/* ───────────────────────── Tiles & charts (Dashboard / Analytics) ───────────────────────── */

/** Dashboard KPI tile. */
export function SkKpiTile() {
  return (
    <SkCard p={14} r={16}>
      <div className="flex items-center gap-2">
        <Skeleton w={24} h={24} r={8} />
        <SkLine w={60} h={9} />
      </div>
      <div className="mt-2.5"><Skeleton w={64} h={24} r={6} /></div>
      <div className="mt-2"><SkLine w={40} h={9} /></div>
    </SkCard>
  );
}

/** Analytics stat tile. */
export function SkStatTile() {
  return (
    <div className="flex-1 rounded-xl p-3" style={{ background: "var(--bg-elev-2)", border: "1px solid var(--border)", minWidth: 110 }}>
      <Skeleton w={54} h={22} r={6} />
      <div className="mt-1.5"><SkLine w={70} h={9} /></div>
    </div>
  );
}

/** Bar chart — varied-height bars. */
export function SkBars({ n = 14, height = 72 }: { n?: number; height?: number }) {
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      <SkRepeat n={n}>{(i) => (
        <Skeleton key={i} w="100%" h={`${28 + ((i * 37) % 68)}%`} r={3} style={{ flex: 1 }} />
      )}</SkRepeat>
    </div>
  );
}

/** Coverage ring + 2×2 mini stats. */
export function SkRing() {
  return (
    <div className="flex items-center gap-4">
      <SkCircle size={56} />
      <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 flex-1">
        <SkRepeat n={4}>{(i) => (
          <div key={i} className="flex flex-col gap-1">
            <Skeleton w={26} h={15} r={5} />
            <SkLine w={50} h={9} />
          </div>
        )}</SkRepeat>
      </div>
    </div>
  );
}

/** Ranked bar list (signal mix / taps / audience). */
export function SkBarList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <SkRepeat n={rows}>{(i) => (
        <div key={i} className="flex items-center gap-2">
          <SkLine w={`${30 + (i % 4) * 10}%`} h={11} />
          <Skeleton w="100%" h={14} r={999} style={{ flex: 1, opacity: 0.6 }} />
          <SkLine w={36} h={11} />
        </div>
      )}</SkRepeat>
    </div>
  );
}

/** Conversion funnel — stages with arrows. */
export function SkFunnel({ stages = 5 }: { stages?: number }) {
  return (
    <div className="flex items-stretch gap-1.5 flex-wrap">
      <SkRepeat n={stages}>{(i) => (
        <div key={i} className="flex items-center gap-1.5">
          <SkCard p={10} r={12} style={{ minWidth: 96 }}>
            <Skeleton w={40} h={20} r={6} />
            <div className="mt-1.5"><SkLine w={60} h={9} /></div>
            <div className="mt-1"><SkLine w={44} h={8} /></div>
          </SkCard>
          {i < stages - 1 && <Skeleton w={8} h={8} r={2} />}
        </div>
      )}</SkRepeat>
    </div>
  );
}

/** Spark line (growth) — single block + axis footer. */
export function SkSpark() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton w="100%" h={70} r={8} />
      <div className="flex items-center justify-between">
        <SkRepeat n={3}>{(i) => <SkLine key={i} w={70} h={10} />}</SkRepeat>
      </div>
    </div>
  );
}

/** Best-time heatmap — 7 row bars + day labels + legend (NOT 168 cells). */
export function SkHeatmap() {
  return (
    <div className="flex flex-col gap-1.5">
      <SkRepeat n={7}>{(i) => (
        <div key={i} className="flex items-center gap-2">
          <SkLine w={26} h={9} />
          <Skeleton w="100%" h={20} r={4} style={{ flex: 1 }} />
        </div>
      )}</SkRepeat>
      <div className="flex items-center gap-1.5 mt-1">
        <SkLine w={30} h={9} />
        <SkRepeat n={5}>{(i) => <Skeleton key={i} w={16} h={12} r={3} />}</SkRepeat>
        <SkLine w={44} h={9} />
      </div>
    </div>
  );
}

/** Per-day best-slot card (7 across in Analytics). */
export function SkDayCard() {
  return (
    <div className="rounded-xl p-2.5 flex flex-col gap-1.5 items-center" style={{ background: "var(--bg-elev-2)", border: "1px solid var(--border)" }}>
      <SkLine w={30} h={9} />
      <Skeleton w={48} h={16} r={5} />
      <SkLine w={36} h={8} />
    </div>
  );
}

/* ───────────────────────── Knowledge ───────────────────────── */

export function SkFactRow() {
  return (
    <div className="flex gap-2.5 rounded-lg p-2.5" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}>
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <SkLine w="44%" h={13} />
          <SkChip w={40} h={16} />
          <SkChip w={46} h={16} />
        </div>
        <SkText lines={2} h={12} lastW="70%" />
      </div>
      <Skeleton w={12} h={12} r={3} />
    </div>
  );
}

/* ───────────────────────── Dashboard composites ───────────────────────── */

/** Profile header card (avatar + name + 4 stat pairs). */
export function SkProfileHeader() {
  return (
    <SkCard p={16} r={16}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <SkCircle size={56} />
          <div className="flex flex-col gap-2 min-w-0">
            <SkLine w={150} h={16} />
            <SkLine w={110} h={11} />
            <SkLine w={190} h={11} />
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-5">
          <SkRepeat n={4}>{(i) => (
            <div key={i} className="flex flex-col items-end gap-1.5">
              <Skeleton w={30} h={16} r={5} />
              <SkLine w={42} h={9} />
            </div>
          )}</SkRepeat>
        </div>
      </div>
    </SkCard>
  );
}

/**
 * Generic row-stack body for bento cards (opportunities / inbox / posts /
 * commenters / automations). `lead` picks the leading visual.
 */
export function SkRowStack({
  n = 3,
  lead = "circle",
  lines = 1,
  right = true,
}: {
  n?: number;
  lead?: "circle" | "thumb" | "icon" | "none";
  lines?: number;
  right?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <SkRepeat n={n}>{(i) => (
        <div key={i} className="flex items-center gap-2.5">
          {lead === "circle" && <SkCircle size={20} />}
          {lead === "thumb" && <SkThumb size={32} r={6} />}
          {lead === "icon" && <Skeleton w={24} h={24} r={6} />}
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <SkLine w={`${55 + (i % 3) * 12}%`} h={11} />
            {lines > 1 && <SkLine w="40%" h={9} />}
          </div>
          {right && <SkLine w={36} h={10} />}
        </div>
      )}</SkRepeat>
    </div>
  );
}
