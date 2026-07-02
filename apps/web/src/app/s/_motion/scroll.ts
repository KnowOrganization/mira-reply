// Shared scroll plumbing for the storefront (/s/*).
//
// The root layout locks <body> to h-screen/overflow-hidden, so storefronts
// scroll inside their own container (rendered by SmoothScroll in s/layout).
// Every ScrollTrigger in the storefront MUST point at it via
// `scroller: SF_SCROLLER` — window-based triggers never fire here.
export const SF_SCROLLER_ID = "sf-scroll";
export const SF_SCROLLER = `#${SF_SCROLLER_ID}`;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Lenis smooth scroll only where it helps: fine pointers on large screens. */
export function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: fine)").matches && window.innerWidth >= 1024;
}

/**
 * Capability gate for WebGL hero scenes. Storefronts open inside Instagram
 * in-app browsers on mid-tier phones — 3D is an upgrade, never a requirement.
 */
export function canRun3D(): boolean {
  if (typeof window === "undefined") return false;
  if (prefersReducedMotion()) return false;
  if (window.innerWidth < 768) return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return false;
  if (nav.connection?.saveData === true) return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return false;
  } catch {
    return false;
  }
  return true;
}
