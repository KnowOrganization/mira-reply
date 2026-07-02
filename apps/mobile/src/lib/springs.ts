// Canonical spring configs — one voice for all motion. `snappy` matches the
// values SwipeableDraftCard shipped with; use it unless a surface earns its own.
export const springs = {
  snappy: { damping: 18, stiffness: 220 },
  thumb: { damping: 20, stiffness: 250 }, // segmented-control thumb
} as const;
