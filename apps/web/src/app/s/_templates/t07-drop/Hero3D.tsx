"use client";
// t07-drop — wires the distortion-plane scene over the RSC poster via
// Hero3DGate. The poster (flickering full-bleed StoreImage) is built in the
// RSC and passed through as a slot, so it stays the SSR/LCP layer; the scene
// only mounts on qualifying devices near the viewport.
import type { ReactNode } from "react";
import Hero3DGate from "../../_motion/Hero3DGate";

const load = () => import("./Ripple3D");

export default function Hero3D({
  poster,
  imageUrl,
  accent,
}: {
  poster: ReactNode;
  imageUrl: string;
  accent: string;
}) {
  return (
    <Hero3DGate
      poster={poster}
      load={load}
      sceneProps={{ imageUrl, accent }}
      style={{ position: "absolute", inset: 0 }}
    />
  );
}
