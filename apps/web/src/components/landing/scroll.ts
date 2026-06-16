// Shared scroll plumbing for the landing page.
//
// The root layout locks <body> to h-screen/overflow-hidden, so the landing
// page scrolls inside its own fixed wrapper. Every ScrollTrigger must point
// at that wrapper via `scroller: SCROLLER`.
export const SCROLLER_ID = "mira-scroll";
export const SCROLLER = `#${SCROLLER_ID}`;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
