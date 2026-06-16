"use client";
// ViewBoot — shows a view's full detailed skeleton for a brief minimum on every
// entry, THEN reveals the real content. Without this, the persisted TanStack
// cache (localStorage) hydrates data instantly, so `isLoading` is false and the
// skeletons are almost never seen. ViewBoot guarantees the skeleton is visible
// on each navigation while keeping the reveal fast.
//
// Tunable: set VIEW_BOOT_MS to 0 to restore pure instant-load (no hold).

import { ReactNode, useEffect, useState } from "react";
import { viewSkeletonFor } from "./registry";

export const VIEW_BOOT_MS = 550;

export function ViewBoot({
  view,
  sub,
  minMs = VIEW_BOOT_MS,
  children,
}: {
  view: string;
  sub?: string;
  minMs?: number;
  children: ReactNode;
}) {
  const [booting, setBooting] = useState(minMs > 0);

  useEffect(() => {
    if (minMs <= 0) {
      setBooting(false);
      return;
    }
    setBooting(true); // re-show the skeleton when the view (or its sub-tab) changes
    const t = setTimeout(() => setBooting(false), minMs);
    return () => clearTimeout(t);
  }, [view, sub, minMs]);

  return booting ? <>{viewSkeletonFor(view, sub)}</> : <>{children}</>;
}
