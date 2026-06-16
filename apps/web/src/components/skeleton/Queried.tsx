"use client";
// <Queried> — a reusable data boundary that standardizes the loading → skeleton
// → empty → error → data flow so every view (current or future) handles it the
// same way. Pass the query + the matching skeleton; get a render-prop with
// non-null data. This is the second half of the "auto-apply skeleton" story:
// new views wrap their query and inherit a detailed skeleton + tidy states for
// free, instead of hand-rolling `isLoading && <text>` each time.
//
//   <Queried
//     query={list}
//     skeleton={<SkRepeat n={6}>{(i) => <SkRunRow key={i} />}</SkRepeat>}
//     isEmpty={(d) => d.rows.length === 0}
//     empty={<EmptyState />}
//   >
//     {(d) => d.rows.map((r) => <Row key={r.id} r={r} />)}
//   </Queried>

import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

/** Minimal slice of a TanStack query result — keeps callers decoupled. */
type QueryLike<T> = {
  isLoading: boolean;
  isError?: boolean;
  data: T | undefined;
  refetch?: () => unknown;
};

export function DefaultError({ onRetry }: { onRetry?: () => unknown }) {
  return (
    <div className="p-6 text-center text-xs flex flex-col items-center gap-2" style={{ color: "#ef4444" }}>
      <AlertTriangle size={16} /> Failed to load.
      {onRetry && <button className="underline" onClick={() => onRetry()}>Retry</button>}
    </div>
  );
}

export function Queried<T>({
  query,
  skeleton,
  empty,
  error,
  isEmpty,
  children,
}: {
  query: QueryLike<T>;
  skeleton: ReactNode;
  empty?: ReactNode;
  error?: ReactNode;
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}) {
  // isLoading (not isFetching) → cache hits skip the skeleton; background
  // revalidation never flashes it.
  if (query.isLoading) return <>{skeleton}</>;
  if (query.isError) return <>{error ?? <DefaultError onRetry={query.refetch} />}</>;
  const data = query.data as T;
  if (empty && isEmpty?.(data)) return <>{empty}</>;
  return <>{children(data)}</>;
}
